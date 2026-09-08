"use client";

import { useEffect, useState } from "react";
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
import { ModalFeedback } from "@/components/ModalFeedback";

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral",    href: "/professor/dashboard",       active: false },
  { icon: BookOpen,        label: "Turmas e Notas", href: "/professor/dashboard/notas", active: true  },
  { icon: UserCheck,       label: "Chamada Rápida", href: "/professor/dashboard/chamada", active: false },
  { icon: Sparkles,        label: "Insights IA",    href: "/professor/dashboard/insights", active: false },
  { icon: MessageSquare,   label: "Mensagens",      href: "/professor/dashboard/mensagens", active: false },
];

type TurmaOption = {
  id: string;
  codigo: string;
  curso: string;
  turno?: string;
  status?: string;
};

type AlunoNota = {
  id: string;
  nome: string;
  ra: string;
  n1: string;
  n2: string;
  media: number | null;
  status: string;
};

type StatusNota = "Aprovado" | "Reprovado" | "Recuperação" | "Pendente";

const statusStyles: Record<StatusNota, string> = {
  Aprovado: "bg-green-950 text-green-400 border-green-900/50",
  Reprovado: "bg-red-950 text-red-400 border-red-900/50",
  Recuperação: "bg-amber-950 text-amber-400 border-amber-900/50",
  Pendente: "bg-zinc-900 text-zinc-400 border-zinc-700/50",
};

function iniciaisDoNome(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .join("");
}

function labelTurma(turma: TurmaOption) {
  return `${turma.curso} - Turma ${turma.codigo} (${turma.turno})`;
}

function parseNota(valor: string): number | null {
  if (valor.trim() === "") return null;
  const num = Number(valor);
  if (Number.isNaN(num)) return null;
  return num;
}

function isNotaValida(valor: string): boolean {
  if (valor.trim() === "") return true;
  const num = Number(valor);
  return !Number.isNaN(num) && num >= 0 && num <= 10;
}

function calcularMediaEStatus(n1: string, n2: string): {
  media: number | null;
  status: StatusNota;
} {
  const nota1 = parseNota(n1);
  const nota2 = parseNota(n2);

  if (nota1 === null || nota2 === null || n1.trim() === "" || n2.trim() === "") {
    return { media: null, status: "Pendente" };
  }

  const media = Number((nota1 * 0.4 + nota2 * 0.6).toFixed(1));

  if (media >= 7.0) return { media, status: "Aprovado" };
  if (media >= 5.0) return { media, status: "Recuperação" };
  return { media, status: "Reprovado" };
}

