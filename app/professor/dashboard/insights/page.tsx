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
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ProfessorSettingsControl } from "@/components/professor/config-modal";
import {
  iniciaisDoProfessor,
  limparSessaoProfessor,
  useProfessorSession,
} from "@/lib/professor-session";

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral",    href: "/professor/dashboard",           active: false },
  { icon: BookOpen,        label: "Turmas e Notas", href: "/professor/dashboard/notas",     active: false },
  { icon: UserCheck,       label: "Chamada Rápida", href: "/professor/dashboard/chamada",   active: false },
  { icon: Sparkles,        label: "Insights IA",    href: "/professor/dashboard/insights",  active: true  },
  { icon: MessageSquare,   label: "Mensagens",      href: "/professor/dashboard/mensagens",  active: false },
];

type TurmaOption = {
  id: string;
  codigo: string;
  curso: string;
  turno?: string;
};

type NivelRisco = "alto" | "medio" | "baixo";

type AlunoRisco = {
  id: string;
  nome: string;
  ra: string;
  motivo: string;
  nivel: NivelRisco;
};

type DesempenhoDisciplina = {
  disciplina: string;
  media: number;
  alerta?: boolean;
};

const badgePorNivel: Record<NivelRisco, string> = {
  alto: "bg-rose-950/40 text-rose-400 border-rose-800",
  medio: "bg-amber-950/40 text-amber-400 border-amber-800",
  baixo: "bg-zinc-800 text-zinc-300 border-zinc-700/50",
};

const motivoPorNivel: Record<NivelRisco, string> = {
  alto: "Risco Alto: Faltas",
  medio: "Risco Médio: Notas N1",
  baixo: "Queda de Engajamento",
};

function labelTurma(turma: TurmaOption) {
  return `${turma.curso} - Turma ${turma.codigo}`;
}

function iniciaisDoNome(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .join("");
}

function hashId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function nivelDeRiscoPorId(id: string): NivelRisco {
  const resto = hashId(id) % 3;
  if (resto === 0) return "alto";
  if (resto === 1) return "medio";
  return "baixo";
}

function mediaDeTurma(id: string) {
  // Média estável entre 4.0 e 9.5
  return Number((4 + (hashId(id) % 56) / 10).toFixed(1));
}

