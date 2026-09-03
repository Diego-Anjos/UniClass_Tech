"use client";

import { useState } from "react";
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
  Monitor,
  Clock,
  Coffee,
  Settings,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral",        href: "/aluno/dashboard",             active: false },
  { icon: ClipboardList,   label: "Boletim e Notas",    href: "/aluno/dashboard/notas",       active: false },
  { icon: CalendarCheck,   label: "Frequência",          href: "/aluno/dashboard/frequencia",  active: false },
  { icon: BookOpen,        label: "Grade e Matérias",    href: "/aluno/dashboard/grade",       active: false },
  { icon: Map,             label: "Mapa de Salas e Labs",href: "/aluno/dashboard/mapa",        active: true  },
  { icon: MessageSquare,   label: "Contato",              href: "/aluno/dashboard/contato",    active: false },
];

const andares = ["Térreo", "1º Andar (Atual)", "2º Andar"];

const itinerario = [
  { hora: "08:00", label: "Banco de Dados",        local: "Lab 3 – 1º Andar",       tipo: "aula"     },
  { hora: "10:00", label: "Intervalo",              local: "",                        tipo: "intervalo" },
  { hora: "10:20", label: "Engenharia de Software", local: "Sala 104 – Térreo",      tipo: "aula"     },
];

export default function AlunoMapaPage() {
  const [andarAtivo, setAndarAtivo] = useState("1º Andar (Atual)");

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
        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-10">

          {/* ── Header ── */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">Mapa de Salas e Laboratórios</h1>
            <p className="text-sm text-zinc-400 mt-1">
              Localize suas aulas e laboratórios disponíveis para estudo.
            </p>
            {/* Seletor de Andar */}
            <div className="flex items-center gap-1 mt-4 p-1 bg-zinc-950 border border-zinc-800 rounded-lg w-fit">
              {andares.map((andar) => (
                <button
                  key={andar}
                  onClick={() => setAndarAtivo(andar)}
                  className={`px-4 py-1.5 rounded-md text-sm transition-colors ${
                    andarAtivo === andar
                      ? "bg-zinc-800 text-white font-medium"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {andar}
                </button>
              ))}
            </div>
          </div>

          {/* ── AI Insight Card ── */}
          <div className="flex items-start gap-4 p-5 rounded-xl bg-zinc-900/50 border border-zinc-800 mb-6">
            <div className="shrink-0 mt-0.5 w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/50 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-zinc-300" />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">
                Dica da IA
              </p>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Você tem uma janela livre às{" "}
                <span className="text-white font-medium">10h</span>. O{" "}
                <span className="text-white font-medium">Laboratório 3</span> (Neste andar)
                estará livre e possui os computadores com{" "}
                <span className="text-white font-medium">AutoCAD</span> que você precisa.
              </p>
            </div>
          </div>

          {/* ── Grid Principal: Mapa 60% + Detalhes 40% ── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

            {/* ── MAPA (3/5 ≈ 60%) ── */}
            <div className="lg:col-span-3 rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Planta Baixa — {andarAtivo}</h2>
                <span className="text-xs text-zinc-600">3 ambientes</span>
              </div>

              {/* Grade do mapa */}
              <div className="p-6">
                {/* Salas superiores */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {/* Sala 101 — Normal */}
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-1.5 min-h-[100px]">
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Sala 101</p>
                    <p className="text-sm font-medium text-white">Cálculo II</p>
                    <p className="text-xs text-zinc-500">13:30 · Prof. Silva</p>
                    <span className="self-start mt-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                      Ocupada
                    </span>
                  </div>

                  {/* Lab 2 — Livre */}
                  <div className="rounded-lg border border-emerald-500/50 bg-zinc-900 p-4 flex flex-col gap-1.5 min-h-[100px]">
                    <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Lab 2</p>
                    <p className="text-sm font-medium text-white">Laboratório de Redes</p>
                    <p className="text-xs text-zinc-500">20 máquinas</p>
                    <span className="self-start mt-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-900">
                      Livre
                    </span>
                  </div>
                </div>

                {/* Corredor */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-px flex-1 bg-zinc-800" />
                  <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest px-3 py-1.5 rounded-md border border-zinc-800 bg-zinc-950">
                    Corredor
                  </p>
                  <div className="h-px flex-1 bg-zinc-800" />
                </div>

                {/* Lab 3 — Destaque / Próxima Aula */}
                <div className="rounded-lg border border-blue-500 bg-blue-950 p-5 shadow-[0_0_30px_rgba(59,130,246,0.15)] relative overflow-hidden">
                  {/* glow sutil de fundo */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-transparent pointer-events-none" />
                  <div className="relative flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider">Lab 3</p>
                        <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-900 text-blue-300 border border-blue-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse inline-block" />
                          Próxima aula
                        </span>
                      </div>
                      <p className="text-base font-semibold text-white">Banco de Dados</p>
                      <p className="text-sm text-blue-200 mt-0.5">08:00 · Prof. Lima</p>
                    </div>
                    <Monitor className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  </div>
                </div>
              </div>
            </div>

            {/* ── PAINEL DE DETALHES (2/5 ≈ 40%) ── */}
            <div className="lg:col-span-2 flex flex-col gap-4">

              {/* Card Superior — Detalhes do Local */}
              <div className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
                <div className="px-5 py-4 border-b border-zinc-800">
                  <h2 className="text-sm font-semibold">Local Selecionado</h2>
                </div>
                <div className="px-5 py-5">
                  <p className="text-2xl font-semibold tracking-tight">Lab 3</p>
                  <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-900">
                    Sua próxima aula
                  </span>

                  <div className="mt-5 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                        <Monitor className="w-3.5 h-3.5 text-zinc-400" />
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500">Estações</p>
                        <p className="text-sm font-medium text-white">30 Máquinas</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                        {/* Windows icon via SVG simples */}
                        <svg className="w-3.5 h-3.5 text-zinc-400" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500">Sistema</p>
                        <p className="text-sm font-medium text-white">Windows 11</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                        <svg className="w-3.5 h-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="2" y="3" width="20" height="14" rx="2" />
                          <path d="M8 21h8M12 17v4" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500">Software</p>
                        <p className="text-sm font-medium text-white">Visual Studio, SQL Server</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Inferior — Itinerário de Hoje */}
              <div className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
                <div className="px-5 py-4 border-b border-zinc-800">
                  <h2 className="text-sm font-semibold">Itinerário de Hoje</h2>
                </div>
                <div className="px-5 py-4 flex flex-col gap-0">
                  {itinerario.map((item, i) => (
                    <div key={i} className="flex gap-3">
                      {/* Linha da timeline */}
                      <div className="flex flex-col items-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${
                          item.tipo === "intervalo"
                            ? "bg-zinc-900 border-zinc-700"
                            : "bg-zinc-800 border-zinc-600"
                        }`}>
                          {item.tipo === "intervalo"
                            ? <Coffee className="w-3 h-3 text-zinc-500" />
                            : <Clock className="w-3 h-3 text-zinc-400" />
                          }
                        </div>
                        {i < itinerario.length - 1 && (
                          <div className="w-px flex-1 bg-zinc-800 my-1" />
                        )}
                      </div>

                      {/* Conteúdo */}
                      <div className="pb-4 min-w-0">
                        <p className="text-xs text-zinc-500 mb-0.5">{item.hora}</p>
                        <p className={`text-sm font-medium ${item.tipo === "intervalo" ? "text-zinc-500" : "text-white"}`}>
                          {item.label}
                        </p>
                        {item.local && (
                          <p className="text-xs text-zinc-500 mt-0.5">{item.local}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
