"use client";

import { useEffect, useState } from "react";
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
  CheckCircle,
  AlertTriangle,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

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
};

type Disciplina = {
  id: string;
  nome: string;
  n1: number | null;
  n2: number | null;
  atividades: number | null;
  media: number | null;
  faltas: number;
  status: string;
};

type ModalFeedback = {
  aberto: boolean;
  tipo: "sucesso" | "atencao" | "erro";
  titulo: string;
  mensagem: string;
};

const statusConfig: Record<string, { label: string; classes: string }> = {
  Aprovado: {
    label: "Aprovado",
    classes: "bg-emerald-950/40 text-emerald-400 border border-emerald-800",
  },
  Cursando: {
    label: "Cursando",
    classes: "bg-amber-950/40 text-amber-400 border border-amber-800",
  },
  Reprovado: {
    label: "Reprovado",
    classes: "bg-rose-950/40 text-rose-400 border border-rose-800",
  },
};

function fmt(val: number | null) {
  return val !== null ? val.toFixed(1) : <span className="text-zinc-700">—</span>;
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
  const [aluno, setAluno] = useState<AlunoInfo | null>(null);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [semestreSelecionado, setSemestreSelecionado] = useState(
    "4º Semestre (Atual)"
  );
  const [aiInsight, setAiInsight] = useState("");
  const [isLoadingAi, setIsLoadingAi] = useState(true);
  const [modalFeedback, setModalFeedback] = useState<ModalFeedback>({
    aberto: false,
    tipo: "sucesso",
    titulo: "",
    mensagem: "",
  });

  async function fetchAiBoletimInsight(
    alunoNome: string,
    listaDisciplinas: Disciplina[]
  ) {
    setIsLoadingAi(true);
    try {
      const pendentes = listaDisciplinas
        .filter((d) => d.status === "Cursando" || d.media === null)
        .map((d) => d.nome)
        .join(", ");

      const response = await fetch("/api/insights/boletim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alunoNome: alunoNome || "Estudante",
          totalDisciplinas: listaDisciplinas.length,
          disciplinasPendentes:
            pendentes ||
            (listaDisciplinas.length > 0
              ? listaDisciplinas.map((d) => d.nome).join(", ")
              : "nenhuma disciplina cadastrada"),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha na análise do boletim");
      setAiInsight((data.insight as string) ?? "");
    } catch (err) {
      console.error("Erro ao gerar insight do boletim:", err);
      setAiInsight(
        "Mantenha uma rotina diária de revisão para as disciplinas em andamento. Foque nas matérias com entregas práticas pendentes."
      );
    } finally {
      setIsLoadingAi(false);
    }
  }

  useEffect(() => {
    async function carregarBoletim() {
      const { data: alunoData, error: alunoError } = await supabase
        .from("alunos")
        .select("*")
        .limit(1)
        .maybeSingle();

      let alunoNome = "Estudante";
      if (alunoError || !alunoData) {
        if (alunoError) {
          console.error("Erro ao buscar aluno:", alunoError.message);
        }
        setAluno(null);
      } else {
        const info: AlunoInfo = {
          nome: String(alunoData.nome ?? "Estudante"),
          ra: String(alunoData.ra || alunoData.matricula || "RA-0000"),
          curso: String(alunoData.curso || "Tecnologia da Informação"),
        };
        setAluno(info);
        alunoNome = info.nome;
      }

      const { data: turmasData, error: turmasError } = await supabase
        .from("turmas")
        .select("id, codigo, curso, turno");

      let lista: Disciplina[] = [];
      if (turmasError) {
        console.error("Erro ao buscar turmas:", turmasError.message);
        setDisciplinas([]);
      } else if (turmasData && turmasData.length > 0) {
        lista = turmasData.map((turma) => ({
          id: String(turma.id),
          nome: String(turma.curso ?? "Disciplina"),
          n1: null,
          n2: null,
          atividades: null,
          media: null,
          faltas: 0,
          status: "Cursando",
        }));
        setDisciplinas(lista);
      } else {
        setDisciplinas([]);
      }

      await fetchAiBoletimInsight(alunoNome, lista);
    }

    void carregarBoletim();
  }, []);

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
            href === "/aluno/dashboard/frequencia" ? (
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
          ))}
        </nav>

        {/* Logout */}
        <div className="px-2 py-4 border-t border-zinc-800">
          <a
            href="/"
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

          {/* ── AI Insight Card ── */}
          <div className="flex items-start gap-4 p-5 rounded-xl bg-zinc-900/50 border border-zinc-800 mb-8">
            <div className="shrink-0 mt-0.5 w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/50 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-zinc-300" />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">
                Insight da IA
              </p>
              <p
                className={`text-sm text-zinc-300 leading-relaxed ${
                  isLoadingAi ? "animate-pulse" : ""
                }`}
              >
                {isLoadingAi
                  ? "Avaliando desempenho acadêmico..."
                  : aiInsight}
              </p>
            </div>
          </div>

          {/* ── Tabela de Notas ── */}
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Notas do Semestre</h2>
              <span className="text-xs text-zinc-600">
                {disciplinas.length} disciplinas
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-zinc-500 uppercase bg-zinc-950 border-b border-zinc-800">
                    <th className="px-6 py-3 text-left font-medium tracking-wider">Disciplina</th>
                    <th className="px-4 py-3 text-center font-medium tracking-wider">N1</th>
                    <th className="px-4 py-3 text-center font-medium tracking-wider">N2</th>
                    <th className="px-4 py-3 text-center font-medium tracking-wider">Atividades</th>
                    <th className="px-4 py-3 text-center font-medium tracking-wider">Média</th>
                    <th className="px-4 py-3 text-center font-medium tracking-wider">Faltas</th>
                    <th className="px-6 py-3 text-left font-medium tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {disciplinas.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-10 text-center text-sm text-zinc-500"
                      >
                        Nenhuma disciplina cadastrada neste semestre.
                      </td>
                    </tr>
                  ) : (
                    disciplinas.map((d) => {
                      const s =
                        statusConfig[d.status] ?? statusConfig.Cursando;
                      return (
                        <tr
                          key={d.id}
                          className="hover:bg-zinc-900/40 transition-colors"
                        >
                          <td className="px-6 py-4 font-medium text-white">
                            {d.nome}
                          </td>
                          <td className="px-4 py-4 text-center text-zinc-300">
                            {fmt(d.n1)}
                          </td>
                          <td className="px-4 py-4 text-center text-zinc-300">
                            {fmt(d.n2)}
                          </td>
                          <td className="px-4 py-4 text-center text-zinc-300">
                            {fmt(d.atividades)}
                          </td>
                          <td className="px-4 py-4 text-center font-semibold text-white">
                            {fmt(d.media)}
                          </td>
                          <td className="px-4 py-4 text-center text-zinc-400">
                            {d.faltas}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${s.classes}`}
                            >
                              {s.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>

      {modalFeedback.aberto && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md shadow-2xl"
          >
            <div className="flex flex-col items-center text-center gap-4">
              <div
                className={`w-12 h-12 rounded-full border flex items-center justify-center ${
                  modalFeedback.tipo === "sucesso"
                    ? "bg-emerald-950/60 border-emerald-900/50"
                    : modalFeedback.tipo === "erro"
                      ? "bg-rose-950/60 border-rose-900/50"
                      : "bg-amber-950/60 border-amber-900/50"
                }`}
              >
                {modalFeedback.tipo === "sucesso" ? (
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                ) : (
                  <AlertTriangle
                    className={`w-6 h-6 ${
                      modalFeedback.tipo === "erro"
                        ? "text-rose-400"
                        : "text-amber-400"
                    }`}
                  />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {modalFeedback.titulo}
                </h3>
                <p className="text-sm text-zinc-400 mt-1">
                  {modalFeedback.mensagem}
                </p>
              </div>
              <button
                type="button"
                onClick={fecharFeedback}
                className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <X className="w-4 h-4" />
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
