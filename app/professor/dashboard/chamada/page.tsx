"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  BookOpen,
  UserCheck,
  Sparkles,
  MessageSquare,
  LogOut,
  GraduationCap,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Check,
  X,
  Search,
  Calendar,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ProfessorSettingsControl } from "@/components/professor/config-modal";
import { ModalFeedback } from "@/components/ModalFeedback";
import { PaginationFooter } from "@/components/ui/pagination-footer";
import {
  iniciaisDoProfessor,
  limparSessaoProfessor,
  useProfessorSession,
} from "@/lib/professor-session";

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral",    href: "/professor/dashboard",          active: false },
  { icon: BookOpen,        label: "Turmas e Notas", href: "/professor/dashboard/notas",    active: false },
  { icon: UserCheck,       label: "Chamada Rápida", href: "/professor/dashboard/chamada",  active: true  },
  { icon: Sparkles,        label: "Insights IA",    href: "/professor/dashboard/insights",  active: false },
  { icon: MessageSquare,   label: "Mensagens",      href: "/professor/dashboard/mensagens", active: false },
];

type TurmaOption = {
  id: string;
  codigo: string;
  curso: string;
  turno?: string;
};

type AlunoChamada = {
  id: string;
  nome: string;
  ra: string;
  porcentagemFaltas: number;
};

type StatusChamada = "presente" | "falta";

type AiInsightChamada = {
  tipoAlerta: string;
  mensagem: string;
};

function hojeISO() {
  return new Date().toISOString().split("T")[0];
}

function formatarDataBR(iso: string) {
  const [yyyy, mm, dd] = iso.split("-");
  if (!yyyy || !mm || !dd) return iso;
  return `${dd}/${mm}/${yyyy}`;
}

