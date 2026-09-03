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
  Download,
  Sparkles,
  GraduationCap,
  MessageSquare,
  Settings,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral",         href: "/aluno/dashboard",        active: false },
  { icon: ClipboardList,   label: "Boletim e Notas",     href: "/aluno/dashboard/notas",  active: true  },
  { icon: CalendarCheck,   label: "Frequência",           href: "/aluno/dashboard/frequencia",                       active: false },
  { icon: BookOpen,        label: "Grade e Matérias",     href: "/aluno/dashboard/grade",                       active: false },
  { icon: Map,             label: "Mapa de Salas e Labs", href: "/aluno/dashboard/mapa",                       active: false },
  { icon: MessageSquare,   label: "Contato",              href: "/aluno/dashboard/contato",    active: false },
];

const disciplinas = [
  {
    nome: "Banco de Dados",
    n1: 7.5,
    n2: null,
    atividades: 8.0,
    media: null,
    faltas: 4,
    status: "cursando",
  },
  {
    nome: "Engenharia de Software",
    n1: 9.0,
    n2: 9.5,
    atividades: 9.0,
    media: 9.2,
    faltas: 0,
    status: "aprovado",
  },
  {
    nome: "Algoritmos Avançados",
    n1: 6.0,
    n2: 7.5,
    atividades: 7.0,
    media: 6.8,
    faltas: 6,
    status: "aprovado",
  },
  {
    nome: "Cálculo II",
    n1: 5.0,
    n2: null,
    atividades: 6.5,
    media: null,
    faltas: 8,
    status: "cursando",
  },
];

const statusConfig: Record<string, { label: string; classes: string }> = {
  aprovado:  { label: "Aprovado",  classes: "bg-emerald-950 text-emerald-400 border border-emerald-900" },
  cursando:  { label: "Cursando",  classes: "bg-yellow-950 text-yellow-400 border border-yellow-900"   },
  reprovado: { label: "Reprovado", classes: "bg-red-950 text-red-400 border border-red-900"             },
};

function fmt(val: number | null) {
  return val !== null ? val.toFixed(1) : <span className="text-zinc-700">—</span>;
}

export default function AlunoNotasPage() {
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
                Curso: Análise e Desenvolvimento de Sistemas
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Dropdown semestre */}
              <select className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-zinc-600 transition-colors cursor-pointer">
                <option>4º Semestre (Atual)</option>
                <option>3º Semestre</option>
                <option>2º Semestre</option>
                <option>1º Semestre</option>
              </select>
              {/* Botão PDF */}
              <button className="flex items-center gap-2 border border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors text-sm rounded-lg px-4 py-2">
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
              <p className="text-sm text-zinc-300 leading-relaxed">
                Sua performance em{" "}
                <span className="text-white font-medium">Engenharia de Software</span> está
                excelente. Foco na N2 de{" "}
                <span className="text-white font-medium">Banco de Dados</span>: você precisa de
                no mínimo <span className="text-yellow-400 font-medium">6.0</span> para aprovação
                direta.
              </p>
            </div>
          </div>

          {/* ── Tabela de Notas ── */}
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Notas do Semestre</h2>
              <span className="text-xs text-zinc-600">{disciplinas.length} disciplinas</span>
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
                  {disciplinas.map((d) => {
                    const s = statusConfig[d.status];
                    return (
                      <tr key={d.nome} className="hover:bg-zinc-900/40 transition-colors">
                        <td className="px-6 py-4 font-medium text-white">{d.nome}</td>
                        <td className="px-4 py-4 text-center text-zinc-300">{fmt(d.n1)}</td>
                        <td className="px-4 py-4 text-center text-zinc-300">{fmt(d.n2)}</td>
                        <td className="px-4 py-4 text-center text-zinc-300">{fmt(d.atividades)}</td>
                        <td className="px-4 py-4 text-center font-semibold text-white">{fmt(d.media)}</td>
                        <td className="px-4 py-4 text-center text-zinc-400">{d.faltas}</td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${s.classes}`}>
                            {s.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
