"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  ClipboardList,
  CalendarCheck,
  BookOpen,
  Map,
  LogOut,
  Camera,
  Download,
  Sparkles,
  GraduationCap,
  MessageSquare,
  Settings,
  ChevronDown,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { ModalFeedback } from "@/components/ModalFeedback";
import {
  limparSessaoAluno,
  useAlunoSession,
} from "@/lib/aluno-session";

const mockNotasPorCurso: Record<string, any[]> = {
  "Banco de Dados": [
    {
      disciplina: "Modelagem de Dados",
      professor: "Roberto Lima",
      n1: 8.5,
      n2: 7.0,
      faltas: 2,
    },
    {
      disciplina: "SQL Avançado",
      professor: "Sofia Mendes",
      n1: 9.0,
      n2: 8.5,
      faltas: 0,
    },
    {
      disciplina: "Administração de SGBD",
      professor: "Carlos Silva",
      n1: 6.0,
      n2: 7.5,
      faltas: 4,
    },
  ],
  "Análise e Desenvolvimento de Sistemas (Tecnólogo)": [
    {
      disciplina: "Lógica de Programação",
      professor: "Ana Costa",
      n1: 7.5,
      n2: 8.0,
      faltas: 2,
    },
    {
      disciplina: "Desenvolvimento Web",
      professor: "Marcos Paulo",
      n1: 9.0,
      n2: 9.0,
      faltas: 0,
    },
  ],
  // Alias do catálogo administrativo (sem sufixo Tecnólogo)
  "Análise e Desenvolvimento de Sistemas": [
    {
      disciplina: "Lógica de Programação",
      professor: "Ana Costa",
      n1: 7.5,
      n2: 8.0,
      faltas: 2,
    },
    {
      disciplina: "Desenvolvimento Web",
      professor: "Marcos Paulo",
      n1: 9.0,
      n2: 9.0,
      faltas: 0,
    },
  ],
};

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral",         href: "/aluno/dashboard",        active: false },
  { icon: ClipboardList,   label: "Boletim e Notas",     href: "/aluno/dashboard/notas",  active: true  },
  { icon: CalendarCheck,   label: "Frequência",           href: "/aluno/dashboard/frequencia",                       active: false },
  { icon: BookOpen,        label: "Grade e Matérias",     href: "/aluno/dashboard/grade",                       active: false },
  { icon: Map,             label: "Mapa de Salas e Labs", href: "/aluno/dashboard/mapa",                       active: false },
  { icon: MessageSquare,   label: "Contato",              href: "/aluno/dashboard/contato",    active: false },
];

type AlunoInfo = {
  nome: string;
  ra: string;
  curso: string;
  professor?: string;
};

const COMPOSICAO_N1_MOCK = [
  { label: "Atividade 1", peso: 2.0, nota: 1.5 },
  { label: "Atividade 2", peso: 1.0, nota: 1.0 },
  { label: "Atividade 3", peso: 1.0, nota: 0.5 },
  { label: "Atividade 4", peso: 1.0, nota: 1.0 },
  { label: "Prova Semestral", peso: 5.0, nota: 4.5 },
];

const TOTAL_N1_MOCK = COMPOSICAO_N1_MOCK.reduce((acc, item) => acc + item.nota, 0);

function statusBadgeClasses(status: string) {
  const s = status.toLowerCase();
  if (s === "aprovado") return "bg-emerald-900 text-emerald-300";
  if (s === "reprovado" || s === "em risco") return "bg-red-900 text-red-300";
  return "bg-gray-800 text-gray-300";
}

function statusPorMedia(n1: number, n2: number) {
  const media = (n1 + n2) / 2;
  if (media >= 7) return "Cursando";
  if (media >= 6) return "Pendente";
  return "Em risco";
}

function fmtNota(val: number | null) {
  if (val === null || Number.isNaN(val)) {
    return <span className="text-zinc-600">—</span>;
  }
  return val.toFixed(1);
}

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