function paraISOLocal(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const DIAS_SEMANA_LABEL = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"] as const;

const DIAS_AULA_PARA_INDICE: Record<string, number> = {
  Domingo: 0,
  Segunda: 1,
  Terça: 2,
  Terca: 2,
  Quarta: 3,
  Quinta: 4,
  Sexta: 5,
  Sábado: 6,
  Sabado: 6,
};

/** Converte nomes salvos (ex: "Segunda") para índices JS getDay(). */
function indicesDiasPermitidos(diasAula: string[] | undefined): number[] {
  if (!diasAula || diasAula.length === 0) {
    return [0, 1, 2, 3, 4, 5, 6];
  }

  const indices = diasAula
    .map((dia) => {
      const chave = dia.trim();
      if (chave in DIAS_AULA_PARA_INDICE) return DIAS_AULA_PARA_INDICE[chave];
      const normalizado = chave
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .split("-")[0]
        ?.trim();
      const mapa: Record<string, number> = {
        domingo: 0,
        segunda: 1,
        terca: 2,
        quarta: 3,
        quinta: 4,
        sexta: 5,
        sabado: 6,
      };
      return normalizado ? mapa[normalizado] : undefined;
    })
    .filter((n): n is number => typeof n === "number");

  return indices.length > 0 ? indices : [0, 1, 2, 3, 4, 5, 6];
}

function cellsDoMes(ano: number, mes: number) {
  const primeiro = new Date(ano, mes, 1);
  const totalDias = new Date(ano, mes + 1, 0).getDate();
  const offset = primeiro.getDay(); // 0 = Domingo
  const cells: (Date | null)[] = [];

  for (let i = 0; i < offset; i++) cells.push(null);
  for (let dia = 1; dia <= totalDias; dia++) {
    cells.push(new Date(ano, mes, dia));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

function labelTurma(turma: TurmaOption) {
  return `${turma.curso} - Turma ${turma.codigo} (${turma.turno})`;
}

function iniciaisDoNome(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .join("");
}

/** Gera % de faltas estável (5–30) a partir do id do aluno. */
function porcentagemFaltasDeId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return 5 + (hash % 26);
}

export default function ProfessorChamadaPage() {
  const { professorLogado, carregandoSessao } = useProfessorSession();
  const [turmas, setTurmas] = useState<TurmaOption[]>([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState("");
  const [dataChamada, setDataChamada] = useState(hojeISO());
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [mesCalendario, setMesCalendario] = useState(() => {
    const hoje = new Date();
    return new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  });
  const [chamadaStatus, setChamadaStatus] = useState<
    Record<string, StatusChamada>
  >({});
  const [alunosTurma, setAlunosTurma] = useState<AlunoChamada[]>([]);
  const [termoBusca, setTermoBusca] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [aiInsight, setAiInsight] = useState<AiInsightChamada | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [salvandoChamada, setSalvandoChamada] = useState(false);
  const [modalFeedback, setModalFeedback] = useState<{
    aberto: boolean;
    tipo: "sucesso" | "erro" | "atencao";
    titulo: string;
    mensagem: string;
  }>({
    aberto: false,
    tipo: "sucesso",
    titulo: "",
    mensagem: "",
  });

  const alunosFiltrados = useMemo(() => {
    const termo = termoBusca.trim().toLowerCase();
    if (!termo) return alunosTurma;
    return alunosTurma.filter(
      (aluno) =>
        aluno.nome.toLowerCase().includes(termo) ||
        aluno.ra.toLowerCase().includes(termo)
    );
  }, [alunosTurma, termoBusca]);

  const totalRegistros = alunosFiltrados.length;
  const totalPaginas = Math.max(1, Math.ceil(totalRegistros / itensPorPagina));
  const indiceInicial = (paginaAtual - 1) * itensPorPagina;
  const indiceFinal = indiceInicial + itensPorPagina;
  const alunosExibidos = alunosFiltrados.slice(indiceInicial, indiceFinal);

  const totalAlunos = alunosTurma.length;
  const presentes = Object.values(chamadaStatus).filter(
    (s) => s === "presente"
  ).length;
  const faltas = Object.values(chamadaStatus).filter(
    (s) => s === "falta"
  ).length;

  const engajamentoAlto =
    aiInsight?.tipoAlerta?.toUpperCase().includes("ENGAJAMENTO") ?? false;

  const diasPermitidos = useMemo(
    () => indicesDiasPermitidos(professorLogado?.dias_aula),
    [professorLogado?.dias_aula]
  );

  const celulasCalendario = useMemo(
    () =>
      cellsDoMes(mesCalendario.getFullYear(), mesCalendario.getMonth()),
    [mesCalendario]
  );

  const labelMesCalendario = useMemo(
    () =>
      mesCalendario.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      }),
    [mesCalendario]
  );

  function mostrarFeedback(
    tipo: "sucesso" | "erro" | "atencao",
    titulo: string,
    mensagem: string
  ) {
    setModalFeedback({ aberto: true, tipo, titulo, mensagem });
  }

  function fecharFeedback() {
    setModalFeedback((prev) => ({ ...prev, aberto: false }));
  }

  function setStatusAluno(ra: string, status: StatusChamada) {
    setChamadaStatus((prev) => ({ ...prev, [ra]: status }));
  }

  function selecionarDataCalendario(dia: Date) {
    if (!diasPermitidos.includes(dia.getDay())) return;
    setDataChamada(paraISOLocal(dia));
    setMostrarCalendario(false);
  }

  function navegarMes(delta: number) {
    setMesCalendario(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1)
    );
  }

  async function salvarChamada() {
    if (!turmaSelecionada) {
      mostrarFeedback(
        "atencao",
        "Turma obrigatória",
        "Selecione uma turma antes de salvar a chamada."
      );
      return;
    }

    if (alunosTurma.length === 0) {
      mostrarFeedback(
        "atencao",
        "Sem alunos",
        "Nenhum aluno nesta turma para registrar chamada."
      );
      return;
    }

    setSalvandoChamada(true);
    try {
      const registros = alunosTurma.map((aluno) => ({
        turma_curso: turmaSelecionada,
        data_aula: dataChamada,
        aluno_ra: aluno.ra,
        status: chamadaStatus[aluno.ra] ?? "presente",
      }));

      const { error } = await supabase
        .from("registro_chamada")
        .upsert(registros, {
          onConflict: "turma_curso,data_aula,aluno_ra",
        });

      if (error) {
        console.error("Erro ao salvar chamada:", error.message);
        mostrarFeedback(
          "erro",
          "Falha ao salvar",
          "Não foi possível salvar a chamada. Tente novamente."
        );
        return;
      }

      mostrarFeedback(
        "sucesso",
        "Chamada Registrada",
        `Chamada do dia ${formatarDataBR(dataChamada)} salva com sucesso!`
      );
    } catch (err) {
      console.error("Erro ao salvar chamada:", err);
      mostrarFeedback(
        "erro",
        "Falha ao salvar",
        "Não foi possível salvar a chamada. Tente novamente."
      );
    } finally {
      setSalvandoChamada(false);
    }
  }

  useEffect(() => {
    if (!professorLogado) return;

    async function fetchTurmas() {
      const areaAtuacao = professorLogado!.area_atuacao?.trim() ?? "";

      const { data, error } = await supabase
        .from("turmas")
        .select("*")
        .ilike("curso", `%${areaAtuacao}%`);

      if (error) {
        console.error("Erro ao buscar turmas:", error.message);
        setTurmas([]);
        setTurmaSelecionada("");
        return;
      }

      const lista = ((data ?? []) as TurmaOption[]).map((turma) => ({
        id: String(turma.id),
        codigo: String(turma.codigo ?? ""),
        curso: String(turma.curso ?? ""),
        turno: turma.turno ? String(turma.turno) : undefined,
      }));

      setTurmas(lista);

      // Auto-select apenas quando houver uma única turma do professor
      if (lista.length === 1) {
        setTurmaSelecionada(lista[0].id);
      } else {
        setTurmaSelecionada("");
      }
    }

    void fetchTurmas();
  }, [professorLogado]);

  useEffect(() => {
    if (!turmaSelecionada || !professorLogado) {
      setAlunosTurma([]);
      return;
    }

    const turma = turmas.find((t) => t.id === turmaSelecionada);
    if (!turma) {
      setAlunosTurma([]);
      return;
    }

    async function fetchAlunos() {
      const cursoTurma = turma!.curso;
      const vinculoProfessor = professorLogado!.nomeCompletoTitulo;

      // Prioriza alunos do curso da turma selecionada
      let { data, error } = await supabase
        .from("alunos")
        .select("id, nome, ra, professor, curso")
        .eq("curso", cursoTurma)
        .order("nome", { ascending: true });

      // Fallback: alunos vinculados ao professor logado
      if (error || !data || data.length === 0) {
        const porProfessor = await supabase
          .from("alunos")
          .select("id, nome, ra, professor, curso")
          .eq("professor", vinculoProfessor)
          .order("nome", { ascending: true });

        if (porProfessor.error) {
          console.error(
            "Erro ao buscar alunos:",
            error?.message ?? porProfessor.error.message
          );
          setAlunosTurma([]);
          return;
        }

        data = porProfessor.data;
      }

      if (!data || data.length === 0) {
        setAlunosTurma([]);
        return;
      }

      const mapeados: AlunoChamada[] = data.map((aluno) => {
        const id = String(aluno.id);
        return {
          id,
          nome: String(aluno.nome ?? ""),
          ra: String(
            aluno.ra ||
              (aluno as { matricula?: string }).matricula ||
              "RA-"
          ),
          porcentagemFaltas: porcentagemFaltasDeId(id),
        };
      });

      setAlunosTurma(mapeados);
    }

    void fetchAlunos();
  }, [turmaSelecionada, professorLogado, turmas]);

  // Carrega status da chamada para a turma + data selecionadas
  useEffect(() => {
    if (!turmaSelecionada || alunosTurma.length === 0) {
      setChamadaStatus({});
      return;
    }

    let cancelado = false;

    async function carregarChamadaDoDia() {
      const { data: registros, error } = await supabase
        .from("registro_chamada")
        .select("*")
        .eq("turma_curso", turmaSelecionada)
        .eq("data_aula", dataChamada);

      if (cancelado) return;

      if (error) {
        console.error("Erro ao buscar chamada do dia:", error.message);
      }

      const statusInicial: Record<string, StatusChamada> = {};
      for (const aluno of alunosTurma) {
        statusInicial[aluno.ra] = "presente";
      }

      if (registros && registros.length > 0) {
        for (const registro of registros) {
          const ra = String(registro.aluno_ra ?? "");
          if (!ra) continue;
          const status = String(registro.status ?? "").toLowerCase();
          statusInicial[ra] = status === "falta" ? "falta" : "presente";
        }
      }

      setChamadaStatus(statusInicial);
    }

    void carregarChamadaDoDia();

    return () => {
      cancelado = true;
    };
  }, [turmaSelecionada, dataChamada, alunosTurma]);

  useEffect(() => {
    setPaginaAtual(1);
  }, [turmaSelecionada, termoBusca, dataChamada]);

  useEffect(() => {
    if (paginaAtual > totalPaginas) {
      setPaginaAtual(totalPaginas);
    }
  }, [paginaAtual, totalPaginas]);

  // Análise de IA com debounce (1.5s)
  useEffect(() => {
    if (
      !turmaSelecionada ||
      totalAlunos === 0 ||
      Object.keys(chamadaStatus).length === 0
    ) {
      setAiInsight(null);
      setIsLoadingAi(false);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      setIsLoadingAi(true);
      try {
        const response = await fetch("/api/insights/chamada", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            turma: turmaSelecionada,
            presentes,
            faltas,
            total: totalAlunos,
          }),
        });

        const data = await response.json();
        setAiInsight({
          tipoAlerta:
            (data.tipoAlerta as string) || "ALERTA DE FREQUÊNCIA",
          mensagem:
            (data.mensagem as string) ||
            "Presença registrada. Acompanhe os alunos recorrentemente ausentes para evitar evasão.",
        });
      } catch (err) {
        console.error("Erro ao gerar insight da chamada:", err);
        setAiInsight({
          tipoAlerta: "ALERTA DE FREQUÊNCIA",
          mensagem:
            "Presença registrada. Acompanhe os alunos recorrentemente ausentes para evitar evasão.",
        });
      } finally {
        setIsLoadingAi(false);
      }
    }, 1500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [turmaSelecionada, presentes, faltas, totalAlunos, chamadaStatus]);

  if (carregandoSessao || !professorLogado) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-zinc-400 text-sm">
        Carregando sessão...
      </div>
    );
  }

  const iniciais = iniciaisDoProfessor(
    professorLogado.nome || professorLogado.nomeCompletoTitulo
  );

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      {/* ══════════════════════════════
          SIDEBAR
      ══════════════════════════════ */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-zinc-950 border-r border-zinc-800">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-zinc-800">
          <div className="w-8 h-8 bg-gradient-to-br from-zinc-800 to-zinc-950 border border-zinc-700/50 shadow-[0_0_15px_rgba(255,255,255,0.05)] flex items-center justify-center rounded-lg shrink-0">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="text-sm tracking-tight">
            <span className="text-white font-bold">UniClass</span>
            <span className="text-zinc-400 font-light">Tech</span>
          </span>
        </div>

        {/* Perfil */}
        <div className="px-4 py-5 border-b border-zinc-800">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-semibold text-white shrink-0">
                {iniciais || "PR"}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {professorLogado.nomeCompletoTitulo}
                </p>
                <p className="text-xs text-zinc-500 truncate">
                  {professorLogado.area_atuacao}
                </p>
              </div>
            </div>
            <ProfessorSettingsControl />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 px-2 py-4 flex-1">
          {navItems.map(({ icon: Icon, label, href, active }) =>
            href.startsWith("/professor/dashboard") ? (
              <Link
                key={label}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-zinc-800 text-white font-medium"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            ) : (
              <a
                key={label}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-zinc-800 text-white font-medium"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </a>
            )
          )}
        </nav>

        {/* Logout */}
        <div className="px-2 py-4 border-t border-zinc-800">
          <a
            href="/professor"
            onClick={limparSessaoProfessor}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-500 hover:bg-zinc-900 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sair
          </a>
        </div>
      </aside>

      {/* ══════════════════════════════
          MAIN CONTENT
      ══════════════════════════════ */}
      <main className="flex-1 overflow-y-auto bg-black">
        <div className="max-w-6xl mx-auto p-8">

          {/* Header de Contexto */}
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                Chamada Rápida
              </h1>
              <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <span className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded shrink-0">
                  Turno: {professorLogado.turno_aula || "—"}
                </span>
                <div className="relative inline-block">
                  <select
                    value={turmaSelecionada}
                    onChange={(e) => setTurmaSelecionada(e.target.value)}
                    className="appearance-none bg-zinc-950 border border-zinc-700 text-sm text-white font-medium rounded-lg pl-4 pr-10 py-2.5 focus:outline-none focus:ring-1 focus:ring-zinc-500 cursor-pointer hover:border-zinc-600 transition-colors min-w-[260px]"
                  >
                    {turmas.length === 0 ? (
                      <option value="">Nenhuma turma da sua área</option>
                    ) : (
                      <>
                        {turmas.length > 1 && (
                          <option value="">Selecione uma turma</option>
                        )}
                        {turmas.map((turma) => (
                          <option key={turma.id} value={turma.id}>
                            {labelTurma(turma)}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                </div>
                <div className="relative inline-block">
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarCalendario((prev) => {
                        const abrir = !prev;
                        if (abrir) {
                          const [yyyy, mm] = dataChamada.split("-").map(Number);
                          if (yyyy && mm) {
                            setMesCalendario(new Date(yyyy, mm - 1, 1));
                          }
                        }
                        return abrir;
                      });
                    }}
                    className="inline-flex items-center gap-2 bg-[#0f1117] border border-gray-800 text-gray-300 rounded-lg px-4 py-2.5 text-sm hover:border-purple-500 focus:outline-none focus:border-purple-500 transition-colors min-w-[160px]"
                  >
                    <Calendar className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span>{formatarDataBR(dataChamada)}</span>
                  </button>

                  {mostrarCalendario && (
                    <div className="absolute z-50 bg-[#0f1117] border border-gray-800 rounded-lg p-4 shadow-xl mt-2 w-[300px]">
                      <div className="flex items-center justify-between mb-3">
                        <button
                          type="button"
                          onClick={() => navegarMes(-1)}
                          className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                          aria-label="Mês anterior"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <p className="text-sm font-medium text-white capitalize">
                          {labelMesCalendario}
                        </p>
                        <button
                          type="button"
                          onClick={() => navegarMes(1)}
                          className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                          aria-label="Próximo mês"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {DIAS_SEMANA_LABEL.map((label) => (
                          <div
                            key={label}
                            className="text-[10px] font-medium text-zinc-500 text-center py-1"
                          >
                            {label}
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-7 gap-1">
                        {celulasCalendario.map((dia, idx) => {
                          if (!dia) {
                            return <div key={`empty-${idx}`} className="h-9" />;
                          }

                          const permitido = diasPermitidos.includes(
                            dia.getDay()
                          );
                          const iso = paraISOLocal(dia);
                          const selecionado = iso === dataChamada;

                          return (
                            <button
                              key={iso}
                              type="button"
                              disabled={!permitido}
                              onClick={() => selecionarDataCalendario(dia)}
                              className={`h-9 rounded-md text-sm transition-colors ${
                                !permitido
                                  ? "opacity-30 cursor-not-allowed text-gray-500 bg-transparent"
                                  : selecionado
                                    ? "bg-purple-600 text-white cursor-pointer"
                                    : "hover:bg-purple-600 text-white cursor-pointer"
                              }`}
                            >
                              {dia.getDate()}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void salvarChamada()}
              disabled={salvandoChamada}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-black hover:bg-zinc-200 transition-colors shrink-0 self-start lg:self-auto disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {salvandoChamada ? "Salvando..." : "Salvar Chamada"}
            </button>
          </div>

          {/* AI Insight Card */}
          <div
            className={`mb-4 rounded-xl bg-zinc-950 p-5 flex gap-4 border ${
              engajamentoAlto
                ? "border-emerald-900/50"
                : "border-orange-900/50"
            }`}
          >
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                engajamentoAlto
                  ? "bg-emerald-950/60 border-emerald-900/50"
                  : "bg-orange-950/60 border-orange-900/50"
              }`}
            >
              {engajamentoAlto ? (
                <Check className="w-4 h-4 text-emerald-300" />
              ) : (
                <Sparkles className="w-4 h-4 text-orange-300" />
              )}
            </div>
            <div className="min-w-0">
              <p
                className={`text-xs font-medium uppercase tracking-widest mb-1.5 ${
                  engajamentoAlto
                    ? "text-emerald-300/80"
                    : "text-orange-300/80"
                }`}
              >
                {aiInsight?.tipoAlerta || "Alerta de Frequência"}
              </p>
              <p
                className={`text-sm text-zinc-300 leading-relaxed ${
                  isLoadingAi ? "animate-pulse text-zinc-400" : ""
                }`}
              >
                {isLoadingAi
                  ? "Analisando frequência da turma..."
                  : aiInsight?.mensagem ||
                    "Selecione uma turma para gerar o alerta."}
              </p>
            </div>
          </div>

          {/* Barra de Resumo */}
          <div className="mb-8 px-4 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 tracking-wide">
            Total de Alunos:{" "}
            <span className="text-white font-medium">{totalAlunos}</span>
            <span className="mx-2 text-zinc-700">|</span>
            Presentes:{" "}
            <span className="text-emerald-500 font-medium">{presentes}</span>
            <span className="mx-2 text-zinc-700">|</span>
            Faltas:{" "}
            <span className="text-red-500 font-medium">{faltas}</span>
          </div>

          {/* Lista de Alunos */}
          <div className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800">
              <div className="relative max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="search"
                  value={termoBusca}
                  onChange={(e) => setTermoBusca(e.target.value)}
                  placeholder="Buscar por nome ou RA..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-600"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="px-6 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest">
                      Aluno
                    </th>
                    <th className="px-4 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest">
                      Frequência Atual
                    </th>
                    <th className="px-6 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest text-right">
                      Status Diário
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {alunosExibidos.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-6 py-10 text-center text-sm text-zinc-500"
                      >
                        {!turmaSelecionada
                          ? "Selecione uma turma para carregar os alunos"
                          : alunosTurma.length === 0
                            ? "Nenhum aluno nesta turma"
                            : "Nenhum aluno encontrado para a busca"}
                      </td>
                    </tr>
                  ) : (
                    alunosExibidos.map((aluno) => {
                      const alerta = aluno.porcentagemFaltas >= 25;
                      const status = chamadaStatus[aluno.ra] ?? "presente";
                      const estaPresente = status === "presente";
                      return (
                        <tr
                          key={aluno.id}
                          className="border-b border-zinc-800 last:border-b-0 hover:bg-zinc-900/40 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-semibold text-white shrink-0">
                                {iniciaisDoNome(aluno.nome)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-white truncate flex items-center gap-1.5">
                                  {aluno.nome}
                                  {alerta && (
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  )}
                                </p>
                                <p className="text-xs text-zinc-500">
                                  RA {aluno.ra}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`text-sm ${
                                alerta
                                  ? "text-red-400 font-medium"
                                  : "text-zinc-400"
                              }`}
                            >
                              {aluno.porcentagemFaltas}% de faltas
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-end">
                              <div className="inline-flex rounded-lg overflow-hidden border border-zinc-800">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setStatusAluno(aluno.ra, "presente")
                                  }
                                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                                    estaPresente
                                      ? "bg-green-900/40 text-green-500"
                                      : "bg-zinc-950 text-zinc-500 hover:text-zinc-300"
                                  }`}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Presente
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setStatusAluno(aluno.ra, "falta")
                                  }
                                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-l border-zinc-800 transition-colors ${
                                    !estaPresente
                                      ? "bg-red-900/40 text-red-500"
                                      : "bg-zinc-950 text-zinc-500 hover:text-zinc-300"
                                  }`}
                                >
                                  <X className="w-3.5 h-3.5" />
                                  Falta
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <PaginationFooter
              total={totalRegistros}
              paginaAtual={paginaAtual}
              itensPorPagina={itensPorPagina}
              onPaginaChange={setPaginaAtual}
              onItensPorPaginaChange={setItensPorPagina}
            />
          </div>

        </div>
      </main>

      <ModalFeedback
        aberto={modalFeedback.aberto}
        onClose={fecharFeedback}
        tipo={modalFeedback.tipo}
        titulo={modalFeedback.titulo}
        mensagem={modalFeedback.mensagem}
      />
    </div>
  );
}
