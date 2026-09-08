"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  ClipboardList,
  CalendarCheck,
  BookOpen,
  Map,
  LogOut,
  Camera,
  Sparkles,
  GraduationCap,
  MessageSquare,
  Download,
  CheckCircle,
  Lock,
  Settings,
  AlertTriangle,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral", href: "/aluno/dashboard", active: false },
  { icon: ClipboardList, label: "Boletim e Notas", href: "/aluno/dashboard/notas", active: false },
  { icon: CalendarCheck, label: "Frequência", href: "/aluno/dashboard/frequencia", active: false },
  { icon: BookOpen, label: "Grade e Matérias", href: "/aluno/dashboard/grade", active: true },
  { icon: Map, label: "Mapa de Salas e Labs", href: "/aluno/dashboard/mapa", active: false },
  { icon: MessageSquare, label: "Contato", href: "/aluno/dashboard/contato", active: false },
];

const CARGA_TOTAL = 2400;
const HORAS_CURSADAS_COM_DISCIPLINAS = 1560;

type AlunoInfo = {
  nome: string;
  ra: string;
  curso: string;
};

type Disciplina = {
  id: string;
  nome: string;
  cargaHoraria: number;
  creditos: number;
  status: string;
};

type ModalFeedback = {
  aberto: boolean;
  tipo: "sucesso" | "atencao" | "erro";
  titulo: string;
  mensagem: string;
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

export default function AlunoGradePage() {
  const [aluno, setAluno] = useState<AlunoInfo | null>(null);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [aiInsight, setAiInsight] = useState("");
  const [isLoadingAi, setIsLoadingAi] = useState(true);
  const [modalFeedback, setModalFeedback] = useState<ModalFeedback>({
    aberto: false,
    tipo: "sucesso",
    titulo: "",
    mensagem: "",
  });

  const { horasCursadas, horasRestantes, progresso } = useMemo(() => {
    if (disciplinas.length === 0) {
      return {
        horasCursadas: 0,
        horasRestantes: CARGA_TOTAL,
        progresso: 0,
      };
    }

    const cursadas = HORAS_CURSADAS_COM_DISCIPLINAS;
    const restantes = Math.max(CARGA_TOTAL - cursadas, 0);
    return {
      horasCursadas: cursadas,
      horasRestantes: restantes,
      progresso: Math.round((cursadas / CARGA_TOTAL) * 100),
    };
  }, [disciplinas.length]);

  async function fetchAiGrade(cursoNome: string, lista: Disciplina[]) {
    setIsLoadingAi(true);
    try {
      const response = await fetch("/api/insights/grade-curricular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cursoNome: cursoNome || "Tecnologia da Informação",
          disciplinasAtuais: lista.map((d) => d.nome),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Falha na análise de grade curricular");
      }
      setAiInsight((data.insight as string) ?? "");
    } catch (err) {
      console.error("Erro ao gerar insight da grade:", err);
      setAiInsight(
        "Aprofunde-se nos fundamentos práticos das disciplinas atuais. Praticar projetos pessoais fortalece sua evolução para os próximos semestres."
      );
    } finally {
      setIsLoadingAi(false);
    }
  }

  useEffect(() => {
    async function carregarGrade() {
      const { data: alunoData, error: alunoError } = await supabase
        .from("alunos")
        .select("*")
        .limit(1)
        .maybeSingle();

      let cursoNome = "Tecnologia da Informação";
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
        cursoNome = info.curso;
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
          cargaHoraria: 80,
          creditos: 4,
          status: "Em andamento",
        }));
        setDisciplinas(lista);
      } else {
        setDisciplinas([]);
      }

      await fetchAiGrade(cursoNome, lista);
    }

    void carregarGrade();
  }, []);

  function handleBaixarEmenta() {
    setModalFeedback({
      aberto: true,
      tipo: "sucesso",
      titulo: "Ementa Curricular",
      mensagem:
        "O download da ementa completa do curso em PDF será iniciado em instantes.",
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
              <h1 className="text-2xl font-semibold tracking-tight">
                Grade Curricular
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                Acompanhe seu progresso e o mapa de disciplinas do seu curso.
              </p>
            </div>
            <button
              type="button"
              onClick={handleBaixarEmenta}
              className="flex items-center gap-2 border border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors text-sm rounded-lg px-4 py-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Baixar Ementa (PDF)
            </button>
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
                  ? "Mapeando projeções da grade curricular..."
                  : aiInsight}
              </p>
            </div>
          </div>

          {/* ── Progresso do Curso ── */}
          <div className="p-6 rounded-xl bg-zinc-950 border border-zinc-800 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">Progresso Geral do Curso</h2>
              <span className="text-3xl font-semibold tracking-tight">
                {progresso}%
              </span>
            </div>
            <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${progresso}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-widest">
                  Horas Cursadas
                </p>
                <p className="text-lg font-semibold mt-1">
                  {horasCursadas.toLocaleString("pt-BR")}h
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-widest">
                  Horas Restantes
                </p>
                <p className="text-lg font-semibold mt-1">
                  {horasRestantes.toLocaleString("pt-BR")}h
                </p>
              </div>
            </div>
          </div>

          {/* ── Layout de Colunas: Semestre Atual + Histórico ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Coluna Esquerda (2/3) — Semestre Atual */}
            <div className="lg:col-span-2 rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="text-sm font-semibold">
                  Semestre Atual (4º Semestre)
                </h2>
                <span className="text-xs text-zinc-600">
                  {disciplinas.length} disciplinas
                </span>
              </div>
              <div className="flex flex-col divide-y divide-zinc-800">
                {disciplinas.length === 0 ? (
                  <p className="px-6 py-10 text-sm text-zinc-500 text-center">
                    Nenhuma disciplina em andamento neste semestre.
                  </p>
                ) : (
                  disciplinas.map((d) => (
                    <div
                      key={d.id}
                      className="px-6 py-4 hover:bg-zinc-900/50 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <p className="text-sm font-medium text-white">
                          {d.nome}
                        </p>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-950/60 text-blue-400 border border-blue-800 whitespace-nowrap">
                          Em andamento
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500">
                        Carga Horária: {d.cargaHoraria}h &nbsp;|&nbsp; Créditos:{" "}
                        {d.creditos}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Coluna Direita (1/3) — Histórico e Futuro */}
            <div className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-800">
                <h2 className="text-sm font-semibold">Histórico e Futuro</h2>
              </div>
              <div className="flex flex-col divide-y divide-zinc-800">
                <div className="px-5 py-4 hover:bg-zinc-900/50 transition-colors">
                  <div className="flex items-center gap-3 mb-1.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-900 flex items-center justify-center shrink-0">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white">
                        1º ao 3º Semestre
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-900 whitespace-nowrap">
                      Concluído
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 ml-10">
                    12 disciplinas concluídas
                  </p>
                </div>

                <div className="px-5 py-4 hover:bg-zinc-900/50 transition-colors">
                  <div className="flex items-center gap-3 mb-1.5">
                    <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                      <Lock className="w-3.5 h-3.5 text-zinc-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white">
                        5º ao 8º Semestre
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-800 whitespace-nowrap">
                      Pendente
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 ml-10">
                    16 disciplinas restantes
                  </p>
                </div>
              </div>
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
