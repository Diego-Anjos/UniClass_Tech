"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  ClipboardList,
  CalendarCheck,
  BookOpen,
  Map,
  LogOut,
  Camera,
  GraduationCap,
  Settings,
  MessageSquare,
  Headphones,
  User,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral",         href: "/aluno/dashboard",            active: false },
  { icon: ClipboardList,   label: "Boletim e Notas",     href: "/aluno/dashboard/notas",      active: false },
  { icon: CalendarCheck,   label: "Frequência",           href: "/aluno/dashboard/frequencia", active: false },
  { icon: BookOpen,        label: "Grade e Matérias",     href: "/aluno/dashboard/grade",      active: false },
  { icon: Map,             label: "Mapa de Salas e Labs", href: "/aluno/dashboard/mapa",       active: false },
  { icon: MessageSquare,   label: "Contato",              href: "/aluno/dashboard/contato",    active: true  },
];

const inputClass =
  "w-full bg-black border border-zinc-800 rounded-md text-sm text-white px-3 py-2.5 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors";

export default function AlunoContatoPage() {
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
                  JS
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-zinc-700 border border-zinc-900 rounded-full flex items-center justify-center cursor-pointer hover:bg-zinc-600 transition-colors">
                  <Camera className="w-2.5 h-2.5 text-zinc-300" />
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">João Silva</p>
                <p className="text-xs text-zinc-500">RA: 12345678</p>
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
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">Central de Atendimento</h1>
            <p className="text-sm text-zinc-400 mt-1">
              Precisa de ajuda? Fale com o suporte institucional ou diretamente com seus professores.
            </p>
          </div>

          {/* ── Grid de 2 colunas ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Coluna Esquerda: Suporte / Secretaria */}
            <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/50 flex items-center justify-center shrink-0">
                  <Headphones className="w-4 h-4 text-zinc-300" />
                </div>
                <h2 className="text-sm font-semibold">Suporte / Secretaria</h2>
              </div>
              <p className="text-sm text-zinc-400 mb-6">
                Para dúvidas financeiras, documentos, matrículas ou problemas técnicos.
              </p>

              <form
                className="flex flex-col gap-4"
                onSubmit={(e) => e.preventDefault()}
              >
                <div>
                  <label htmlFor="assunto-suporte" className="block text-xs text-zinc-500 uppercase tracking-widest mb-1.5">
                    Assunto
                  </label>
                  <select id="assunto-suporte" name="assunto" className={inputClass} defaultValue="">
                    <option value="" disabled>Selecione o assunto</option>
                    <option value="financeiro">Financeiro</option>
                    <option value="documentos">Documentos</option>
                    <option value="tecnico">Problema Técnico</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="mensagem-suporte" className="block text-xs text-zinc-500 uppercase tracking-widest mb-1.5">
                    Sua mensagem
                  </label>
                  <textarea
                    id="mensagem-suporte"
                    name="mensagem"
                    placeholder="Descreva sua solicitação..."
                    className={`${inputClass} min-h-[120px] resize-y`}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-white text-black text-sm font-medium rounded-md py-2.5 hover:bg-zinc-200 transition-colors"
                >
                  Enviar para Suporte
                </button>
              </form>
            </div>

            {/* Coluna Direita: Falar com Professor */}
            <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/50 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-zinc-300" />
                </div>
                <h2 className="text-sm font-semibold">Falar com Professor</h2>
              </div>
              <p className="text-sm text-zinc-400 mb-6">
                Para dúvidas sobre matérias, notas, faltas ou trabalhos.
              </p>

              <form
                className="flex flex-col gap-4"
                onSubmit={(e) => e.preventDefault()}
              >
                <div>
                  <label htmlFor="disciplina-professor" className="block text-xs text-zinc-500 uppercase tracking-widest mb-1.5">
                    Selecione a Disciplina/Professor
                  </label>
                  <select id="disciplina-professor" name="disciplina" className={inputClass} defaultValue="">
                    <option value="" disabled>Selecione a disciplina</option>
                    <option value="bd-lima">Banco de Dados - Prof. Lima</option>
                    <option value="es-souza">Engenharia de Software - Prof. Souza</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="assunto-professor" className="block text-xs text-zinc-500 uppercase tracking-widest mb-1.5">
                    Assunto da Mensagem
                  </label>
                  <input
                    id="assunto-professor"
                    name="assunto"
                    type="text"
                    placeholder="Ex.: Dúvida sobre a prova"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="mensagem-professor" className="block text-xs text-zinc-500 uppercase tracking-widest mb-1.5">
                    Sua mensagem
                  </label>
                  <textarea
                    id="mensagem-professor"
                    name="mensagem"
                    placeholder="Escreva sua mensagem..."
                    className={`${inputClass} min-h-[120px] resize-y`}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-white text-black text-sm font-medium rounded-md py-2.5 hover:bg-zinc-200 transition-colors"
                >
                  Enviar para Professor
                </button>
              </form>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
