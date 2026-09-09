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
  Users,
  LineChart,
  AlertTriangle,
  Square,
  Clock,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ProfessorSettingsControl } from "@/components/professor/config-modal";
import {
  iniciaisDoProfessor,
  limparSessaoProfessor,
  useProfessorSession,
} from "@/lib/professor-session";

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral",    href: "/professor/dashboard",       active: true  },
  { icon: BookOpen,        label: "Turmas e Notas", href: "/professor/dashboard/notas", active: false },
  { icon: UserCheck,       label: "Chamada Rápida", href: "/professor/dashboard/chamada", active: false },
  { icon: Sparkles,        label: "Insights IA",    href: "/professor/dashboard/insights", active: false },
  { icon: MessageSquare,   label: "Mensagens",      href: "/professor/dashboard/mensagens", active: false },
];

export default function ProfessorDashboardPage() {
  const { professorLogado, carregandoSessao } = useProfessorSession();
  const [turmasAtivas, setTurmasAtivas] = useState(0);
  const [aiInsight, setAiInsight] = useState("");
  const [isLoadingAi, setIsLoadingAi] = useState(true);
  const [mediaGlobal, setMediaGlobal] = useState<number | null>(null);
  const [alunosRisco, setAlunosRisco] = useState<number>(0);
  const [agenda, setAgenda] = useState<any[]>([]);
  const [pendencias, setPendencias] = useState<any[]>([]);

  async function fetchAiInsight(turmasAtivas: number, nomeContexto: string) {
    setIsLoadingAi(true);
    try {
      const response = await fetch("/api/insights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          context: nomeContexto || "Professor",
          turmasAtivas,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha na requisição da IA");
      setAiInsight((data.insight as string) ?? "");
    } catch (err) {
      console.error("Erro ao gerar insight:", err);
      setAiInsight(
        "Não foi possível gerar a análise no momento. Tente novamente."
      );
    } finally {
      setIsLoadingAi(false);
    }
  }

  useEffect(() => {
    if (!professorLogado) return;

    async function fetchDadosBase() {
      const { count, error } = await supabase
        .from("turmas")
        .select("*", { count: "exact", head: true })
        .eq("status", "Aberta");

      const nomeContexto =
        professorLogado!.nomeCompletoTitulo || professorLogado!.nome;

      if (error) {
        console.error("Erro ao buscar turmas ativas:", error.message);
        setTurmasAtivas(0);
        await fetchAiInsight(0, nomeContexto);
        return;
      }

      const total = count ?? 0;
      setTurmasAtivas(total);
      await fetchAiInsight(total, nomeContexto);
    }

    void fetchDadosBase();
  }, [professorLogado]);

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
  const primeiroNome =
    professorLogado.nome?.split(" ").filter(Boolean)[0] ||
    professorLogado.nomeCompletoTitulo.split(" ").filter(Boolean).slice(-1)[0] ||
    "Professor";

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
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Bom dia, {primeiroNome}!
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Aqui está o resumo das suas turmas e pendências de hoje.
            </p>
          </div>

          {/* AI Insight */}
          <div className="mb-8 rounded-xl bg-zinc-950 border border-indigo-900/50 p-5 flex gap-4">
            <div className="w-9 h-9 rounded-lg bg-indigo-950/60 border border-indigo-900/50 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-indigo-300" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-widest text-indigo-300/80 mb-1.5">
                Assistente do Professor
              </p>
              {isLoadingAi ? (
                <p className="text-sm text-zinc-400 leading-relaxed animate-pulse">
                  A Inteligência Artificial está analisando suas turmas...
                </p>
              ) : (
                <p className="text-sm text-zinc-300 leading-relaxed">{aiInsight}</p>
              )}
            </div>
          </div>

          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="p-6 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-500 uppercase tracking-widest">Turmas Ativas</p>
                <Users className="w-4 h-4 text-zinc-600" />
              </div>
              <p className="text-4xl font-semibold tracking-tight text-white">{turmasAtivas}</p>
              <p className="text-xs text-zinc-400">Disciplinas neste semestre</p>
            </div>

            <div className="p-6 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-500 uppercase tracking-widest">Média Global (Suas Turmas)</p>
                <LineChart className="w-4 h-4 text-zinc-600" />
              </div>
              <p className="text-4xl font-semibold tracking-tight text-white">
                {mediaGlobal !== null ? mediaGlobal.toFixed(1) : "—"}
              </p>
              <p className="text-xs text-zinc-400">Média ponderada das turmas</p>
            </div>

            <div className="p-6 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-500 uppercase tracking-widest">Alunos em Risco</p>
                <AlertTriangle className="w-4 h-4 text-amber-500/80" />
              </div>
              <p className="text-4xl font-semibold tracking-tight text-white">{alunosRisco}</p>
              <p className="text-xs text-amber-500/70">Reprovação por falta ou nota</p>
            </div>
          </div>

          {/* Agenda + Pendências */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            <div className="lg:col-span-2 rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Agenda de Hoje</h2>
                <span className="text-xs text-zinc-500">Quinta-feira, 3 set</span>
              </div>
              <div className="p-4 flex flex-col gap-3">
                {agenda.length === 0 ? (
                  <p className="text-sm text-zinc-500 px-1 py-2">Nenhum compromisso na agenda.</p>
                ) : (
                  agenda.map((item) => (
                    <div
                      key={`${item.horario}-${item.titulo}`}
                      className="flex items-start gap-4 rounded-lg border border-zinc-800 bg-black/40 px-4 py-3.5 hover:bg-zinc-900/50 transition-colors"
                    >
                      <div className="flex items-center gap-1.5 shrink-0 mt-0.5 text-xs font-medium text-zinc-500 w-14">
                        <Clock className="w-3.5 h-3.5" />
                        {item.horario}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white">{item.titulo}</p>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {item.local}
                          {item.extra ? ` · ${item.extra}` : ""}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-800">
                <h2 className="text-sm font-semibold text-white">Pendências &amp; Lembretes</h2>
              </div>
              <div className="flex flex-col divide-y divide-zinc-800">
                {pendencias.length === 0 ? (
                  <p className="text-sm text-zinc-500 px-5 py-4">Nenhuma pendência no momento.</p>
                ) : (
                  pendencias.map((tarefa) => (
                    <button
                      key={typeof tarefa === "string" ? tarefa : tarefa.id ?? tarefa.titulo}
                      type="button"
                      className="flex items-start gap-3 px-5 py-4 text-left hover:bg-zinc-900/50 transition-colors w-full"
                    >
                      <Square className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-zinc-300 leading-relaxed">
                        {typeof tarefa === "string" ? tarefa : tarefa.titulo}
                      </span>
                    </button>
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
