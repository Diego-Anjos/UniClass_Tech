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
  Sparkles,
  GraduationCap,
  MessageSquare,
  Check,
  AlertTriangle,
  Settings,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral", href: "/aluno/dashboard", active: false },
  { icon: ClipboardList, label: "Boletim e Notas", href: "/aluno/dashboard/notas", active: false },
  { icon: CalendarCheck, label: "Frequência", href: "#", active: true },
  { icon: BookOpen, label: "Grade e Matérias", href: "/aluno/dashboard/grade", active: false },
  { icon: Map, label: "Mapa de Salas e Labs", href: "/aluno/dashboard/mapa", active: false },
  { icon: MessageSquare, label: "Contato", href: "/aluno/dashboard/contato", active: false },
];

type Disciplina = {
  nome: string;
  faltas: number;
  limite: number;
  status: "tranquila" | "risco";
};

const disciplinas: Disciplina[] = [
  { nome: "Engenharia de Software", faltas: 4, limite: 20, status: "tranquila" },
  { nome: "Banco de Dados", faltas: 8, limite: 20, status: "tranquila" },
  { nome: "Algoritmos Avançados", faltas: 6, limite: 20, status: "tranquila" },
  { nome: "Cálculo II", faltas: 8, limite: 10, status: "risco" },
];

function barColor(status: Disciplina["status"]) {
  if (status === "risco") {
    return {
      cardClasses: "border-orange-900/50 bg-orange-950/20",
      fillClasses: "bg-orange-500",
      fillGlow: "shadow-[0_0_20px_rgba(249,115,22,0.35)]",
      barTrack: "bg-orange-950/40",
    };
  }

  return {
    cardClasses: "border-emerald-900/50 bg-emerald-950/10",
    fillClasses: "bg-emerald-500",
    fillGlow: "shadow-[0_0_20px_rgba(16,185,129,0.25)]",
    barTrack: "bg-emerald-950/30",
  };
}

export default function AlunoFrequenciaPage() {
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Frequência e Presença</h1>
              <p className="text-sm text-zinc-400 mt-1">
                Acompanhe seu limite de faltas para evitar reprovação (limite de 25%).
              </p>
            </div>
          </div>

          {/* ── AI Insight Card (Alerta de Risco) ── */}
          <div className="flex items-start gap-4 p-5 rounded-xl bg-zinc-900/50 border border-orange-900/50 mb-8">
            <div className="shrink-0 mt-0.5 w-8 h-8 rounded-lg bg-zinc-800 border border-orange-900/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-orange-200" />
            </div>
            <div>
              <p className="text-xs font-semibold text-orange-200 uppercase tracking-widest mb-1">
                Alerta de Risco
              </p>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Alerta da IA: Você está próximo do limite de faltas em <span className="text-white font-medium">Cálculo II</span>. Você só pode faltar mais{" "}
                <span className="text-white font-medium">2</span> vezes nesta disciplina para não ser reprovado.
              </p>
            </div>
          </div>

          {/* ── Cards de Resumo (Grid 2 colunas) ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="p-6 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-500 uppercase tracking-widest">Presença Global</p>
                <Check className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-4xl font-semibold tracking-tight">88%</p>
            </div>

            <div className="p-6 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-500 uppercase tracking-widest">Disciplinas em Risco</p>
                <AlertTriangle className="w-4 h-4 text-orange-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-semibold tracking-tight">1</p>
                <span className="text-sm text-zinc-400">disciplina</span>
              </div>
            </div>
          </div>

          {/* ── Detalhamento por Disciplina (lista de cards) ── */}
          <div className="flex flex-col gap-4">
            {disciplinas.map((d) => {
              const pct = Math.round((d.faltas / d.limite) * 100);
              const c = barColor(d.status);
              return (
                <div key={d.nome} className={`p-5 rounded-xl border border-zinc-800 ${c.cardClasses}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">{d.nome}</p>
                      <p className="text-xs text-zinc-400 mt-1">
                        Faltas: {d.faltas} / Limite: {d.limite}
                      </p>
                    </div>
                    <span className="text-xs text-zinc-500 whitespace-nowrap">{pct}%</span>
                  </div>

                  <div className="mt-4 w-full h-2 rounded-full overflow-hidden border border-zinc-800">
                    <div className={`${c.barTrack} h-full w-full`}>
                      <div
                        className={`${c.fillClasses} h-full rounded-full ${c.fillGlow} transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