export default function AlunoNotasPage() {
  const { alunoLogado, carregandoSessao } = useAlunoSession();
  const [aluno, setAluno] = useState<AlunoInfo | null>(null);
  const [linhaExpandida, setLinhaExpandida] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [semestreSelecionado, setSemestreSelecionado] = useState(
    "4º Semestre (Atual)"
  );
  const [insightIA, setInsightIA] = useState("");
  const [loadingIA, setLoadingIA] = useState(true);
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

  const dadosNotas =
    alunoLogado?.curso && mockNotasPorCurso[alunoLogado.curso]
      ? mockNotasPorCurso[alunoLogado.curso]
      : [
          {
            disciplina: "Grade Pendente",
            professor: "-",
            n1: 0,
            n2: 0,
            faltas: 0,
          },
        ];

  useEffect(() => {
    if (carregandoSessao) return;

    let cancelado = false;

    async function carregarInsightDesempenho() {
      setLoadingIA(true);
      try {
        const response = await fetch("/api/insights/desempenho", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notas: dadosNotas }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Falha na análise de desempenho");
        }
        if (!cancelado) {
          setInsightIA((data.insight as string) ?? "");
        }
      } catch (err) {
        console.error("Erro ao gerar insight de desempenho:", err);
        if (!cancelado) {
          setInsightIA(
            "Seu desempenho mostra pontos fortes e oportunidades de evolução. Priorize as disciplinas com notas mais baixas e acompanhe as faltas de perto."
          );
        }
      } finally {
        if (!cancelado) setLoadingIA(false);
      }
    }

    void carregarInsightDesempenho();
    return () => {
      cancelado = true;
    };
  }, [alunoLogado?.curso, carregandoSessao]);

  useEffect(() => {
    if (carregandoSessao || !alunoLogado) return;

    async function carregarAluno() {
      setCarregando(true);

      try {
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
            curso: alunoLogado!.curso || "Tecnologia da Informação",
          });
          return;
        }

        setAluno({
          nome: String(alunoData.nome ?? alunoLogado!.nome ?? "Estudante"),
          ra: String(alunoData.ra || alunoData.matricula || alunoLogado!.ra),
          curso: String(
            alunoData.curso || alunoLogado!.curso || "Tecnologia da Informação"
          ),
          professor: alunoData.professor
            ? String(alunoData.professor)
            : undefined,
        });
      } finally {
        setCarregando(false);
      }
    }

    void carregarAluno();
  }, [alunoLogado, carregandoSessao]);

  function handleBaixarPdf() {
    setModalFeedback({
      aberto: true,
      tipo: "sucesso",
      titulo: "Solicitação Recebida",
      mensagem:
        "O download do seu Histórico Escolar oficial (PDF) será iniciado em instantes.",
    });
  }

  function fecharFeedback() {
    setModalFeedback((prev) => ({ ...prev, aberto: false }));
  }

  function toggleLinhaExpandida(id: string) {
    setLinhaExpandida((prev) => (prev === id ? null : id));
  }

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
            <Link href="/aluno/dashboard/perfil" className="text-zinc-500 hover:text-white transition-colors shrink-0">
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
              <h1 className="text-2xl font-semibold tracking-tight">Boletim e Notas</h1>
              <p className="text-sm text-zinc-400 mt-1">
                Curso: {aluno?.curso || "Matrícula Pendente"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={semestreSelecionado}
                onChange={(e) => setSemestreSelecionado(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-zinc-600 transition-colors cursor-pointer"
              >
                <option>4º Semestre (Atual)</option>
                <option>3º Semestre</option>
                <option>2º Semestre</option>
                <option>1º Semestre</option>
              </select>
              <button
                type="button"
                onClick={handleBaixarPdf}
                className="flex items-center gap-2 border border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors text-sm rounded-lg px-4 py-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Baixar Histórico PDF
              </button>
            </div>
          </div>

          {/* ── Insight IA + Desempenho Semestral ── */}
          <div className="mb-8 space-y-4">
            <div className="flex items-start gap-4 p-5 rounded-xl bg-gradient-to-br from-violet-950/40 via-zinc-900/80 to-zinc-950 border border-violet-500/20 shadow-[0_0_40px_rgba(139,92,246,0.08)]">
              <div className="shrink-0 mt-0.5 w-9 h-9 rounded-lg bg-violet-500/15 border border-violet-400/30 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-violet-300" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-violet-300/90 uppercase tracking-widest mb-2">
                  Feedback Inteligente
                </p>
                {loadingIA ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-3 rounded bg-zinc-800 w-full" />
                    <div className="h-3 rounded bg-zinc-800 w-5/6" />
                    <div className="h-3 rounded bg-zinc-800 w-2/3" />
                  </div>
                ) : (
                  <p className="text-sm text-zinc-200 leading-relaxed">
                    {insightIA}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-xl bg-[#0f1117] border border-zinc-800 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5">
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Desempenho Semestral
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Comparativo de N1 e N2 por disciplina
                  </p>
                </div>
                <div className="flex items-center gap-4 text-[11px] text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-sm bg-emerald-500" />
                    N1
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-sm bg-violet-500" />
                    N2
                  </span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dadosNotas}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#27272a"
                    vertical={false}
                  />
                  <XAxis dataKey="disciplina" stroke="#52525b" />
                  <YAxis stroke="#52525b" domain={[0, 10]} />
                  <Tooltip
                    cursor={{ fill: "#27272a" }}
                    contentStyle={{
                      backgroundColor: "#09090b",
                      borderColor: "#27272a",
                      color: "#fff",
                    }}
                  />
                  <Bar
                    dataKey="n1"
                    name="N1"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="n2"
                    name="N2"
                    fill="#8b5cf6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Tabela de Notas (linhas expansíveis) ── */}
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Notas do Semestre</h2>
              <span className="text-xs text-zinc-600">
                {carregando ? "…" : `${dadosNotas.length} disciplinas`}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-zinc-500 uppercase bg-zinc-950 border-b border-zinc-800">
                    <th className="px-6 py-3 text-left font-medium tracking-wider w-8" />
                    <th className="px-4 py-3 text-left font-medium tracking-wider">Disciplina</th>
                    <th className="px-4 py-3 text-left font-medium tracking-wider">Professor</th>
                    <th className="px-4 py-3 text-center font-medium tracking-wider">Média Parcial</th>
                    <th className="px-4 py-3 text-center font-medium tracking-wider">Faltas</th>
                    <th className="px-6 py-3 text-left font-medium tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {carregandoSessao || carregando ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-10 text-center text-sm text-zinc-500"
                      >
                        Carregando boletim...
                      </td>
                    </tr>
                  ) : (
                    dadosNotas.map((item) => {
                      const chave = String(item.disciplina);
                      const aberto = linhaExpandida === chave;
                      const media =
                        (Number(item.n1) + Number(item.n2)) / 2;
                      const label = statusPorMedia(
                        Number(item.n1),
                        Number(item.n2)
                      );
                      return (
                        <Fragment key={chave}>
                          <tr
                            onClick={() => toggleLinhaExpandida(chave)}
                            className={`cursor-pointer transition-colors border-b border-zinc-800/80 ${
                              aberto
                                ? "bg-zinc-900/60"
                                : "hover:bg-zinc-900/40"
                            }`}
                          >
                            <td className="pl-6 pr-2 py-4">
                              <ChevronDown
                                className={`w-4 h-4 text-zinc-500 transition-transform duration-200 ${
                                  aberto ? "rotate-180" : ""
                                }`}
                              />
                            </td>
                            <td className="px-4 py-4 font-medium text-white">
                              {item.disciplina}
                            </td>
                            <td className="px-4 py-4 text-zinc-400">
                              {item.professor}
                            </td>
                            <td className="px-4 py-4 text-center font-semibold text-white">
                              {fmtNota(media)}
                            </td>
                            <td className="px-4 py-4 text-center text-zinc-400">
                              {item.faltas}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${statusBadgeClasses(
                                  label
                                )}`}
                              >
                                {label}
                              </span>
                            </td>
                          </tr>
                          {aberto && (
                            <tr className="border-b border-zinc-800">
                              <td colSpan={6} className="p-0">
                                <div className="bg-zinc-900/50 p-4 rounded-b-lg border-t border-zinc-800">
                                  <div className="flex items-start justify-between gap-4 mb-3">
                                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                      Composição da Nota
                                    </p>
                                    <p className="text-sm font-semibold text-emerald-400 shrink-0">
                                      Total N1: {TOTAL_N1_MOCK.toFixed(1)}
                                    </p>
                                  </div>
                                  <div className="flex flex-col sm:flex-row gap-3 overflow-x-auto">
                                    {COMPOSICAO_N1_MOCK.map((comp) => (
                                      <div
                                        key={comp.label}
                                        className="rounded-lg border border-zinc-800/80 bg-zinc-950/60 px-3 py-3 min-w-[140px] flex-1"
                                      >
                                        <p className="text-xs text-zinc-400 mb-1.5">
                                          {comp.label}
                                        </p>
                                        <p className="text-sm font-medium text-white">
                                          Peso {comp.peso.toFixed(1)}
                                        </p>
                                        <p className="text-xs text-zinc-500 mt-1">
                                          Nota {comp.nota.toFixed(1)}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
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
