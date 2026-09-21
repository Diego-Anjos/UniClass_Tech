"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  UserCheck,
  Sparkles,
  MessageSquare,
  Map as MapIcon,
  CalendarDays,
  LogOut,
  GraduationCap,
  Menu,
  X,
} from "lucide-react";
import { ProfessorSettingsControl } from "@/components/professor/config-modal";
import { ProfessorAvatar } from "@/components/professor/professor-avatar";
import {
  limparSessaoProfessor,
  useProfessorSession,
} from "@/lib/professor-session";

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral", href: "/professor/dashboard" },
  { icon: BookOpen, label: "Turmas e Notas", href: "/professor/dashboard/notas" },
  {
    icon: UserCheck,
    label: "Chamada Rápida",
    href: "/professor/dashboard/chamada",
  },
  {
    icon: CalendarDays,
    label: "Agenda Semestral",
    href: "/professor/dashboard/agenda",
  },
  { icon: MapIcon, label: "Mapa de Salas", href: "/professor/dashboard/mapa" },
  {
    icon: Sparkles,
    label: "Insights IA",
    href: "/professor/dashboard/insights",
  },
  {
    icon: MessageSquare,
    label: "Mensagens",
    href: "/professor/dashboard/mensagens",
  },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/professor/dashboard") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ProfessorDashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { professorLogado, carregandoSessao } = useProfessorSession();
  const [sidebarAbertaMobile, setSidebarAbertaMobile] = useState(false);

  function fecharSidebarMobile() {
    setSidebarAbertaMobile(false);
  }

  if (carregandoSessao || !professorLogado) {
    return (
      <div className="min-h-screen w-full bg-black text-zinc-400 flex items-center justify-center text-sm">
        Carregando sessão...
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-black text-white flex flex-col md:flex-row overflow-x-hidden">
      {/* Header mobile */}
      <header className="md:hidden flex items-center justify-between p-4 bg-zinc-950 border-b border-zinc-800 sticky top-0 z-40 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 bg-gradient-to-br from-zinc-800 to-zinc-950 border border-zinc-700/50 shadow-[0_0_15px_rgba(255,255,255,0.05)] flex items-center justify-center rounded-lg shrink-0">
            <GraduationCap className="w-5 h-5 text-white" />
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
        className={`fixed inset-y-0 left-0 z-50 w-72 shrink-0 min-h-screen border-r border-zinc-800 bg-zinc-950 flex flex-col transition-transform duration-300 ease-in-out md:static md:flex md:w-64 ${
          sidebarAbertaMobile
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-zinc-800">
          <div className="w-8 h-8 bg-gradient-to-br from-zinc-800 to-zinc-950 border border-zinc-700/50 shadow-[0_0_15px_rgba(255,255,255,0.05)] flex items-center justify-center rounded-lg shrink-0">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="text-sm tracking-tight">
            <span className="text-white font-bold">UniClass</span>
            <span className="text-zinc-400 font-light">Tech</span>
          </span>
        </div>

        <div className="px-4 py-5 border-b border-zinc-800">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <ProfessorAvatar
                nome={professorLogado.nome || professorLogado.nomeCompletoTitulo}
                fotoUrl={professorLogado.foto_url}
                className="w-10 h-10 text-sm"
              />
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
            href="/"
            onClick={() => {
              limparSessaoProfessor();
              fecharSidebarMobile();
            }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-500 hover:bg-zinc-900 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sair
          </Link>
        </div>
      </aside>

      <main className="flex-1 min-w-0 w-full overflow-y-auto overflow-x-hidden bg-black">
        {children}
      </main>
    </div>
  );
}
