"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  ClipboardList,
  CalendarCheck,
  BookOpen,
  Map as MapIcon,
  LogOut,
  Camera,
  Sparkles,
  GraduationCap,
  MessageSquare,
  Check,
  AlertTriangle,
  Settings,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  limparSessaoAluno,
  useAlunoSession,
} from "@/lib/aluno-session";

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral", href: "/aluno/dashboard", active: false },
  { icon: ClipboardList, label: "Boletim e Notas", href: "/aluno/dashboard/notas", active: false },
  { icon: CalendarCheck, label: "Frequência", href: "/aluno/dashboard/frequencia", active: true },
  { icon: BookOpen, label: "Grade e Matérias", href: "/aluno/dashboard/grade", active: false },
  { icon: MapIcon, label: "Mapa de Salas e Labs", href: "/aluno/dashboard/mapa", active: false },
  { icon: MessageSquare, label: "Contato", href: "/aluno/dashboard/contato", active: false },
];

const CARGA_HORARIA_PADRAO = 80;

type AlunoInfo = {
  nome: string;
  ra: string;
  professor?: string;
};

type FrequenciaItem = {
  id: string;
  disciplina: string;
  professor: string;
  faltas: number;
  limiteFaltas: number;
  totalAulasRegistradas: number;
  percentualFalta: number;
  percentualPresenca: number;
};

function iniciaisDe(nome: string) {
  return (
    nome
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "—"
  );
}

function isFalta(status: string) {
  const s = status.toLowerCase();
  return s === "falta" || s === "ausente" || s === "absent";
}

function corBarra(percentualFalta: number) {
  if (percentualFalta > 75) return "bg-red-500";
  if (percentualFalta >= 50) return "bg-yellow-500";
  return "bg-emerald-500";
}

function estiloCard(percentualFalta: number) {
  if (percentualFalta > 75) {
    return "border-red-900/50 bg-red-950/20";
  }
  if (percentualFalta >= 50) {
    return "border-yellow-900/40 bg-yellow-950/10";
  }
  return "border-zinc-800 bg-zinc-950";
}

function estiloAlertaRisco(qtdEmRisco: number) {
  if (qtdEmRisco > 2) {
    return {
      card: "bg-zinc-900/50 border-red-900/50",
      iconWrap: "bg-zinc-800 border-red-900/30",
      icon: "text-red-300",
      label: "text-red-300",
    };
  }
  if (qtdEmRisco >= 1) {
    return {
      card: "bg-zinc-900/50 border-yellow-900/50",
      iconWrap: "bg-zinc-800 border-yellow-900/30",
      icon: "text-yellow-300",
      label: "text-yellow-300",
    };
  }
  return {
    card: "bg-zinc-900/50 border-emerald-900/50",
    iconWrap: "bg-zinc-800 border-emerald-900/30",
    icon: "text-emerald-300",
    label: "text-emerald-300",
  };
}

function toCargaHoraria(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return CARGA_HORARIA_PADRAO;
  return n;
}

