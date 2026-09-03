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
  ChevronDown,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral",    href: "/professor/dashboard",           active: false },
  { icon: BookOpen,        label: "Turmas e Notas", href: "/professor/dashboard/notas",     active: false },
  { icon: UserCheck,       label: "Chamada Rápida", href: "/professor/dashboard/chamada",   active: false },
  { icon: Sparkles,        label: "Insights IA",    href: "/professor/dashboard/insights",  active: true  },
  { icon: MessageSquare,   label: "Mensagens",      href: "/professor/dashboard/mensagens",  active: false },
];

const disciplinas = [
  { label: "BD",         altura: "h-32", cor: "bg-white" },
  { label: "Eng. Soft",  altura: "h-40", cor: "bg-zinc-200" },
  { label: "Algoritmos", altura: "h-16", cor: "bg-red-500/80" },
  { label: "Cálculo",    altura: "h-24", cor: "bg-white" },
];

const alunosRisco = [
  {
    iniciais: "CS",
    nome: "Carlos Souza",
    ra: "2024003",
    badge: "Risco Alto: Faltas",
    badgeClass: "bg-red-950 text-red-400 border-red-900/50",
  },
  {
    iniciais: "AF",
    nome: "Ana Ferreira",
    ra: "2024004",
    badge: "Risco Médio: Notas N1",
    badgeClass: "bg-amber-950 text-amber-400 border-amber-900/50",
  },
  {
    iniciais: "PM",
    nome: "Pedro Mendes",
    ra: "2024012",
    badge: "Queda de Engajamento",
    badgeClass: "bg-zinc-800 text-zinc-300 border-zinc-700/50",
  },
];

export default function ProfessorInsightsPage() {
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
                defaultValue="todas"
                className="appearance-none bg-zinc-950 border border-zinc-700 text-sm text-white font-medium rounded-lg pl-4 pr-10 py-2.5 focus:outline-none focus:ring-1 focus:ring-zinc-500 cursor-pointer hover:border-zinc-600 transition-colors"
              >
                <option value="todas">Visão Geral (Todas as Turmas)</option>
                <option value="bd">Banco de Dados - 4º Semestre</option>
                <option value="es">Engenharia de Software - 3º Semestre</option>
                <option value="alg">Algoritmos - 2º Semestre</option>
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
              <p className="text-sm text-zinc-300 leading-relaxed">
                A tendência geral de aprovação subiu para 82%. No entanto, identificamos um padrão de queda de rendimento na disciplina de &apos;Algoritmos&apos;. Recomendamos antecipar a revisão da N2.
              </p>
            </div>
          </div>

          {/* Grid: Gráfico + Riscos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Desempenho por Disciplina */}
            <div className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-800">
                <h2 className="text-sm font-semibold text-white">
                  Desempenho por Disciplina (Mockup de Gráfico)
                </h2>
              </div>
              <div className="p-6">
                <div className="flex items-end justify-around gap-4 h-48 border-b border-zinc-800">
                  {disciplinas.map((item) => (
                    <div key={item.label} className="flex flex-col items-center gap-2">
                      <div className={`w-8 ${item.altura} ${item.cor} rounded-t-md`} />
                    </div>
                  ))}
                </div>
                <div className="flex justify-around gap-4 mt-3">
                  {disciplinas.map((item) => (
                    <span
                      key={item.label}
                      className={`w-8 text-center text-[11px] ${
                        item.label === "Algoritmos" ? "text-red-400" : "text-zinc-500"
                      }`}
                    >
                      {item.label}
                    </span>
                  ))}
                </div>
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
                {alunosRisco.map((aluno) => (
                  <div
                    key={aluno.ra}
                    className="flex items-center justify-between gap-3 px-6 py-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-semibold text-white shrink-0">
                        {aluno.iniciais}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{aluno.nome}</p>
                        <p className="text-xs text-zinc-500">RA {aluno.ra}</p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border shrink-0 ${aluno.badgeClass}`}
                    >
                      {aluno.badge}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
