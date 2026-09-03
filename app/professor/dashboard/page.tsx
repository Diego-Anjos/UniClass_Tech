"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  BookOpen,
  UserCheck,
  Sparkles,
  MessageSquare,
  LogOut,
  GraduationCap,
  Settings,
  Users,
  LineChart,
  AlertTriangle,
  Square,
  Clock,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral",    href: "/professor/dashboard",       active: true  },
  { icon: BookOpen,        label: "Turmas e Notas", href: "/professor/dashboard/notas", active: false },
  { icon: UserCheck,       label: "Chamada Rápida", href: "/professor/dashboard/chamada", active: false },
  { icon: Sparkles,        label: "Insights IA",    href: "/professor/dashboard/insights", active: false },
  { icon: MessageSquare,   label: "Mensagens",      href: "/professor/dashboard/mensagens", active: false },
];

const agendaHoje = [
  { horario: "08:00", titulo: "Banco de Dados",        local: "Lab 3",                   extra: "45 alunos" },
  { horario: "10:20", titulo: "Orientação de TCC",     local: "Sala dos Professores",    extra: null },
  { horario: "13:30", titulo: "Engenharia de Software", local: "Sala 204 – Prédio A",    extra: "28 alunos" },
];

const pendencias = [
  "Lançar notas N1 de Algoritmos",
  "Responder 3 mensagens não lidas",
  "Fechar chamada de Banco de Dados",
  "Revisar alerta de alunos em risco",
];

export default function ProfessorDashboardPage() {
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
            <Link href="#" className="text-zinc-500 hover:text-white transition-colors shrink-0">
              <Settings className="w-4 h-4" />
            </Link>
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

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-white">Bom dia, Roberto!</h1>
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
              <p className="text-sm text-zinc-300 leading-relaxed">
                Análise da IA: 5 alunos da turma de &apos;Banco de Dados&apos; estão com risco de reprovação por falta. Sugerimos enviar um alerta. A média global da turma de &apos;Engenharia de Software&apos; subiu 12%.
              </p>
            </div>
          </div>

          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="p-6 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-500 uppercase tracking-widest">Turmas Ativas</p>
                <Users className="w-4 h-4 text-zinc-600" />
              </div>
              <p className="text-4xl font-semibold tracking-tight text-white">4</p>
              <p className="text-xs text-zinc-400">Disciplinas neste semestre</p>
            </div>

            <div className="p-6 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-500 uppercase tracking-widest">Média Global (Suas Turmas)</p>
                <LineChart className="w-4 h-4 text-zinc-600" />
              </div>
              <p className="text-4xl font-semibold tracking-tight text-white">7.8</p>
              <p className="text-xs text-zinc-400">Média ponderada das turmas</p>
            </div>

            <div className="p-6 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-500 uppercase tracking-widest">Alunos em Risco</p>
                <AlertTriangle className="w-4 h-4 text-amber-500/80" />
              </div>
              <p className="text-4xl font-semibold tracking-tight text-white">8</p>
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
                {agendaHoje.map((item) => (
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
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-800">
                <h2 className="text-sm font-semibold text-white">Pendências &amp; Lembretes</h2>
              </div>
              <div className="flex flex-col divide-y divide-zinc-800">
                {pendencias.map((tarefa) => (
                  <button
                    key={tarefa}
                    type="button"
                    className="flex items-start gap-3 px-5 py-4 text-left hover:bg-zinc-900/50 transition-colors w-full"
                  >
                    <Square className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                    <span className="text-sm text-zinc-300 leading-relaxed">{tarefa}</span>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
