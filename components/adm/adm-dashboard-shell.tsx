"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  MessageSquareText,
  Settings,
  LogOut,
  Shield,
  Building2,
  Menu,
  X,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral", href: "/adm/dashboard" },
  { icon: Users, label: "Gestão de Alunos", href: "/adm/dashboard/alunos" },
  {
    icon: GraduationCap,
    label: "Gestão de Professores",
    href: "/adm/dashboard/professores",
  },
  { icon: BookOpen, label: "Turmas e Matrículas", href: "/adm/dashboard/turmas" },
  {
    icon: MessageSquareText,
    label: "Chamados & Suporte",
    href: "/adm/dashboard/chamados",
  },
  {
    icon: Settings,
    label: "Configurações do Sistema",
    href: "/adm/dashboard/configuracoes",
  },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/adm/dashboard") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdmDashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarAbertaMobile, setSidebarAbertaMobile] = useState(false);

  function fecharSidebarMobile() {
    setSidebarAbertaMobile(false);
  }

  return (
    <div className="min-h-screen w-full bg-[#07090e] text-white flex flex-col md:flex-row overflow-x-hidden">
      {/* Header mobile */}
      <header className="md:hidden flex items-center justify-between p-4 bg-[#0c0e14] border-b border-gray-800 sticky top-0 z-40 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 bg-gradient-to-br from-zinc-800 to-zinc-950 border border-zinc-700/50 shadow-[0_0_15px_rgba(255,255,255,0.05)] flex items-center justify-center rounded-lg shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="text-sm tracking-tight truncate">
            <span className="text-white font-bold">UniClass</span>
            <span className="text-zinc-400 font-light">Tech</span>
          </span>
        </div>
        <button
          type="button"
          onClick={() => setSidebarAbertaMobile((v) => !v)}
          className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
          aria-label={sidebarAbertaMobile ? "Fechar menu" : "Abrir menu"}
        >
          {sidebarAbertaMobile ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>
      </header>

      {/* Backdrop mobile */}
      {sidebarAbertaMobile && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 bg-black/80 z-40 md:hidden"
          onClick={fecharSidebarMobile}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 shrink-0 min-h-screen border-r border-gray-800/80 bg-[#0c0e14] flex flex-col transition-transform duration-300 ease-in-out md:static md:flex md:w-64 ${
          sidebarAbertaMobile
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-zinc-800">
          <div className="w-8 h-8 bg-gradient-to-br from-zinc-800 to-zinc-950 border border-zinc-700/50 shadow-[0_0_15px_rgba(255,255,255,0.05)] flex items-center justify-center rounded-lg shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="text-sm tracking-tight">
            <span className="text-white font-bold">UniClass</span>
            <span className="text-zinc-400 font-light">Tech</span>
          </span>
        </div>

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

        <nav className="flex flex-col gap-0.5 px-2 py-4 flex-1 overflow-y-auto min-w-0">
          {navItems.map(({ icon: Icon, label, href }) => {
            const active = isActivePath(pathname, href);
            return (
              <Link
                key={label}
                href={href}
                onClick={fecharSidebarMobile}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-zinc-800 text-white font-medium"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-2 py-4 border-t border-zinc-800">
          <Link
            href="/adm/login"
            onClick={fecharSidebarMobile}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-500 hover:bg-zinc-900 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sair
          </Link>
        </div>
      </aside>

      {/* Conteúdo */}
      <main className="flex-1 min-w-0 w-full px-6 py-8 overflow-y-auto overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
