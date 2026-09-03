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
  Search,
  Send,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral",    href: "/professor/dashboard",            active: false },
  { icon: BookOpen,        label: "Turmas e Notas", href: "/professor/dashboard/notas",      active: false },
  { icon: UserCheck,       label: "Chamada Rápida", href: "/professor/dashboard/chamada",    active: false },
  { icon: Sparkles,        label: "Insights IA",    href: "/professor/dashboard/insights",   active: false },
  { icon: MessageSquare,   label: "Mensagens",      href: "/professor/dashboard/mensagens",  active: true  },
];

const mensagens = [
  {
    iniciais: "JS",
    nome: "João Silva",
    assunto: "Dúvida sobre a nota da N1",
    tempo: "Há 2 horas",
    ativa: true,
    naoLida: true,
  },
  {
    iniciais: "MO",
    nome: "Maria Oliveira",
    assunto: "Justificativa de falta",
    tempo: "Há 1 dia",
    ativa: false,
    naoLida: false,
  },
  {
    iniciais: "CS",
    nome: "Carlos Souza",
    assunto: "Material complementar",
    tempo: "Há 2 dias",
    ativa: false,
    naoLida: false,
  },
];

export default function ProfessorMensagensPage() {
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
      <main className="flex-1 min-w-0 overflow-hidden bg-black flex flex-col">
        <div className="flex-1 min-h-0 flex flex-col p-8 max-w-6xl mx-auto w-full">

          {/* Header */}
          <div className="mb-6 shrink-0">
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Caixa de Entrada
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Gerencie e responda as dúvidas e solicitações dos seus alunos.
            </p>
          </div>

          {/* Split pane */}
          <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">

            {/* Lista de Mensagens */}
            <div className="w-full md:w-1/3 border-r border-zinc-800 pr-4 flex flex-col min-h-0 overflow-hidden">
              <div className="relative mb-4 shrink-0">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Buscar aluno ou assunto..."
                  className="w-full h-9 bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                />
              </div>

              <div className="flex-1 overflow-y-auto flex flex-col gap-2 pb-2">
                {mensagens.map((msg) => (
                  <button
                    key={msg.nome}
                    type="button"
                    className={`w-full text-left rounded-lg border p-3.5 transition-colors ${
                      msg.ativa
                        ? "bg-zinc-900 border-zinc-700"
                        : "bg-transparent border-transparent hover:bg-zinc-900/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-medium text-white truncate">{msg.nome}</p>
                      <span className="text-[11px] text-zinc-500 shrink-0">{msg.tempo}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className={`text-xs truncate ${msg.naoLida ? "text-zinc-200" : "text-zinc-500"}`}>
                        {msg.assunto}
                      </p>
                      {msg.naoLida && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Detalhe e Resposta */}
            <div className="w-full md:w-2/3 pl-0 md:pl-4 pt-6 md:pt-0 flex flex-col gap-4 min-h-0 overflow-hidden">
              <div className="border-b border-zinc-800 pb-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-semibold text-white shrink-0">
                    JS
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white">João Silva</p>
                    <p className="text-xs text-zinc-500">
                      RA 12345678 · Turma Banco de Dados
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-950/30 border border-indigo-900/50 rounded-md p-3 flex gap-3 shrink-0">
                <Sparkles className="w-4 h-4 text-indigo-300 shrink-0 mt-0.5" />
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Contexto IA: João tirou 7.5 na N1, entregou todas as atividades contínuas e possui 100% de presença.
                </p>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0">
                <div className="bg-zinc-900 rounded-lg p-4">
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    Olá professor, notei que a minha nota da N1 no sistema está como 7.5, mas no trabalho prático eu havia tirado nota máxima. Poderia verificar se houve algum erro de digitação?
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex flex-col gap-3">
                <textarea
                  rows={3}
                  placeholder="Escreva sua resposta para João..."
                  className="w-full resize-none bg-black border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white text-black hover:bg-zinc-200 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    Enviar Resposta
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
