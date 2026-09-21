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
import { SELECT_TURMA_MAPA_COM_PROFESSOR, SELECT_TURMA_MAPA_JOIN_SIMPLES } from "@/lib/professor-relacao";

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
  const temProfessor =
    Boolean(t.professor_id?.trim()) || Boolean(t.professor?.trim());
  if (!andar || !sala_nome || !temProfessor) return null;
  return {
    id: t.id,
    andar,
    sala_nome,
    // Nome vem do join `professores.nome` (já achatado em normalizarTurma)
    nome: t.professor?.trim() || "Docente",
    disciplina: t.curso?.trim() || "Disciplina",
    turno: t.turno,
    dias_aula: t.dias_aula,
  };
}

const SELECT_MAPA_PRIMARY = SELECT_TURMA_MAPA_COM_PROFESSOR;
const SELECT_MAPA_FALLBACK = SELECT_TURMA_MAPA_JOIN_SIMPLES;

async function buscarTurmasComProfessor() {
  const tentativaHint = await supabase
    .from("turmas")
    .select(SELECT_MAPA_PRIMARY);

  if (!tentativaHint.error) {
    return { data: tentativaHint.data, error: null as string | null };
  }

  console.warn(
    "Mapa: join com hint falhou, tentando professores(id, nome, titulacao):",
    tentativaHint.error.message
  );

  const tentativaSimples = await supabase
    .from("turmas")
    .select(SELECT_MAPA_FALLBACK);

  if (!tentativaSimples.error) {
    return { data: tentativaSimples.data, error: null as string | null };
  }

  console.warn(
    "Mapa: join simples falhou, buscando turmas sem embed:",
    tentativaSimples.error.message
  );

  const semJoin = await supabase.from("turmas").select("*");
  return {
    data: semJoin.data,
    error: semJoin.error ? semJoin.error.message : null,
  };
}

function ehTurmaDoProfessor(
  t: TurmaMapa,
  professorId?: string | null,
  nomeFallback?: string | null
): boolean {
  if (professorId && t.professor_id) {
    return String(t.professor_id) === String(professorId);
  }
  // Fallback legado apenas se a turma ainda não tiver FK
  if (!t.professor_id && nomeFallback) {
    return nomesIguais(t.professor, nomeFallback);
  }
  return false;
}

function turmaCasaComCodigo(t: TurmaMapa, codigo: string): boolean {
  const alvo = normalizar(codigo);
  if (!alvo) return false;
  return (
    normalizar(t.codigo) === alvo ||
    normalizar(t.id) === alvo ||
    normalizar(t.curso) === alvo
  );
}

