"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  Monitor,
  Laptop,
  Cpu,
  Clock,
  MapPin,
  Coffee,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  ANDARES,
  catalogo,
  diaHoje,
  horarioDoTurno,
  isAndarValido,
  matchAndar,
  normalizarDiasAula,
  normalizarTurma,
  ocorreHoje,
  type AmbienteBase,
  type AndarLabel,
  type TurmaMapa,
} from "@/lib/mapa-catalogo";

export type MapaRole = "aluno" | "professor" | "adm";

export type MapaUsuarioLogado = {
  nome?: string;
  ra?: string;
  id?: string;
  curso?: string;
  [key: string]: unknown;
};

type ItinerarioItem = {
  hora: string;
  label: string;
  local: string;
  tipo: "aula" | "intervalo";
};

type Props = {
  usuarioLogado: MapaUsuarioLogado | null;
  role: MapaRole;
};

/** Remove acentos, padroniza caixa e espaços para comparação. */
const normalizar = (str?: string | null) =>
  String(str ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

function iconForAmbiente(ambiente: AmbienteBase) {
  if (ambiente.tipo === "lab") {
    if (
      normalizar(ambiente.nome).includes("ia") ||
      normalizar(ambiente.nome).includes("inteligencia")
    ) {
      return Cpu;
    }
    return Laptop;
  }
  return Monitor;
}

function nomesIguais(a?: string | null, b?: string | null) {
  if (!a || !b) return false;
  return normalizar(a) === normalizar(b);
}

function cursoRelacionado(disciplina?: string | null, cursoAluno?: string | null) {
  if (!disciplina || !cursoAluno) return false;
  const a = normalizar(disciplina);
  const b = normalizar(cursoAluno);
  return a === b || a.includes(b) || b.includes(a);
}

function abreviarDias(diasRaw: string[] | string | null | undefined): string {
  const dias = normalizarDiasAula(diasRaw);
  if (dias.length === 0) return "";
  return dias
    .map((dia) => {
      const limpo = dia.trim();
      if (limpo.length <= 3) return limpo;
      return limpo.slice(0, 3);
    })
    .join(", ");
}

/** Ocupação normalizada para cruzar Andar + Sala no mapa. */
type OcupacaoMapa = {
  andar: string;
  sala_nome: string;
  nome: string;
  disciplina: string;
  turno?: string | null;
  dias_aula?: string[] | string | null;
  id?: string | null;
};

function turmaParaOcupacao(t: TurmaMapa): OcupacaoMapa | null {
  const andar = t.andar?.trim() ?? "";
  const sala_nome = t.sala?.trim() ?? "";
  const nome = t.professor?.trim() ?? "";
  if (!andar || !sala_nome || !nome) return null;
  return {
    id: t.id,
    andar,
    sala_nome,
    nome,
    disciplina: t.curso?.trim() || "Disciplina",
    turno: t.turno,
    dias_aula: t.dias_aula,
  };
}

const COLUNAS_TURMA_MAPA =
  "id, curso, professor, sala, andar, dias_aula, turno";

export function MapaSalas({ usuarioLogado, role }: Props) {
  const [andarSelecionado, setAndarSelecionado] =
    useState<AndarLabel>("Térreo");
  const [ambienteSelecionadoId, setAmbienteSelecionadoId] = useState("");
  const [dadosSupabase, setDadosSupabase] = useState<OcupacaoMapa[]>([]);
  const [alocacoes, setAlocacoes] = useState<TurmaMapa[]>([]);
  const [minhasAulasHoje, setMinhasAulasHoje] = useState<TurmaMapa[]>([]);
  const [destaque, setDestaque] = useState<TurmaMapa | null>(null);
  const [aiInsight, setAiInsight] = useState("");
  const [isLoadingAi, setIsLoadingAi] = useState(true);
  const [carregando, setCarregando] = useState(true);

  const salaDestaque = destaque?.sala ?? null;
  const andarDestaque = destaque?.andar ?? null;

  const ambientesDoAndar = useMemo(() => {
    const nomeDoAndarAtual = andarSelecionado;

    return catalogo[andarSelecionado].map((salaRenderizada) => {
      const ocupacao = dadosSupabase.find(
        (d) =>
          normalizar(d.andar) === normalizar(nomeDoAndarAtual) &&
          (normalizar(d.sala_nome) === normalizar(salaRenderizada.nome) ||
            normalizar(d.sala_nome) === normalizar(salaRenderizada.codigo))
      );

      const professor = ocupacao?.nome || undefined;
      const disciplina = ocupacao?.disciplina || undefined;
      const isOcupada = !!ocupacao;
      const diasAbrev = abreviarDias(ocupacao?.dias_aula);
      const diasLabel = diasAbrev || undefined;

      let isProximaAula = false;
      if (role === "aluno") {
        isProximaAula =
          !!destaque &&
          normalizar(destaque.andar) === normalizar(nomeDoAndarAtual) &&
          (normalizar(destaque.sala) === normalizar(salaRenderizada.codigo) ||
            normalizar(destaque.sala) === normalizar(salaRenderizada.nome));
      } else if (role === "professor") {
        isProximaAula =
          isOcupada &&
          nomesIguais(professor, String(usuarioLogado?.nome ?? ""));
      }

      return {
        ...salaRenderizada,
        professor,
        disciplina,
        isOcupada,
        diasLabel,
        isProximaAula: role === "adm" ? false : isProximaAula,
      };
    });
  }, [
    andarSelecionado,
    dadosSupabase,
    destaque,
    role,
    usuarioLogado?.nome,
  ]);

  const ambienteAtivo = useMemo(() => {
    const noAndar = ambientesDoAndar.find(
      (a) => a.id === ambienteSelecionadoId
    );
    if (noAndar) return noAndar;
    return ambientesDoAndar[0] ?? null;
  }, [ambientesDoAndar, ambienteSelecionadoId]);

  const alaNorte = ambientesDoAndar.filter((a) => a.posicao === "norte");
  const alaSul = ambientesDoAndar.filter((a) => a.posicao === "sul");

  const itinerario = useMemo((): ItinerarioItem[] => {
    const fonte =
      role === "adm"
        ? alocacoes
        : role === "professor"
          ? alocacoes.filter((t) =>
              nomesIguais(t.professor, String(usuarioLogado?.nome ?? ""))
            )
          : minhasAulasHoje;

    if (fonte.length === 0) return [];

    const itens: ItinerarioItem[] = fonte.map((t) => {
      const sala = t.sala || "Sala a definir";
      const andar = t.andar || "Andar a definir";
      return {
        hora: horarioDoTurno(t.turno),
        label: t.curso || "Disciplina",
        local: `${sala} – ${andar}`,
        tipo: "aula" as const,
      };
    });

    itens.sort((a, b) => a.hora.localeCompare(b.hora));
    if (itens.length >= 2) {
      const comIntervalo: ItinerarioItem[] = [];
      itens.forEach((item, idx) => {
        comIntervalo.push(item);
        if (idx === 0) {
          comIntervalo.push({
            hora: "10:00",
            label: "Intervalo",
            local: "",
            tipo: "intervalo",
          });
        }
      });
      return comIntervalo;
    }
    return itens;
  }, [role, alocacoes, minhasAulasHoje, usuarioLogado?.nome]);

  async function fetchAiMapa(andar: string, sala: string) {
    setIsLoadingAi(true);
    try {
      const response = await fetch("/api/insights/mapa-salas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          andar,
          salaProxima: sala || "nenhuma definida",
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha na dica do mapa");
      const dica =
        (typeof data.dica === "string" && data.dica.trim()) ||
        (typeof data.insight === "string" && data.insight.trim()) ||
        "";
      setAiInsight(dica);
    } catch (err) {
      console.error("Erro ao gerar dica do mapa:", err);
      setAiInsight(
        role === "adm"
          ? "Monitore salas livres para realocar turmas e evitar conflitos de horário."
          : "Consulte os laboratórios com status Livre para estudo prático individual durante seus horários vagos."
      );
    } finally {
      setIsLoadingAi(false);
    }
  }

  useEffect(() => {
    async function carregarMapa() {
      setCarregando(true);
      const hoje = diaHoje();

      try {
        const { data: turmasData, error: turmasError } = await supabase
          .from("turmas")
          .select(COLUNAS_TURMA_MAPA);

        console.log("Dados do Supabase:", turmasData);

        if (turmasError) {
          console.error("Erro ao buscar turmas (mapa):", turmasError.message);
        }

        const todas = (turmasData ?? [])
          .map((t) => normalizarTurma(t))
          .filter((t): t is TurmaMapa => t !== null);

        // Alocações com professor + sala + andar (base para o mapa)
        const alocadas = todas.filter(
          (t) =>
            !!t.professor?.trim() && !!t.sala?.trim() && !!t.andar?.trim()
        );

        // ADM: visão gerencial (todos os dias). Aluno/professor: só o dia atual.
        const paraMapa =
          role === "adm"
            ? alocadas
            : alocadas.filter((t) => ocorreHoje(t, hoje));

        const ocupacoesMapa = paraMapa
          .map(turmaParaOcupacao)
          .filter((o): o is OcupacaoMapa => o !== null);

        console.log("Dados do Supabase:", ocupacoesMapa);

        setAlocacoes(paraMapa);
        setDadosSupabase(ocupacoesMapa);

        let destaqueLocal: TurmaMapa | null = null;
        let minhas: TurmaMapa[] = [];

        if (role === "aluno" && usuarioLogado?.ra) {
          const ra = String(usuarioLogado.ra);
          const cursoAluno = String(usuarioLogado.curso ?? "");

          let turmasAluno: TurmaMapa[] = [];
          const { data: notasJoin, error: joinError } = await supabase
            .from("notas")
            .select(`turmas(${COLUNAS_TURMA_MAPA})`)
            .eq("ra_aluno", ra);

          if (joinError) {
            const { data: notasSimples } = await supabase
              .from("notas")
              .select("turma")
              .eq("ra_aluno", ra);

            const ids = [
              ...new Set(
                (notasSimples ?? [])
                  .map((n) => String(n.turma ?? ""))
                  .filter(Boolean)
              ),
            ];

            if (ids.length > 0) {
              const { data: turmasPorId } = await supabase
                .from("turmas")
                .select(COLUNAS_TURMA_MAPA)
                .in("id", ids);

              turmasAluno = (turmasPorId ?? [])
                .map((t) => normalizarTurma(t))
                .filter((t): t is TurmaMapa => t !== null);
            }
          } else {
            turmasAluno = (notasJoin ?? [])
              .map((n) => normalizarTurma(n.turmas))
              .filter((t): t is TurmaMapa => t !== null);
          }

          minhas = turmasAluno.filter((t) => ocorreHoje(t, hoje));
          setMinhasAulasHoje(minhas);

          destaqueLocal =
            minhas.find(
              (t) =>
                !!t.sala &&
                (cursoRelacionado(t.curso, cursoAluno) || !!t.curso)
            ) ??
            minhas[0] ??
            null;
        } else if (role === "professor" && usuarioLogado?.nome) {
          const nomeProf = String(usuarioLogado.nome);
          minhas = paraMapa.filter((t) => nomesIguais(t.professor, nomeProf));
          setMinhasAulasHoje(minhas);
          destaqueLocal = minhas[0] ?? null;
        } else {
          setMinhasAulasHoje([]);
          destaqueLocal = null;
        }

        setDestaque(destaqueLocal);

        if (destaqueLocal?.andar && isAndarValido(destaqueLocal.andar)) {
          setAndarSelecionado(destaqueLocal.andar);
          const ambientes = catalogo[destaqueLocal.andar];
          const match = ambientes.find(
            (a) =>
              normalizar(a.codigo) === normalizar(destaqueLocal.sala) ||
              normalizar(a.nome) === normalizar(destaqueLocal.sala)
          );
          setAmbienteSelecionadoId(match?.id ?? ambientes[0]?.id ?? "");
        } else {
          setAndarSelecionado("Térreo");
          setAmbienteSelecionadoId(catalogo["Térreo"][0]?.id ?? "");
        }

        await fetchAiMapa(
          destaqueLocal?.andar || "Térreo",
          destaqueLocal?.sala || ""
        );
      } finally {
        setCarregando(false);
      }
    }

    void carregarMapa();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, usuarioLogado?.ra, usuarioLogado?.nome, usuarioLogado?.curso]);

  function handleTrocarAndar(andar: AndarLabel) {
    setAndarSelecionado(andar);
    const ambientes = catalogo[andar];
    const match = ambientes.find(
      (a) =>
        normalizar(a.codigo) === normalizar(salaDestaque) ||
        normalizar(a.nome) === normalizar(salaDestaque)
    );
    setAmbienteSelecionadoId(match?.id ?? ambientes[0]?.id ?? "");
    void fetchAiMapa(andar, salaDestaque || "");
  }

  function renderAmbienteCard(ambiente: AmbienteBase) {
    const isProxima = !!ambiente.isProximaAula;
    const isOcupada = !!ambiente.isOcupada || !!ambiente.professor;
    const professorTag =
      role === "adm" && ambiente.professor && ambiente.diasLabel
        ? `Prof. ${ambiente.professor} - ${ambiente.diasLabel}`
        : ambiente.professor
          ? `Prof. ${ambiente.professor}`
          : "";
    const statusText =
      role === "adm" && isOcupada && ambiente.diasLabel
        ? ambiente.diasLabel
        : isOcupada
          ? "Ocupada"
          : "Livre";
    const selecionado = ambiente.id === ambienteSelecionadoId;
    const Icon = iconForAmbiente(ambiente);

    return (
      <button
        key={ambiente.id}
        type="button"
        onClick={() => setAmbienteSelecionadoId(ambiente.id)}
        className={`relative text-left rounded-lg border p-4 flex flex-col gap-1.5 min-h-[110px] transition-all cursor-pointer overflow-hidden ${
          isProxima
            ? "bg-blue-950/30 border-blue-800 shadow-[0_0_24px_rgba(59,130,246,0.18)] hover:border-blue-700"
            : selecionado
              ? "border-zinc-600 bg-zinc-900"
              : isOcupada
                ? "border-zinc-700 bg-zinc-800/80 hover:border-zinc-600"
                : "border-emerald-500/40 bg-zinc-900 hover:border-emerald-400/70"
        }`}
      >
        {isProxima && (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-transparent pointer-events-none" />
        )}
        <div className="relative flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <p
                className={`text-xs font-semibold uppercase tracking-wider ${
                  isProxima
                    ? "text-blue-300"
                    : isOcupada
                      ? "text-zinc-400"
                      : "text-emerald-400"
                }`}
              >
                {ambiente.codigo}
              </p>
              {isProxima && (
                <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-900 text-blue-300 border border-blue-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse inline-block" />
                  {role === "professor" ? "Sua aula" : "Próxima aula"}
                </span>
              )}
            </div>
            <p
              className={`text-sm font-medium truncate ${
                isProxima ? "text-blue-50" : "text-white"
              }`}
            >
              {isOcupada
                ? ambiente.disciplina || ambiente.nome
                : ambiente.nome}
            </p>
            {isOcupada && professorTag ? (
              <p
                className={`text-xs mt-0.5 truncate ${
                  isProxima ? "text-blue-200" : "text-zinc-400"
                }`}
              >
                {professorTag}
              </p>
            ) : (
              !isProxima &&
              ambiente.tipo === "lab" && (
                <p className="text-xs text-zinc-500 mt-0.5">
                  {ambiente.estacoes} máquinas
                </p>
              )
            )}
          </div>
          <Icon
            className={`w-4 h-4 shrink-0 mt-0.5 ${
              isProxima ? "text-blue-400" : "text-zinc-600"
            }`}
          />
        </div>
        {!isProxima && (
          <span
            className={`relative self-start mt-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
              isOcupada
                ? "bg-transparent text-zinc-400 border border-zinc-700"
                : "bg-emerald-950 text-emerald-400 border border-emerald-900"
            }`}
          >
            {statusText}
          </span>
        )}
      </button>
    );
  }

  const IconAtivo = ambienteAtivo ? iconForAmbiente(ambienteAtivo) : Monitor;
  const ambienteAtivoOcupado =
    !!ambienteAtivo?.isOcupada || !!ambienteAtivo?.professor;
  const ambienteAtivoEhProxima = !!ambienteAtivo?.isProximaAula;

  const subtitulo =
    role === "adm"
      ? "Visão gerencial da ocupação de salas e laboratórios."
      : role === "professor"
        ? "Localize suas aulas e salas disponíveis no campus."
        : "Localize suas aulas e laboratórios disponíveis para estudo.";

  return (
    <div className="max-w-7xl mx-auto px-6 sm:px-10 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Mapa de Salas e Laboratórios
        </h1>
        <p className="text-sm text-zinc-400 mt-1">{subtitulo}</p>
        <div className="flex items-center gap-1 mt-4 p-1 bg-zinc-950 border border-zinc-800 rounded-lg w-fit flex-wrap">
          {ANDARES.map((andar) => {
            const ehAndarAula =
              role !== "adm" && matchAndar(andar, andarDestaque);
            const selecionado = andarSelecionado === andar;
            return (
              <button
                key={andar}
                type="button"
                onClick={() => handleTrocarAndar(andar)}
                className={`px-4 py-1.5 rounded-md text-sm transition-colors ${
                  ehAndarAula
                    ? "text-emerald-400 border-b-2 border-emerald-500 font-bold"
                    : selecionado
                      ? "bg-zinc-800 text-white font-medium"
                      : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {andar}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-start gap-4 p-5 rounded-xl bg-zinc-900/50 border border-zinc-800 mb-6">
        <div className="shrink-0 mt-0.5 w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/50 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-zinc-300" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">
            Dica da IA
          </p>
          <p
            className={`text-sm text-zinc-300 leading-relaxed break-words whitespace-normal ${
              isLoadingAi ? "animate-pulse" : ""
            }`}
          >
            {isLoadingAi
              ? "Consultando disponibilidade de salas com IA..."
              : aiInsight ||
                "Consulte os laboratórios com status Livre para estudar nos horários vagos."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 rounded-2xl bg-[#0c0e14] border border-gray-800/80 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              Planta Baixa — {andarSelecionado}
            </h2>
            <span className="text-xs text-zinc-600">
              {carregando ? "…" : `${ambientesDoAndar.length} ambientes`}
            </span>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-2 gap-3">
              {alaNorte.map(renderAmbienteCard)}
            </div>

            <div className="border-t border-b border-gray-800 bg-[#12151f]/60 text-[11px] text-gray-500 uppercase tracking-widest py-1 px-4 text-center rounded-md my-4">
              Corredor Principal
            </div>

            <div className="grid grid-cols-2 gap-3">
              {alaSul.map(renderAmbienteCard)}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800">
              <h2 className="text-sm font-semibold">Local Selecionado</h2>
            </div>
            {ambienteAtivo && (
              <div className="px-5 py-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-2xl font-semibold tracking-tight">
                      {ambienteAtivo.codigo}
                    </p>
                    {ambienteAtivoOcupado ? (
                      <>
                        <p className="text-sm text-zinc-300 mt-0.5">
                          {ambienteAtivo.disciplina || ambienteAtivo.nome}
                        </p>
                        {ambienteAtivo.professor && (
                          <p
                            className={`text-xs mt-1 ${
                              ambienteAtivoEhProxima
                                ? "text-blue-300"
                                : "text-zinc-400"
                            }`}
                          >
                            {role === "adm" && ambienteAtivo.diasLabel
                              ? `Prof. ${ambienteAtivo.professor} - ${ambienteAtivo.diasLabel}`
                              : `Prof. ${ambienteAtivo.professor}`}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-zinc-400 mt-0.5">
                        {ambienteAtivo.nome}
                      </p>
                    )}
                  </div>
                  <MapPin className="w-5 h-5 text-zinc-600 shrink-0 mt-1" />
                </div>
                <span
                  className={`inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    ambienteAtivoEhProxima
                      ? "bg-blue-950 text-blue-400 border border-blue-900"
                      : ambienteAtivoOcupado
                        ? "bg-transparent text-zinc-400 border border-zinc-700"
                        : "bg-emerald-950 text-emerald-400 border border-emerald-900"
                  }`}
                >
                  {ambienteAtivoEhProxima
                    ? role === "professor"
                      ? "Sua aula"
                      : "Próxima aula"
                    : ambienteAtivoOcupado
                      ? role === "adm" && ambienteAtivo.diasLabel
                        ? ambienteAtivo.diasLabel
                        : "Ocupada"
                      : "Livre"}
                </span>

                <div className="mt-5 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                      <IconAtivo className="w-3.5 h-3.5 text-zinc-400" />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Estações</p>
                      <p className="text-sm font-medium text-white">
                        {ambienteAtivo.estacoes > 0
                          ? `${ambienteAtivo.estacoes} Máquinas`
                          : "Não aplicável"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                      <Cpu className="w-3.5 h-3.5 text-zinc-400" />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Sistema</p>
                      <p className="text-sm font-medium text-white">
                        {ambienteAtivo.sistema || "Não aplicável"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                      <Laptop className="w-3.5 h-3.5 text-zinc-400" />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Software</p>
                      <p className="text-sm font-medium text-white">
                        {ambienteAtivo.softwares.length > 0
                          ? ambienteAtivo.softwares.join(", ")
                          : "Não aplicável"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800">
              <h2 className="text-sm font-semibold">
                {role === "adm" ? "Ocupação de Hoje" : "Itinerário de Hoje"}
              </h2>
              <p className="text-[11px] text-zinc-600 mt-0.5">{diaHoje()}</p>
            </div>
            <div className="px-5 py-4 flex flex-col gap-0">
              {carregando ? (
                <p className="text-sm text-zinc-500 animate-pulse">
                  Carregando itinerário...
                </p>
              ) : itinerario.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  {role === "adm"
                    ? "Nenhuma sala ocupada com professor alocado para hoje."
                    : "Nenhuma aula com sala alocada para hoje."}
                </p>
              ) : (
                itinerario.map((item, i) => (
                  <div key={`${item.label}-${i}`} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${
                          item.tipo === "intervalo"
                            ? "bg-zinc-900 border-zinc-700"
                            : "bg-zinc-800 border-zinc-600"
                        }`}
                      >
                        {item.tipo === "intervalo" ? (
                          <Coffee className="w-3 h-3 text-zinc-500" />
                        ) : (
                          <Clock className="w-3 h-3 text-zinc-400" />
                        )}
                      </div>
                      {i < itinerario.length - 1 && (
                        <div className="w-px flex-1 bg-zinc-800 my-1" />
                      )}
                    </div>

                    <div className="pb-4 min-w-0">
                      <p className="text-xs text-zinc-500 mb-0.5">{item.hora}</p>
                      <p
                        className={`text-sm font-medium ${
                          item.tipo === "intervalo"
                            ? "text-zinc-500"
                            : "text-white"
                        }`}
                      >
                        {item.label}
                      </p>
                      {item.local && (
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {item.local}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