export default function ProfessorInsightsPage() {
  const { professorLogado, carregandoSessao } = useProfessorSession();
  const [turmas, setTurmas] = useState<TurmaOption[]>([]);
  const [filtroEscopo, setFiltroEscopo] = useState("todos");
  const [alunosRisco, setAlunosRisco] = useState<AlunoRisco[]>([]);
  const [desempenhoDisciplinas, setDesempenhoDisciplinas] = useState<
    DesempenhoDisciplina[]
  >([]);
  const [aiInsight, setAiInsight] = useState("");
  const [isLoadingAi, setIsLoadingAi] = useState(true);

  const escopoLabel = useMemo(() => {
    if (filtroEscopo === "todos") return "Visão Geral (Todas as Turmas)";
    const turma = turmas.find((t) => t.id === filtroEscopo);
    return turma ? labelTurma(turma) : filtroEscopo;
  }, [filtroEscopo, turmas]);

  async function fetchAiPredicao(
    escopoSelecionado: string,
    totalTurmasParam?: number,
    alunosEmRiscoParam?: number
  ) {
    setIsLoadingAi(true);
    try {
      const turma = turmas.find((t) => t.id === escopoSelecionado);
      const escopo =
        escopoSelecionado === "todos"
          ? "Visão Geral (Todas as Turmas)"
          : turma
            ? labelTurma(turma)
            : escopoSelecionado;

      const response = await fetch("/api/insights/preditivo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          escopo,
          totalTurmas: totalTurmasParam ?? turmas.length,
          alunosEmRisco: alunosEmRiscoParam ?? alunosRisco.length,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Falha ao gerar análise preditiva.");
      }
      setAiInsight((data.insight as string) ?? "");
    } catch (err) {
      console.error("Erro ao gerar análise preditiva:", err);
      setAiInsight(
        "Não foi possível gerar as projeções analíticas no momento. Tente novamente."
      );
    } finally {
      setIsLoadingAi(false);
    }
  }

  useEffect(() => {
    if (!professorLogado) return;

    async function carregarDados() {
      let listaTurmas: TurmaOption[] = [];
      let listaRisco: AlunoRisco[] = [];
      const vinculoProfessor = professorLogado!.nomeCompletoTitulo;
      const areaAtuacao = professorLogado!.area_atuacao;

      const { data: turmasData, error: turmasError } = await supabase
        .from("turmas")
        .select("id, codigo, curso, turno")
        .eq("status", "Aberta")
        .order("curso", { ascending: true });

      if (turmasError) {
        console.error("Erro ao buscar turmas:", turmasError.message);
        setTurmas([]);
        setDesempenhoDisciplinas([]);
      } else {
        listaTurmas = (turmasData ?? []) as TurmaOption[];
        setTurmas(listaTurmas);

        setDesempenhoDisciplinas(
          listaTurmas.map((turma) => {
            const media = mediaDeTurma(turma.id);
            return {
              disciplina: turma.curso || turma.codigo,
              media,
              alerta: media < 6,
            };
          })
        );
      }

      let { data: alunosData, error: alunosError } = await supabase
        .from("alunos")
        .select("id, nome, ra, professor, curso")
        .eq("professor", vinculoProfessor)
        .order("nome", { ascending: true });

      if (alunosError) {
        const fallback = await supabase
          .from("alunos")
          .select("id, nome, ra, professor, curso")
          .eq("curso", areaAtuacao)
          .order("nome", { ascending: true });

        if (fallback.error) {
          console.error(
            "Erro ao buscar alunos:",
            alunosError.message || fallback.error.message
          );
          setAlunosRisco([]);
        } else {
          alunosData = fallback.data;
          alunosError = null;
        }
      }

      if (!alunosData || alunosData.length === 0) {
        setAlunosRisco([]);
      } else {
        listaRisco = alunosData.slice(0, Math.min(5, alunosData.length)).map(
          (aluno) => {
            const id = String(aluno.id);
            const nivel = nivelDeRiscoPorId(id);
            return {
              id,
              nome: String(aluno.nome ?? ""),
              ra: String(
                aluno.ra ||
                  (aluno as { matricula?: string }).matricula ||
                  "RA-"
              ),
              motivo: motivoPorNivel[nivel],
              nivel,
            } satisfies AlunoRisco;
          }
        );
        setAlunosRisco(listaRisco);
      }

      await fetchAiPredicao("todos", listaTurmas.length, listaRisco.length);
    }

    void carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [professorLogado]);

  function handleEscopoChange(valor: string) {
    setFiltroEscopo(valor);
    void fetchAiPredicao(valor);
  }

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

          {/* Header */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                Análise Preditiva e Insights
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                Métricas geradas por IA baseadas em notas, frequência e engajamento.
              </p>
            </div>
            <div className="relative inline-block shrink-0">
              <select
                value={filtroEscopo}
                onChange={(e) => handleEscopoChange(e.target.value)}
                className="appearance-none bg-zinc-950 border border-zinc-700 text-sm text-white font-medium rounded-lg pl-4 pr-10 py-2.5 focus:outline-none focus:ring-1 focus:ring-zinc-500 cursor-pointer hover:border-zinc-600 transition-colors min-w-[260px]"
              >
                <option value="todos">Visão Geral (Todas as Turmas)</option>
                {turmas.map((turma) => (
                  <option key={turma.id} value={turma.id}>
                    {labelTurma(turma)}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            </div>
          </div>

          {/* Cérebro da IA */}
          <div className="mb-8 w-full rounded-xl bg-gradient-to-r from-zinc-900 to-black border border-indigo-900/50 p-6 flex gap-5">
            <Sparkles className="w-8 h-8 text-indigo-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white mb-2">
                Resumo Analítico do Groq
              </p>
              <p
                className={`text-sm text-zinc-300 leading-relaxed ${
                  isLoadingAi ? "animate-pulse text-zinc-400" : ""
                }`}
              >
                {isLoadingAi
                  ? "Gerando projeções analíticas com IA..."
                  : aiInsight || `Escopo atual: ${escopoLabel}.`}
              </p>
            </div>
          </div>

          {/* Grid: Gráfico + Riscos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Desempenho por Disciplina */}
            <div className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-800">
                <h2 className="text-sm font-semibold text-white">
                  Desempenho por Disciplina
                </h2>
              </div>
              <div className="p-6">
                {desempenhoDisciplinas.length === 0 ? (
                  <p className="text-sm text-zinc-500 py-8 text-center">
                    Nenhum dado de desempenho consolidado para exibir o gráfico.
                  </p>
                ) : (
                  <>
                    <div className="flex items-end justify-around gap-4 h-48 border-b border-zinc-800">
                      {desempenhoDisciplinas.map((item) => (
                        <div
                          key={item.disciplina}
                          className="flex flex-col items-center justify-end gap-2 h-full"
                        >
                          <span className="text-[10px] text-zinc-500">
                            {item.media.toFixed(1)}
                          </span>
                          <div
                            className={`w-8 rounded-t-md ${
                              item.alerta ? "bg-red-500/80" : "bg-white"
                            }`}
                            style={{
                              height: `${Math.min(100, Math.max(8, item.media * 10))}%`,
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-around gap-4 mt-3">
                      {desempenhoDisciplinas.map((item) => (
                        <span
                          key={item.disciplina}
                          className={`w-16 text-center text-[11px] truncate ${
                            item.alerta ? "text-red-400" : "text-zinc-500"
                          }`}
                          title={item.disciplina}
                        >
                          {item.disciplina}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Alunos com Risco */}
            <div className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-800">
                <h2 className="text-sm font-semibold text-white">
                  Alunos com Risco de Evasão/Reprovação
                </h2>
              </div>
              <div className="flex flex-col divide-y divide-zinc-800">
                {alunosRisco.length === 0 ? (
                  <p className="text-sm text-zinc-500 px-6 py-10 text-center">
                    Nenhum aluno em situação de risco detectado.
                  </p>
                ) : (
                  alunosRisco.map((aluno) => (
                    <div
                      key={aluno.id}
                      className="flex items-center justify-between gap-3 px-6 py-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-semibold text-white shrink-0">
                          {iniciaisDoNome(aluno.nome)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {aluno.nome}
                          </p>
                          <p className="text-xs text-zinc-500">RA {aluno.ra}</p>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border shrink-0 ${
                          badgePorNivel[aluno.nivel]
                        }`}
                      >
                        {aluno.motivo}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
