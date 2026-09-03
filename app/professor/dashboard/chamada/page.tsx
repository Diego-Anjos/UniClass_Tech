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
  AlertTriangle,
  Check,
  X,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral",    href: "/professor/dashboard",          active: false },
  { icon: BookOpen,        label: "Turmas e Notas", href: "/professor/dashboard/notas",    active: false },
  { icon: UserCheck,       label: "Chamada Rápida", href: "/professor/dashboard/chamada",  active: true  },
  { icon: Sparkles,        label: "Insights IA",    href: "/professor/dashboard/insights",  active: false },
  { icon: MessageSquare,   label: "Mensagens",      href: "/professor/dashboard/mensagens", active: false },
];

const alunos = [
  {
    iniciais: "JS",
    nome: "João Silva",
    ra: "2024001",
    frequencia: "10% de faltas",
    alerta: false,
    presente: true,
  },
  {
    iniciais: "CS",
    nome: "Carlos Souza",
    ra: "2024003",
    frequencia: "23% de faltas",
    alerta: true,
    presente: true,
  },
  {
    iniciais: "MO",
    nome: "Maria Oliveira",
    ra: "2024002",
    frequencia: "8% de faltas",
    alerta: false,
    presente: true,
  },
  {
    iniciais: "AF",
    nome: "Ana Ferreira",
    ra: "2024004",
    frequencia: "24% de faltas",
    alerta: true,
    presente: false,
  },
];

export default function ProfessorChamadaPage() {
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

          {/* Header de Contexto */}
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                Chamada Rápida
              </h1>
              <div className="mt-3 flex flex-col sm:flex-row gap-3">
                <div className="relative inline-block">
                  <select
                    defaultValue="bd-4"
                    className="appearance-none bg-zinc-950 border border-zinc-700 text-sm text-white font-medium rounded-lg pl-4 pr-10 py-2.5 focus:outline-none focus:ring-1 focus:ring-zinc-500 cursor-pointer hover:border-zinc-600 transition-colors"
                  >
                    <option value="bd-4">Banco de Dados - 4º Semestre</option>
                    <option value="es-3">Engenharia de Software - 3º Semestre</option>
                    <option value="alg-2">Algoritmos - 2º Semestre</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                </div>
                <div className="relative inline-block">
                  <select
                    defaultValue="hoje"
                    className="appearance-none bg-zinc-950 border border-zinc-700 text-sm text-white font-medium rounded-lg pl-4 pr-10 py-2.5 focus:outline-none focus:ring-1 focus:ring-zinc-500 cursor-pointer hover:border-zinc-600 transition-colors"
                  >
                    <option value="hoje">Data: Hoje (03/09/2026)</option>
                    <option value="02">Data: 02/09/2026</option>
                    <option value="01">Data: 01/09/2026</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                </div>
              </div>
            </div>

            <button
              type="button"
              className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-black hover:bg-zinc-200 transition-colors shrink-0 self-start lg:self-auto"
            >
              Salvar Chamada
            </button>
          </div>

          {/* AI Insight Card */}
          <div className="mb-4 rounded-xl bg-zinc-950 border border-orange-900/50 p-5 flex gap-4">
            <div className="w-9 h-9 rounded-lg bg-orange-950/60 border border-orange-900/50 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-orange-300" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-widest text-orange-300/80 mb-1.5">
                Alerta de Frequência
              </p>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Atenção: 2 alunos nesta turma estão prestes a estourar o limite de 25% de faltas. Eles estão destacados na lista abaixo.
              </p>
            </div>
          </div>

          {/* Barra de Resumo */}
          <div className="mb-8 px-4 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 tracking-wide">
            Total de Alunos: <span className="text-white font-medium">40</span>
            <span className="mx-2 text-zinc-700">|</span>
            Presentes: <span className="text-green-400 font-medium">38</span>
            <span className="mx-2 text-zinc-700">|</span>
            Faltas: <span className="text-red-400 font-medium">2</span>
          </div>

          {/* Lista de Alunos */}
          <div className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
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
                  {alunos.map((aluno) => (
                    <tr
                      key={aluno.ra}
                      className="border-b border-zinc-800 last:border-b-0 hover:bg-zinc-900/40 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-semibold text-white shrink-0">
                            {aluno.iniciais}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate flex items-center gap-1.5">
                              {aluno.nome}
                              {aluno.alerta && (
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              )}
                            </p>
                            <p className="text-xs text-zinc-500">RA {aluno.ra}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`text-sm ${
                            aluno.alerta ? "text-red-400 font-medium" : "text-zinc-400"
                          }`}
                        >
                          {aluno.frequencia}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end">
                          <div className="inline-flex rounded-lg overflow-hidden border border-zinc-800">
                            <button
                              type="button"
                              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                                aluno.presente
                                  ? "bg-green-900/40 text-green-500"
                                  : "bg-zinc-950 text-zinc-500 hover:text-zinc-300"
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                              Presente
                            </button>
                            <button
                              type="button"
                              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-l border-zinc-800 transition-colors ${
                                !aluno.presente
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
