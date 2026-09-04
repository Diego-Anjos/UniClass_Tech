"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Settings,
  LogOut,
  Shield,
  Building2,
  Activity,
  UserPlus,
  Briefcase,
  Layers,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral",              href: "/adm/dashboard",        active: true  },
  { icon: Users,           label: "Gestão de Alunos",         href: "/adm/dashboard/alunos", active: false },
  { icon: GraduationCap,   label: "Gestão de Professores",    href: "/adm/dashboard/professores", active: false },
  { icon: BookOpen,        label: "Turmas e Matrículas",      href: "/adm/dashboard/turmas",     active: false },
  { icon: Settings,        label: "Configurações do Sistema", href: "/adm/dashboard/configuracoes", active: false },
];

const metricas = [
  {
    label: "Total de Alunos",
    valor: "4.250",
    extra: "+12% este semestre",
    extraClass: "text-green-400",
    icon: Users,
  },
  {
    label: "Corpo Docente",
    valor: "128",
    extra: "Professores ativos",
    extraClass: "text-zinc-400",
    icon: GraduationCap,
  },
  {
    label: "Turmas Ativas",
    valor: "84",
    extra: "Neste semestre",
    extraClass: "text-zinc-400",
    icon: BookOpen,
  },
  {
    label: "Saúde do Sistema",
    valor: "100%",
    extra: "Online",
    extraClass: "text-green-400",
    icon: Activity,
    badge: true,
  },
];

const acoesRapidas = [
  { label: "Cadastrar Novo Aluno", icon: UserPlus },
  { label: "Novo Professor",       icon: Briefcase },
  { label: "Abrir Nova Turma",     icon: Layers },
];

const ultimosCadastros = [
  {
    usuario: "Felipe Almeida",
    tipo: "Aluno - ADS",
    id: "RA 20261099",
    data: "Hoje, 14:30",
    status: "Ativo",
    statusClass: "bg-green-950 text-green-400 border-green-900/50",
  },
  {
    usuario: "Prof. Marcos Silva",
    tipo: "Docente - Eng. Software",
    id: "MAT 9012",
    data: "Hoje, 10:15",
    status: "Pendente de Senha",
    statusClass: "bg-amber-950 text-amber-400 border-amber-900/50",
  },
  {
    usuario: "Turma BD-4A",
    tipo: "Abertura de Turma",
    id: "—",
    data: "Ontem",
    status: "Concluído",
    statusClass: "bg-green-950 text-green-400 border-green-900/50",
  },
];

export default function AdmDashboardPage() {
  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      {/* ══════════════════════════════
          SIDEBAR
      ══════════════════════════════ */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-zinc-950 border-r border-zinc-800">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-zinc-800">
          <div className="w-8 h-8 bg-gradient-to-br from-zinc-800 to-zinc-950 border border-zinc-700/50 shadow-[0_0_15px_rgba(255,255,255,0.05)] flex items-center justify-center rounded-lg shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="text-sm tracking-tight">
            <span className="text-white font-bold">UniClass</span>
            <span className="text-zinc-400 font-light">Tech</span>
          </span>
        </div>

        {/* Perfil ADM */}
        <div className="px-4 py-5 border-b border-zinc-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-zinc-300" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">Secretaria Acadêmica</p>
              <p className="text-xs text-zinc-500">Acesso Root</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 px-2 py-4 flex-1">
          {navItems.map(({ icon: Icon, label, href, active }) =>
            href.startsWith("/adm") ? (
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
            href="/adm/login"
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
              Painel de Controle ADM
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Visão global da infraestrutura acadêmica e ações rápidas.
            </p>
          </div>

          {/* Cards de Métricas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {metricas.map((m) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.label}
                  className="p-5 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-zinc-500 uppercase tracking-widest">{m.label}</p>
                    <Icon className="w-4 h-4 text-zinc-600" />
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-3xl font-semibold tracking-tight text-white">{m.valor}</p>
                    {m.badge && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border bg-green-950 text-green-400 border-green-900/50">
                        Online
                      </span>
                    )}
                  </div>
                  {!m.badge && (
                    <p className={`text-xs ${m.extraClass}`}>{m.extra}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Ações Rápidas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {acoesRapidas.map(({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                className="flex items-center gap-3 p-5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-zinc-300" />
                </div>
                <span className="text-sm font-medium text-white">{label}</span>
              </button>
            ))}
          </div>

          {/* Tabela Últimos Cadastros */}
          <div className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-white">
                Últimos Cadastros e Matrículas
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="px-6 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest">
                      Usuário
                    </th>
                    <th className="px-4 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest">
                      Tipo
                    </th>
                    <th className="px-4 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest">
                      RA/Matrícula
                    </th>
                    <th className="px-4 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest">
                      Data
                    </th>
                    <th className="px-6 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ultimosCadastros.map((row) => (
                    <tr
                      key={`${row.usuario}-${row.id}`}
                      className="border-b border-zinc-800 last:border-b-0 hover:bg-zinc-900/40 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-white">
                        {row.usuario}
                      </td>
                      <td className="px-4 py-4 text-sm text-zinc-400">{row.tipo}</td>
                      <td className="px-4 py-4 text-sm text-zinc-400">{row.id}</td>
                      <td className="px-4 py-4 text-sm text-zinc-500">{row.data}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${row.statusClass}`}
                        >
                          {row.status}
                        </span>
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