/** Resolve turmas do aluno: tabela `notas` → fallback `alunos.turma`. */
async function buscarTurmasMatriculadasDoAluno(
  ra: string,
  todasTurmas: TurmaMapa[]
): Promise<TurmaMapa[]> {
  let turmasAluno: TurmaMapa[] = [];

  const { data: notasJoin, error: joinError } = await supabase
    .from("notas")
    .select(`turmas(${SELECT_MAPA_FALLBACK})`)
    .eq("ra_aluno", ra);

  if (joinError) {
    console.warn(
      "Mapa aluno: embed turmas falhou, tentando fallback:",
      joinError.message
    );
    const { data: notasSimples, error: notasSimplesError } = await supabase
      .from("notas")
      .select("turma")
      .eq("ra_aluno", ra);

    if (notasSimplesError) {
      console.warn(
        "Mapa aluno: select notas simples falhou:",
        notasSimplesError.message
      );
    } else {
      const ids = [
        ...new Set(
          (notasSimples ?? [])
            .map((n) => String(n.turma ?? "").trim())
            .filter(Boolean)
        ),
      ];
      if (ids.length > 0) {
        turmasAluno = todasTurmas.filter((t) =>
          ids.some((id) => turmaCasaComCodigo(t, id))
        );
      }
    }
  } else {
    turmasAluno = (notasJoin ?? [])
      .map((n) => normalizarTurma((n as { turmas?: unknown }).turmas))
      .filter((t): t is TurmaMapa => t !== null);
  }

  // Fallback real do sistema: matrícula em `alunos.turma` (código da turma)
  if (turmasAluno.length === 0) {
    const { data: fichas, error: fichaError } = await supabase
      .from("alunos")
      .select("turma, curso")
      .eq("ra", ra);

    if (fichaError) {
      console.error(
        "Mapa aluno: fallback alunos.turma falhou:",
        fichaError.message
      );
      return [];
    }

    const codigos = [
      ...new Set(
        (fichas ?? [])
          .map((f) => String(f.turma ?? "").trim())
          .filter(Boolean)
      ),
    ];

    if (codigos.length === 0) return [];

    turmasAluno = todasTurmas.filter((t) =>
      codigos.some((c) => turmaCasaComCodigo(t, c))
    );

    // Se ainda não achou no cache, busca direto por codigo
    if (turmasAluno.length === 0) {
      let { data: porCodigo, error: codigoError } = await supabase
        .from("turmas")
        .select(SELECT_MAPA_FALLBACK)
        .in("codigo", codigos);

      if (codigoError) {
        const retry = await supabase
          .from("turmas")
          .select(SELECT_MAPA_PRIMARY)
          .in("codigo", codigos);
        porCodigo = retry.data;
        codigoError = retry.error;
      }

      if (codigoError) {
        console.error(
          "Mapa aluno: busca turmas por codigo falhou:",
          codigoError.message
        );
      } else {
        turmasAluno = (porCodigo ?? [])
          .map((t) => normalizarTurma(t))
          .filter((t): t is TurmaMapa => t !== null);
      }
    }
  }

  // Dedup por id/codigo
  const mapa = new Map<string, TurmaMapa>();
  for (const t of turmasAluno) {
    const chave = String(t.id || t.codigo || t.curso || Math.random());
    if (!mapa.has(chave)) mapa.set(chave, t);
  }
  return Array.from(mapa.values());
}

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

      let isProximaAula = false;
      let aulaDoAluno: TurmaMapa | undefined;
      if (role === "aluno") {
        aulaDoAluno = minhasAulasHoje.find((t) => {
          const salaOk =
            normalizar(t.sala) === normalizar(salaRenderizada.codigo) ||
            normalizar(t.sala) === normalizar(salaRenderizada.nome);
          if (!salaOk || !t.sala?.trim()) return false;
          if (!t.andar?.trim()) return true;
          return normalizar(t.andar) === normalizar(nomeDoAndarAtual);
        });
        isProximaAula = !!aulaDoAluno;
      } else if (role === "professor") {
        const ocupacaoTurma = alocacoes.find(
          (t) =>
            normalizar(t.andar) === normalizar(nomeDoAndarAtual) &&
            (normalizar(t.sala) === normalizar(salaRenderizada.codigo) ||
              normalizar(t.sala) === normalizar(salaRenderizada.nome)) &&
            ehTurmaDoProfessor(
              t,
              usuarioLogado?.id != null ? String(usuarioLogado.id) : null,
              usuarioLogado?.nome != null ? String(usuarioLogado.nome) : null
            )
        );
        isProximaAula = !!ocupacao && !!ocupacaoTurma;
      }

      const professor =
        ocupacao?.nome ||
        aulaDoAluno?.professor?.trim() ||
        undefined;
      const disciplina =
        ocupacao?.disciplina ||
        aulaDoAluno?.curso?.trim() ||
        undefined;
      const isOcupada = !!ocupacao || isProximaAula;
      const diasAbrev = abreviarDias(
        ocupacao?.dias_aula ?? aulaDoAluno?.dias_aula
      );
      const diasLabel = diasAbrev || undefined;

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
    alocacoes,
    minhasAulasHoje,
    destaque,
    role,
    usuarioLogado?.id,
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
    const professorId =
      usuarioLogado?.id != null ? String(usuarioLogado.id) : null;
    const nomeFallback =
      usuarioLogado?.nome != null ? String(usuarioLogado.nome) : null;
    const hoje = diaHoje();

    const fonteBruta =
      role === "adm"
        ? alocacoes.filter((t) => ocorreHoje(t, hoje))
        : role === "professor"
          ? alocacoes.filter((t) =>
              ehTurmaDoProfessor(t, professorId, nomeFallback)
            )
          : minhasAulasHoje;

    // Aluno: aceita turma com sala (andar pode ser inferido depois)
    const fonte = fonteBruta.filter((t) => {
      if (role === "aluno") return !!t.sala?.trim();
      return !!t.sala?.trim() && !!t.andar?.trim();
    });

    if (fonte.length === 0) return [];

    const itens: ItinerarioItem[] = fonte.map((t) => {
      const sala = t.sala || "Sala a definir";
      const andar = t.andar?.trim() || "Andar a definir";
      const disciplina = t.curso?.trim() || "Disciplina";
      const docente = t.professor?.trim();
      return {
        hora: horarioDoTurno(t.turno),
        label:
          role === "adm" && docente
            ? `${disciplina} · Prof. ${docente}`
            : disciplina,
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
  }, [role, alocacoes, minhasAulasHoje, usuarioLogado?.id, usuarioLogado?.nome]);

  async function fetchAiMapa(andar: string, sala: string) {
    setIsLoadingAi(true);
    try {
      const proxima = itinerario.find((i) => i.tipo === "aula");
      const response = await fetch("/api/insights/mapa-salas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          andar,
          salaProxima: sala || "nenhuma definida",
          nomeUsuario: usuarioLogado?.nome,
          role,
          curso: usuarioLogado?.curso,
          disciplina: proxima?.label,
          turno:
            role === "professor"
              ? String(usuarioLogado?.turno_aula ?? "")
              : undefined,
          professorNome:
            role === "professor" ? usuarioLogado?.nome : undefined,
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
    let cancelado = false;

    async function carregarMapa() {
      setCarregando(true);
      const hoje = diaHoje();

      try {
        const { data: turmasData, error: turmasError } =
          await buscarTurmasComProfessor();

        if (turmasError) {
          console.error("Erro ao buscar turmas (mapa):", turmasError);
        }

        const todas = (turmasData ?? [])
          .map((t) => normalizarTurma(t))
          .filter((t): t is TurmaMapa => t !== null);

        // Alocações com professor (FK ou nome do join) + sala + andar
        const alocadas = todas.filter(
          (t) =>
            (Boolean(t.professor_id?.trim()) || Boolean(t.professor?.trim())) &&
            !!t.sala?.trim() &&
            !!t.andar?.trim()
        );

        // ADM: visão gerencial (todos os dias). Aluno/professor: só o dia atual.
        const paraMapa =
          role === "adm"
            ? alocadas
            : alocadas.filter((t) => ocorreHoje(t, hoje));

        const ocupacoesMapa = paraMapa
          .map(turmaParaOcupacao)
          .filter((o): o is OcupacaoMapa => o !== null);

        if (cancelado) return;

        setAlocacoes(paraMapa);
        setDadosSupabase(ocupacoesMapa);

        let destaqueLocal: TurmaMapa | null = null;
        let minhas: TurmaMapa[] = [];

        if (role === "aluno" && usuarioLogado?.ra) {
          const ra = String(usuarioLogado.ra);
          const cursoAluno = String(usuarioLogado.curso ?? "");

          const turmasAluno = await buscarTurmasMatriculadasDoAluno(ra, todas);

          minhas = turmasAluno.filter((t) => ocorreHoje(t, hoje));
          if (!cancelado) setMinhasAulasHoje(minhas);

          // Preferência: turma de hoje com sala alocada e relacionada ao curso
          destaqueLocal =
            minhas.find(
              (t) =>
                !!t.sala?.trim() &&
                (cursoRelacionado(t.curso, cursoAluno) || !!t.curso)
            ) ??
            minhas.find((t) => !!t.sala?.trim()) ??
            minhas[0] ??
            null;
        } else if (role === "professor" && usuarioLogado?.id) {
          const professorId = String(usuarioLogado.id);
          const nomeFallback =
            usuarioLogado?.nome != null ? String(usuarioLogado.nome) : null;
          minhas = paraMapa.filter((t) =>
            ehTurmaDoProfessor(t, professorId, nomeFallback)
          );
          if (!cancelado) setMinhasAulasHoje(minhas);
          destaqueLocal = minhas[0] ?? null;
        } else {
          if (!cancelado) setMinhasAulasHoje([]);
          destaqueLocal = null;
        }

        if (cancelado) return;

        setDestaque(destaqueLocal);

        // Resolve andar: valor da turma ou busca no catálogo pela sala
        let andarInicial: AndarLabel | null =
          destaqueLocal?.andar && isAndarValido(destaqueLocal.andar)
            ? destaqueLocal.andar
            : null;

        if (!andarInicial && destaqueLocal?.sala?.trim()) {
          for (const andar of ANDARES) {
            const match = catalogo[andar].find(
              (a) =>
                normalizar(a.codigo) === normalizar(destaqueLocal.sala) ||
                normalizar(a.nome) === normalizar(destaqueLocal.sala)
            );
            if (match) {
              andarInicial = andar;
              break;
            }
          }
        }

        if (andarInicial) {
          setAndarSelecionado(andarInicial);
          const ambientes = catalogo[andarInicial];
          const match = ambientes.find(
            (a) =>
              normalizar(a.codigo) === normalizar(destaqueLocal?.sala) ||
              normalizar(a.nome) === normalizar(destaqueLocal?.sala)
          );
          setAmbienteSelecionadoId(match?.id ?? ambientes[0]?.id ?? "");
        } else {
          setAndarSelecionado("Térreo");
          setAmbienteSelecionadoId(catalogo["Térreo"][0]?.id ?? "");
        }

        // Libera itinerário/mapa ANTES da IA — Gemini não pode travar a UI
        setCarregando(false);

        void fetchAiMapa(
          destaqueLocal?.andar || "Térreo",
          destaqueLocal?.sala || ""
        );
      } catch (err) {
        console.error("Erro ao carregar mapa de salas:", err);
        if (!cancelado) {
          setAlocacoes([]);
          setDadosSupabase([]);
          setMinhasAulasHoje([]);
          setDestaque(null);
        }
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }

    void carregarMapa();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    role,
    usuarioLogado?.ra,
    usuarioLogado?.id,
    usuarioLogado?.nome,
    usuarioLogado?.curso,
  ]);

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
    const labelSuaAula = role === "aluno" ? "Sua Aula" : "Sua aula";
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
            ? "bg-blue-500/10 border-blue-500 shadow-[0_0_24px_rgba(59,130,246,0.22)] hover:border-blue-400"
            : selecionado
              ? "border-zinc-600 bg-zinc-900"
              : isOcupada
                ? "border-red-500/50 bg-red-500/10 hover:border-red-400/70"
                : "border-emerald-500/40 bg-emerald-500/10 hover:border-emerald-400/70"
        }`}
      >
        {isProxima && (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/15 to-transparent pointer-events-none" />
        )}
        <div className="relative flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <p
                className={`text-xs font-semibold uppercase tracking-wider ${
                  isProxima
                    ? "text-blue-400"
                    : isOcupada
                      ? "text-red-400"
                      : "text-emerald-400"
                }`}
              >
                {ambiente.codigo}
              </p>
              {isProxima && (
                <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-500 text-white">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/90 animate-pulse inline-block" />
                  {labelSuaAula}
                </span>
              )}
            </div>
            <p
              className={`text-sm font-medium truncate ${
                isProxima
                  ? "text-blue-100"
                  : isOcupada
                    ? "text-red-50"
                    : "text-white"
              }`}
            >
              {isOcupada || isProxima
                ? ambiente.disciplina || ambiente.nome
                : ambiente.nome}
            </p>
            {(isOcupada || isProxima) && professorTag ? (
              <p
                className={`text-xs mt-0.5 truncate ${
                  isProxima
                    ? "text-blue-300"
                    : isOcupada
                      ? "text-red-300/80"
                      : "text-zinc-400"
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
              isProxima
                ? "text-blue-400"
                : isOcupada
                  ? "text-red-400/70"
                  : "text-emerald-500/70"
            }`}
          />
        </div>
        {!isProxima && (
          <span
            className={`relative self-start mt-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
              isOcupada
                ? "bg-red-500 text-white"
                : "bg-emerald-500 text-white"
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-10">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {alaNorte.map(renderAmbienteCard)}
            </div>

            <div className="border-t border-b border-gray-800 bg-[#12151f]/60 text-[11px] text-gray-500 uppercase tracking-widest py-1 px-4 text-center rounded-md my-4">
              Corredor Principal
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      ? "bg-blue-500 text-white"
                      : ambienteAtivoOcupado
                        ? "bg-red-500 text-white"
                        : "bg-emerald-500 text-white"
                  }`}
                >
                  {ambienteAtivoEhProxima
                    ? role === "aluno"
                      ? "Sua Aula"
                      : "Sua aula"
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
                itinerario.map((item, i) => {
                  const ehSuaAula = role === "aluno" && item.tipo === "aula";
                  return (
                  <div key={`${item.label}-${i}`} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${
                          item.tipo === "intervalo"
                            ? "bg-zinc-900 border-zinc-700"
                            : ehSuaAula
                              ? "bg-blue-500/20 border-blue-500"
                              : "bg-zinc-800 border-zinc-600"
                        }`}
                      >
                        {item.tipo === "intervalo" ? (
                          <Coffee className="w-3 h-3 text-zinc-500" />
                        ) : (
                          <Clock
                            className={`w-3 h-3 ${
                              ehSuaAula ? "text-blue-400" : "text-zinc-400"
                            }`}
                          />
                        )}
                      </div>
                      {i < itinerario.length - 1 && (
                        <div className="w-px flex-1 bg-zinc-800 my-1" />
                      )}
                    </div>

                    <div className="pb-4 min-w-0">
                      <p
                        className={`text-xs mb-0.5 ${
                          ehSuaAula ? "text-blue-400" : "text-zinc-500"
                        }`}
                      >
                        {item.hora}
                        {ehSuaAula && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            Sua Aula
                          </span>
                        )}
                      </p>
                      <p
                        className={`text-sm font-medium ${
                          item.tipo === "intervalo"
                            ? "text-zinc-500"
                            : ehSuaAula
                              ? "text-blue-100"
                              : "text-white"
                        }`}
                      >
                        {item.label}
                      </p>
                      {item.local && (
                        <p
                          className={`text-xs mt-0.5 ${
                            ehSuaAula ? "text-blue-300" : "text-zinc-500"
                          }`}
                        >
                          {item.local}
                        </p>
                      )}
                    </div>
                  </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