export default function AlunoFrequenciaPage() {
  const { alunoLogado, carregandoSessao } = useAlunoSession();
  const [aluno, setAluno] = useState<AlunoInfo | null>(null);
  const [frequencias, setFrequencias] = useState<FrequenciaItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [aiInsight, setAiInsight] = useState("");
  const [isLoadingAi, setIsLoadingAi] = useState(true);

  const totalDisciplinas = frequencias.length;

  const disciplinasEmRisco = useMemo(
    () => frequencias.filter((f) => f.percentualFalta > 75),
    [frequencias]
  );

  const presencaGlobal = useMemo(() => {
    if (totalDisciplinas === 0) return 100;
    return Math.round(
      frequencias.reduce((acc, curr) => acc + curr.percentualPresenca, 0) /
        totalDisciplinas
    );
  }, [frequencias, totalDisciplinas]);

  const alertaRisco = estiloAlertaRisco(disciplinasEmRisco.length);

  async function fetchAiFrequencia(
    alunoNome: string,
    presenca: number,
    emRisco: FrequenciaItem[]
  ) {
    setIsLoadingAi(true);
    try {
      const response = await fetch("/api/insights/aluno-frequencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alunoNome: alunoNome || "Estudante",
          presencaGlobal: presenca,
          disciplinasEmRisco: emRisco.map(
            (d) => `${d.disciplina} - Prof. ${d.professor}`
          ),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Falha na análise de frequência");
      }
      setAiInsight((data.insight as string) ?? "");
    } catch (err) {
      console.error("Erro ao gerar insight de frequência:", err);
      setAiInsight(
        "Sua frequência está sob controle. Continue participando das aulas para evitar acúmulo de faltas no fim do semestre."
      );
    } finally {
      setIsLoadingAi(false);
    }
  }

  useEffect(() => {
    if (carregandoSessao || !alunoLogado) return;

    async function carregarFrequencia() {
      setCarregando(true);

      try {
        // 1) Aluno logado (RA)
        const { data: alunoData, error: alunoError } = await supabase
          .from("alunos")
          .select("*")
          .eq("ra", alunoLogado!.ra)
          .single();

        if (alunoError || !alunoData) {
          if (alunoError) {
            console.error("Erro ao buscar aluno:", alunoError.message);
          }
          setAluno({
            nome: alunoLogado!.nome,
            ra: alunoLogado!.ra,
          });
          setFrequencias([]);
          setIsLoadingAi(false);
          return;
        }

        const alunoSessao: AlunoInfo = {
          nome: String(alunoData.nome ?? alunoLogado!.nome ?? "Estudante"),
          ra: String(alunoData.ra || alunoData.matricula || alunoLogado!.ra),
          professor: alunoData.professor
            ? String(alunoData.professor)
            : undefined,
        };
        setAluno(alunoSessao);

        if (!alunoSessao.ra) {
          setFrequencias([]);
          setIsLoadingAi(false);
          return;
        }

        // 2) Disciplinas matriculadas (cruzando com notas)
        const { data: notasData, error: notasError } = await supabase
          .from("notas")
          .select("turma")
          .eq("ra_aluno", alunoSessao.ra);

        if (notasError) {
          console.error("Erro ao buscar matrículas (notas):", notasError.message);
        }

        const turmaIds = [
          ...new Set(
            (notasData ?? [])
              .map((n) => String(n.turma ?? ""))
              .filter(Boolean)
          ),
        ];

        let turmasRows: Record<string, unknown>[] = [];

        if (turmaIds.length > 0) {
          const { data: turmasData, error: turmasError } = await supabase
            .from("turmas")
            .select("*")
            .in("id", turmaIds);

          if (turmasError) {
            console.error("Erro ao buscar turmas:", turmasError.message);
          } else {
            turmasRows = (turmasData ?? []) as Record<string, unknown>[];
          }
        }

        // Fallback: turmas do mesmo curso do aluno (regra de negócio atual)
        if (turmasRows.length === 0 && alunoData.curso) {
          const { data: turmasCurso, error: turmasCursoError } = await supabase
            .from("turmas")
            .select("*")
            .ilike("curso", `%${String(alunoData.curso)}%`);

          if (turmasCursoError) {
            console.error(
              "Erro ao buscar turmas por curso:",
              turmasCursoError.message
            );
          } else {
            turmasRows = (turmasCurso ?? []) as Record<string, unknown>[];
          }
        }

        const idsTurmas = turmasRows.map((t) => String(t.id));

        // 3) Registros de chamada do aluno + totais por turma
        const { data: registrosAluno, error: faltasError } = await supabase
          .from("registro_chamada")
          .select("turma_curso, status, data_aula")
          .eq("aluno_ra", alunoSessao.ra);

        if (faltasError) {
          console.error("Erro ao buscar registro_chamada:", faltasError.message);
        }

        const registrosDoAluno = (registrosAluno ?? []).map((r) => ({
          turma: String(r.turma_curso ?? ""),
          status: String(r.status ?? ""),
          data: String(r.data_aula ?? ""),
        }));

        // Totais de aulas registradas por turma (todas as chamadas no banco)
        const totalAulasPorTurma = new Map<string, number>();

        if (idsTurmas.length > 0) {
          const { data: registrosTurma, error: regTurmaError } = await supabase
            .from("registro_chamada")
            .select("turma_curso, data_aula")
            .in("turma_curso", idsTurmas);

          if (regTurmaError) {
            console.error(
              "Erro ao buscar totais de chamada por turma:",
              regTurmaError.message
            );
          } else {
            const datasPorTurma = new Map<string, Set<string>>();
            for (const r of registrosTurma ?? []) {
              const tid = String(r.turma_curso ?? "");
              const data = String(r.data_aula ?? "");
              if (!tid || !data) continue;
              if (!datasPorTurma.has(tid)) datasPorTurma.set(tid, new Set());
              datasPorTurma.get(tid)!.add(data);
            }
            for (const [tid, datas] of datasPorTurma) {
              totalAulasPorTurma.set(tid, datas.size);
            }
          }
        }

        // 4) Agrupar e calcular por disciplina
        const lista: FrequenciaItem[] = turmasRows.map((turma) => {
          const id = String(turma.id);
          const disciplina = String(
            turma.nome ?? turma.curso ?? turma.codigo ?? "Disciplina"
          );
          const professor = String(
            turma.professor ?? alunoSessao.professor ?? "—"
          );
          const cargaHoraria = toCargaHoraria(turma.carga_horaria);
          const limiteFaltas = Math.max(1, Math.floor(cargaHoraria * 0.25));

          const doAluno = registrosDoAluno.filter((r) => r.turma === id);
          const faltas = doAluno.filter((r) => isFalta(r.status)).length;

          // Fallback: se não houver datas únicas da turma, usa registros do aluno
          const totalAulasRegistradas =
            totalAulasPorTurma.get(id) ??
            new Set(doAluno.map((r) => r.data).filter(Boolean)).size;

          const percentualFalta = Math.min(
            100,
            Math.round((faltas / limiteFaltas) * 100)
          );

          const percentualPresenca =
            totalAulasRegistradas === 0
              ? 100
              : Math.max(
                  0,
                  Math.round(
                    100 - (faltas / totalAulasRegistradas) * 100
                  )
                );

          return {
            id,
            disciplina,
            professor,
            faltas,
            limiteFaltas,
            totalAulasRegistradas,
            percentualFalta,
            percentualPresenca,
          };
        });

        setFrequencias(lista);

        if (lista.length === 0) {
          setIsLoadingAi(false);
          setAiInsight(
            "Nenhuma disciplina vinculada ainda. Assim que houver turmas, o acompanhamento de frequência será exibido aqui."
          );
          return;
        }

        const emRisco = lista.filter((f) => f.percentualFalta > 75);
        const presenca =
          lista.length === 0
            ? 100
            : Math.round(
                lista.reduce((acc, curr) => acc + curr.percentualPresenca, 0) /
                  lista.length
              );

        await fetchAiFrequencia(alunoSessao.nome, presenca, emRisco);
      } finally {
        setCarregando(false);
      }
    }

    void carregarFrequencia();
  }, [alunoLogado, carregandoSessao]);

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
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-base font-semibold text-white">
                  {aluno ? iniciaisDe(aluno.nome) : "—"}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-zinc-700 border border-zinc-900 rounded-full flex items-center justify-center cursor-pointer hover:bg-zinc-600 transition-colors">
                  <Camera className="w-2.5 h-2.5 text-zinc-300" />
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {aluno?.nome || "Estudante"}
                </p>
                <p className="text-xs text-zinc-500">RA: {aluno?.ra || "—"}</p>
              </div>
            </div>
            <Link
              href="/aluno/dashboard/perfil"
              className="text-zinc-500 hover:text-white transition-colors shrink-0"
            >
              <Settings className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 px-2 py-4 flex-1">
          {navItems.map(({ icon: Icon, label, href, active }) => (
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
          ))}
        </nav>

        {/* Logout */}
        <div className="px-2 py-4 border-t border-zinc-800">
          <a
            href="/"
            onClick={() => limparSessaoAluno()}
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
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 py-10">
          {/* ── Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Frequência e Presença
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                Acompanhe seu limite de faltas para evitar reprovação (limite de
                25%).
              </p>
            </div>
          </div>

          {/* ── AI Insight Card (Alerta de Risco) ── */}
          <div
            className={`flex items-start gap-4 p-5 rounded-xl border mb-8 ${alertaRisco.card}`}
          >
            <div
              className={`shrink-0 mt-0.5 w-8 h-8 rounded-lg border flex items-center justify-center ${alertaRisco.iconWrap}`}
            >
              <Sparkles className={`w-4 h-4 ${alertaRisco.icon}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p
                className={`text-xs font-semibold uppercase tracking-widest mb-1 ${alertaRisco.label}`}
              >
                Alerta de Risco
              </p>
              <p
                className={`text-sm text-zinc-300 leading-relaxed break-words whitespace-normal ${
                  isLoadingAi ? "animate-pulse" : ""
                }`}
              >
                {isLoadingAi
                  ? "Calculando projeções de faltas..."
                  : aiInsight}
              </p>
            </div>
          </div>

          {/* ── Cards de Resumo (Grid 2 colunas) ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="p-6 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-500 uppercase tracking-widest">
                  Presença Global
                </p>
                <Check className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-4xl font-semibold tracking-tight">
                {carregando ? "…" : `${presencaGlobal}%`}
              </p>
            </div>

            <div className="p-6 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-500 uppercase tracking-widest">
                  Disciplinas em Risco
                </p>
                <AlertTriangle
                  className={`w-4 h-4 ${
                    disciplinasEmRisco.length > 2
                      ? "text-red-400"
                      : disciplinasEmRisco.length >= 1
                        ? "text-yellow-400"
                        : "text-emerald-400"
                  }`}
                />
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-semibold tracking-tight">
                  {carregando ? "…" : disciplinasEmRisco.length}
                </p>
                {!carregando && (
                  <span className="text-sm text-zinc-400">
                    {disciplinasEmRisco.length === 1
                      ? "disciplina"
                      : "disciplinas"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── Detalhamento por Disciplina ── */}
          <div className="flex flex-col gap-4">
            {carregando ? (
              <div className="p-8 rounded-xl border border-zinc-800 bg-zinc-950 text-center">
                <p className="text-sm text-zinc-500 animate-pulse">
                  Carregando frequência...
                </p>
              </div>
            ) : frequencias.length === 0 ? (
              <div className="p-8 rounded-xl border border-zinc-800 bg-zinc-950 text-center">
                <p className="text-sm text-zinc-500">
                  Nenhuma disciplina vinculada para acompanhamento de
                  frequência.
                </p>
              </div>
            ) : (
              frequencias.map((item) => (
                <div
                  key={item.id}
                  className={`p-5 rounded-xl border ${estiloCard(
                    item.percentualFalta
                  )}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">
                        {item.disciplina} - Prof. {item.professor}
                      </p>
                      <p className="text-xs text-zinc-400 mt-1">
                        Faltas: {item.faltas} / Limite: {item.limiteFaltas}
                      </p>
                    </div>
                    <span className="text-xs text-zinc-500 whitespace-nowrap">
                      {item.percentualFalta}%
                    </span>
                  </div>

                  <div className="mt-4 w-full h-2 rounded-full overflow-hidden bg-zinc-800">
                    <div
                      className={`${corBarra(
                        item.percentualFalta
                      )} h-full rounded-full transition-all`}
                      style={{ width: `${item.percentualFalta}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
