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
  Download,
  CheckCircle,
  Lock,
  Settings,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral", href: "/aluno/dashboard", active: false },
  { icon: ClipboardList, label: "Boletim e Notas", href: "/aluno/dashboard/notas", active: false },
  { icon: CalendarCheck, label: "Frequência", href: "/aluno/dashboard/frequencia", active: false },
  { icon: BookOpen, label: "Grade e Matérias", href: "/aluno/dashboard/grade", active: true },
  { icon: Map, label: "Mapa de Salas e Labs", href: "/aluno/dashboard/mapa", active: false },
  { icon: MessageSquare, label: "Contato", href: "/aluno/dashboard/contato", active: false },
];

const disciplinasSemestre = [
  { nome: "Banco de Dados", carga: 80, creditos: 4 },
  { nome: "Engenharia de Software", carga: 60, creditos: 3 },
  { nome: "Algoritmos Avançados", carga: 80, creditos: 4 },
  { nome: "Cálculo II", carga: 60, creditos: 3 },
];

export default function AlunoGradePage() {
  const progressoPct = 65;

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
              <h1 className="text-2xl font-semibold tracking-tight">Grade Curricular</h1>
              <p className="text-sm text-zinc-400 mt-1">
                Acompanhe seu progresso e o mapa de disciplinas do seu curso.
              </p>
            </div>
            <button className="flex items-center gap-2 border border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors text-sm rounded-lg px-4 py-2">
              <Download className="w-4 h-4" />
              Baixar Ementa (PDF)
            </button>
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
                No 5º semestre você terá{" "}
                <span className="text-white font-medium">Machine Learning</span>. Sugerimos
                concluir cursos extracurriculares de{" "}
                <span className="text-white font-medium">Python</span> e{" "}
                <span className="text-white font-medium">Estatística básica</span> para ter um
                melhor desempenho.
              </p>
            </div>
          </div>

          {/* ── Progresso do Curso ── */}
          <div className="p-6 rounded-xl bg-zinc-950 border border-zinc-800 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">Progresso Geral do Curso</h2>
              <span className="text-3xl font-semibold tracking-tight">{progressoPct}%</span>
            </div>
            <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${progressoPct}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-widest">Horas Cursadas</p>
                <p className="text-lg font-semibold mt-1">1.560h</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-widest">Horas Restantes</p>
                <p className="text-lg font-semibold mt-1">840h</p>
              </div>
            </div>
          </div>

          {/* ── Layout de Colunas: Semestre Atual + Histórico ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Coluna Esquerda (2/3) — Semestre Atual */}
            <div className="lg:col-span-2 rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Semestre Atual (4º Semestre)</h2>
                <span className="text-xs text-zinc-600">{disciplinasSemestre.length} disciplinas</span>
              </div>
              <div className="flex flex-col divide-y divide-zinc-800">
                {disciplinasSemestre.map((d) => (
                  <div key={d.nome} className="px-6 py-4 hover:bg-zinc-900/50 transition-colors">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <p className="text-sm font-medium text-white">{d.nome}</p>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-900 whitespace-nowrap">
                        Em andamento
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500">
                      Carga Horária: {d.carga}h &nbsp;|&nbsp; Créditos: {d.creditos}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Coluna Direita (1/3) — Histórico e Futuro */}
            <div className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-800">
                <h2 className="text-sm font-semibold">Histórico e Futuro</h2>
              </div>
              <div className="flex flex-col divide-y divide-zinc-800">
                {/* Concluído */}
                <div className="px-5 py-4 hover:bg-zinc-900/50 transition-colors">
                  <div className="flex items-center gap-3 mb-1.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-900 flex items-center justify-center shrink-0">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white">1º ao 3º Semestre</p>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-900 whitespace-nowrap">
                      Concluído
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 ml-10">12 disciplinas concluídas</p>
                </div>

                {/* Pendente */}
                <div className="px-5 py-4 hover:bg-zinc-900/50 transition-colors">
                  <div className="flex items-center gap-3 mb-1.5">
                    <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                      <Lock className="w-3.5 h-3.5 text-zinc-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white">5º ao 8º Semestre</p>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-800 whitespace-nowrap">
                      Pendente
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 ml-10">16 disciplinas restantes</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