export default function ProfessorNotasPage() {
  const [turmas, setTurmas] = useState<TurmaOption[]>([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState("");
  const [alunos, setAlunos] = useState<AlunoNota[]>([]);
  const [aiInsight, setAiInsight] = useState("");
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [modalFeedback, setModalFeedback] = useState<{
    aberto: boolean;
    tipo: "sucesso" | "erro" | "atencao";
    titulo: string;
    mensagem: string;
  }>({ aberto: false, tipo: "sucesso", titulo: "", mensagem: "" });

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

  async function fetchAiTurmaInsight(turmaId: string) {
    setIsLoadingAi(true);
    try {
      const turma = turmas.find((t) => t.id === turmaId);
      const context = turma
        ? `Turma ${labelTurma(turma)}`
        : `Turma ${turmaId}`;

      const response = await fetch("/api/insights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          context,
          turmasAtivas: 1,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha na requisição da IA");
      setAiInsight((data.insight as string) ?? "");
    } catch (err) {
      console.error("Erro ao gerar insight da turma:", err);
      setAiInsight(
        "Não foi possível gerar a análise da turma no momento. Tente novamente."
      );
    } finally {
      setIsLoadingAi(false);
    }
  }

  function handleNotaChange(alunoId: string, campo: "n1" | "n2", valor: string) {
    if (!isNotaValida(valor)) return;

    setAlunos((prev) =>
      prev.map((aluno) => {
        if (aluno.id !== alunoId) return aluno;

        const atualizado = {
          ...aluno,
          [campo]: valor,
        };
        const { media, status } = calcularMediaEStatus(
          atualizado.n1,
          atualizado.n2
        );

        return { ...atualizado, media, status };
      })
    );
  }

  function handleSalvarRascunho() {
    mostrarFeedback(
      "sucesso",
      "Rascunho salvo",
      "Rascunho das notas salvo com sucesso!"
    );
  }

  function handlePublicarNotas() {
    if (alunos.length === 0) {
      mostrarFeedback(
        "atencao",
        "Pendências encontradas",
        "Preencha todas as notas antes de publicar."
      );
      return;
    }

    const incompletos = alunos.some(
      (aluno) => aluno.n1.trim() === "" || aluno.n2.trim() === ""
    );

    if (incompletos) {
      mostrarFeedback(
        "atencao",
        "Pendências encontradas",
        "Preencha todas as notas antes de publicar."
      );
      return;
    }

    mostrarFeedback(
      "sucesso",
      "Notas publicadas",
      "Notas publicadas com sucesso para a turma!"
    );
  }

  useEffect(() => {
    async function fetchTurmas() {
      const { data, error } = await supabase
        .from("turmas")
        .select("id, codigo, curso, turno")
        .eq("status", "Aberta")
        .order("curso", { ascending: true });

      if (error) {
        console.error("Erro ao buscar turmas:", error.message);
        setTurmas([]);
        setTurmaSelecionada("");
        return;
      }

      const lista = (data ?? []) as TurmaOption[];
      setTurmas(lista);
      if (lista.length > 0) {
        setTurmaSelecionada(lista[0].id);
      }
    }

    void fetchTurmas();
  }, []);

  useEffect(() => {
    if (!turmaSelecionada) {
      setAlunos([]);
      return;
    }

    async function fetchAlunosDaTurma() {
      const { data, error } = await supabase
        .from("alunos")
        .select("id, nome, ra")
        .order("nome", { ascending: true });

      if (error) {
        console.error("Erro ao buscar alunos:", error.message);
        setAlunos([]);
        return;
      }

      const mapeados: AlunoNota[] = (data ?? []).map((aluno) => ({
        id: String(aluno.id),
        nome: String(aluno.nome ?? ""),
        ra: String(
          aluno.ra ||
            (aluno as { matricula?: string }).matricula ||
            "RA-"
        ),
        n1: "",
        n2: "",
        media: null,
        status: "Pendente",
      }));

      setAlunos(mapeados);
      await fetchAiTurmaInsight(turmaSelecionada);
    }

    void fetchAlunosDaTurma();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turmaSelecionada]);

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
                RL
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">Prof. Roberto Lima</p>
                <p className="text-xs text-zinc-500">Dep. de Tecnologia</p>
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
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                Lançamento de Notas
              </h1>
              <div className="mt-3 relative inline-block">
                <select
                  value={turmaSelecionada}
                  onChange={(e) => setTurmaSelecionada(e.target.value)}
                  className="appearance-none bg-zinc-950 border border-zinc-700 text-sm text-white font-medium rounded-lg pl-4 pr-10 py-2.5 focus:outline-none focus:ring-1 focus:ring-zinc-500 cursor-pointer hover:border-zinc-600 transition-colors min-w-[280px]"
                >
                  {turmas.length === 0 ? (
                    <option value="">Nenhuma turma ativa</option>
                  ) : (
                    turmas.map((turma) => (
                      <option key={turma.id} value={turma.id}>
                        {labelTurma(turma)}
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={handleSalvarRascunho}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-zinc-700 text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors"
              >
                Salvar Rascunho
              </button>
              <button
                type="button"
                onClick={handlePublicarNotas}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-black hover:bg-zinc-200 transition-colors"
              >
                Publicar Notas
              </button>
            </div>
          </div>

          {/* AI Insight Card */}
          <div className="mb-8 rounded-xl bg-zinc-950 border border-indigo-900/50 p-5 flex gap-4">
            <div className="w-9 h-9 rounded-lg bg-indigo-950/60 border border-indigo-900/50 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-indigo-300" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-widest text-indigo-300/80 mb-1.5">
                Análise da Turma
              </p>
              <p className={`text-sm text-zinc-300 leading-relaxed ${isLoadingAi ? "animate-pulse text-zinc-400" : ""}`}>
                {isLoadingAi ? "Analisando desempenho da turma..." : aiInsight}
              </p>
            </div>
          </div>

          {/* Grade de Notas */}
          <div className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="px-6 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest">
                      Aluno
                    </th>
                    <th className="px-4 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest text-center">
                      N1 (Peso 4)
                    </th>
                    <th className="px-4 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest text-center">
                      N2 (Peso 6)
                    </th>
                    <th className="px-4 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest text-center">
                      Média Final
                    </th>
                    <th className="px-6 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest text-center">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {alunos.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-10 text-center text-sm text-zinc-500"
                      >
                        Nenhum aluno matriculado nesta turma
                      </td>
                    </tr>
                  ) : (
                    alunos.map((aluno) => (
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
                              <p className="text-sm font-medium text-white truncate">
                                {aluno.nome}
                              </p>
                              <p className="text-xs text-zinc-500">RA {aluno.ra}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <input
                            type="number"
                            min={0}
                            max={10}
                            step={0.1}
                            value={aluno.n1}
                            onChange={(e) =>
                              handleNotaChange(aluno.id, "n1", e.target.value)
                            }
                            className="w-16 h-8 mx-auto block bg-zinc-900 border border-zinc-800 rounded-md text-sm text-white text-center focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </td>
                        <td className="px-4 py-4 text-center">
                          <input
                            type="number"
                            min={0}
                            max={10}
                            step={0.1}
                            value={aluno.n2}
                            onChange={(e) =>
                              handleNotaChange(aluno.id, "n2", e.target.value)
                            }
                            className="w-16 h-8 mx-auto block bg-zinc-900 border border-zinc-800 rounded-md text-sm text-white text-center focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="text-base font-semibold tracking-tight text-white">
                            {aluno.media !== null ? aluno.media.toFixed(1) : "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${
                              statusStyles[aluno.status as StatusNota] ??
                              statusStyles.Pendente
                            }`}
                          >
                            {aluno.status}
                          </span>
                        </td>
                      </tr>
                    ))
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
