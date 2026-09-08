"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  ClipboardList,
  CalendarCheck,
  BookOpen,
  Map,
  LogOut,
  Camera,
  Clock,
  TrendingUp,
  AlertCircle,
  GraduationCap,
  MessageSquare,
  Settings,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral",         href: "/aluno/dashboard",       active: true  },
  { icon: ClipboardList,   label: "Boletim e Notas",     href: "/aluno/dashboard/notas", active: false },
  { icon: CalendarCheck,   label: "Frequência",           href: "/aluno/dashboard/frequencia",                      active: false },
  { icon: BookOpen,        label: "Grade e Matérias",     href: "/aluno/dashboard/grade",                      active: false },
  { icon: Map,             label: "Mapa de Salas e Labs", href: "/aluno/dashboard/mapa",                      active: false },
  { icon: MessageSquare,   label: "Contato",              href: "/aluno/dashboard/contato",    active: false },
];

type AlunoInfo = {
  nome: string;
  ra: string;
  curso: string;
  semestre: string;
};

type ProximaAula = {
  disciplina: string;
  local: string;
  horario: string;
};

type AulaHoje = {
  materia: string;
  professor: string;
  local: string;
  horario: string;
};

type Aviso = {
  tipo: string;
  autor: string;
  msg: string;
};

function iniciaisDe(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "—";
}

export default function AlunoDashboardPage() {
  const [aluno, setAluno] = useState<AlunoInfo | null>(null);
  const [mediaGeral, setMediaGeral] = useState<number | null>(null);
  const [faltasTotais, setFaltasTotais] = useState(0);
  const [limiteFaltas, setLimiteFaltas] = useState(40);
  const [proximaAula, setProximaAula] = useState<ProximaAula | null>(null);
  const [aulasHoje, setAulasHoje] = useState<AulaHoje[]>([]);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregarDashboard() {
      setLoading(true);

      try {
        const { data: alunoData, error: alunoError } = await supabase
          .from("alunos")
          .select("*")
          .limit(1)
          .maybeSingle();

        if (alunoError || !alunoData) {
          if (alunoError) {
            console.error("Erro ao buscar aluno:", alunoError.message);
          }
          setAluno(null);
        } else {
          setAluno({
            nome: alunoData.nome,
            ra: alunoData.ra || alunoData.matricula || "RA-0000",
            curso: alunoData.curso || "Tecnologia da Informação",
            semestre: "1º Semestre",
          });
        }

        const { data: turmasData, error: turmasError } = await supabase
          .from("turmas")
          .select("id, codigo, curso, turno");

        if (turmasError) {
          console.error("Erro ao buscar turmas:", turmasError.message);
          setProximaAula(null);
          setAulasHoje([]);
        } else {
          const turmas = turmasData ?? [];

          if (turmas.length > 0) {
            const primeira = turmas[0];
            setProximaAula({
              disciplina: String(primeira.curso ?? "Disciplina"),
              local: `Sala ${primeira.codigo ?? "—"}`,
              horario: String(primeira.turno ?? "—"),
            });

            setAulasHoje(
              turmas.map((turma) => ({
                materia: String(turma.curso ?? "Disciplina"),
                professor: "—",
                local: `Sala ${turma.codigo ?? "—"}`,
                horario: String(turma.turno ?? "—"),
              }))
            );
          } else {
            setProximaAula(null);
            setAulasHoje([]);
          }
        }

        setAvisos([]);
        setMediaGeral(null);
        setFaltasTotais(0);
        setLimiteFaltas(40);
      } finally {
        setLoading(false);
      }
    }

    void carregarDashboard();
  }, []);

  const badgeMedia =
    mediaGeral !== null
      ? mediaGeral >= 7
        ? { label: "Aprovado", className: "bg-emerald-950 text-emerald-400 border-emerald-900" }
        : { label: "Atenção", className: "bg-amber-950 text-amber-400 border-amber-900" }
      : { label: "Sem Notas", className: "bg-zinc-900 text-zinc-400 border-zinc-800" };

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
            <span className="text-white font-bold">UniClass</span><span className="text-zinc-400 font-light">Tech</span>
          </span>
        </div>

        {/* Perfil */}
        <div className="px-4 py-5 border-b border-zinc-800">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-base font-semibold text-white">
                  {aluno ? iniciaisDe(aluno.nome) : "—"}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-zinc-700 border border-zinc-900 rounded-full flex items-center justify-center cursor-pointer hover:bg-zinc-600 transition-colors">
                  <Camera className="w-2.5 h-2.5 text-zinc-300" />
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {aluno?.nome || (loading ? "Carregando..." : "Estudante")}
                </p>
                <p className="text-xs text-zinc-500">
                  RA: {aluno?.ra || "—"}
                </p>
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

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">
              Olá, {aluno ? aluno.nome.split(" ")[0] : "Estudante"}!
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Curso: {aluno ? aluno.curso : "Matrícula Pendente"}
            </p>
          </div>

          {/* ── Cards de Resumo ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">

            {/* Média Geral */}
            <div className="p-6 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-500 uppercase tracking-widest">Média Geral</p>
                <TrendingUp className="w-4 h-4 text-zinc-600" />
              </div>
              <p className="text-4xl font-semibold tracking-tight">
                {mediaGeral !== null ? mediaGeral.toFixed(1) : "-"}
              </p>
              <span
                className={`self-start text-xs font-medium px-2 py-0.5 rounded-full border ${badgeMedia.className}`}
              >
                {badgeMedia.label}
              </span>
            </div>

            {/* Faltas Totais */}
            <div className="p-6 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-500 uppercase tracking-widest">Faltas Totais</p>
                <AlertCircle className="w-4 h-4 text-zinc-600" />
              </div>
              <p className="text-4xl font-semibold tracking-tight">
                {faltasTotais}
                <span className="text-lg text-zinc-500 font-normal">/{limiteFaltas}</span>
              </p>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-600 rounded-full transition-all"
                  style={{ width: `${(faltasTotais / limiteFaltas) * 100}%` }}
                />
              </div>
              <p className="text-xs text-zinc-600">
                {Math.round((faltasTotais / limiteFaltas) * 100)}% do limite utilizado
              </p>
            </div>

            {/* Próxima Aula */}
            <div className="p-6 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-500 uppercase tracking-widest">Próxima Aula</p>
                <Clock className="w-4 h-4 text-zinc-600" />
              </div>
              {proximaAula ? (
                <>
                  <p className="text-xl font-semibold leading-snug">
                    {proximaAula.disciplina}
                  </p>
                  <p className="text-sm text-zinc-400">{proximaAula.local}</p>
                  <span className="self-start text-xs font-medium px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-900">
                    {proximaAula.horario}
                  </span>
                </>
              ) : (
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Nenhuma aula prevista para hoje
                </p>
              )}
            </div>
          </div>

          {/* ── Seção Inferior: 2/3 + 1/3 ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Aulas de Hoje (2/3) */}
            <div className="lg:col-span-2 rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Aulas de Hoje</h2>
                <span className="text-xs text-zinc-600">
                  {loading ? "Carregando..." : `${aulasHoje.length} turma(s)`}
                </span>
              </div>
              <div className="divide-y divide-zinc-800">
                {aulasHoje.length === 0 ? (
                  <p className="px-6 py-8 text-sm text-zinc-500 text-center">
                    Nenhuma aula agendada para hoje.
                  </p>
                ) : (
                  aulasHoje.map((aula, index) => (
                    <div
                      key={`${aula.materia}-${aula.horario}-${index}`}
                      className="flex items-start gap-4 px-6 py-4 hover:bg-zinc-900/50 transition-colors"
                    >
                      <div className="shrink-0 mt-0.5 text-xs font-medium text-zinc-500 w-10 text-right">
                        {aula.horario}
                      </div>
                      <div className="w-px self-stretch bg-zinc-800 mx-1" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white">{aula.materia}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{aula.professor}</p>
                        <p className="text-xs text-zinc-600 mt-0.5">{aula.local}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Mural de Avisos (1/3) */}
            <div className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-800">
                <h2 className="text-sm font-semibold">Mural de Avisos & Feedbacks</h2>
              </div>
              <div className="flex flex-col divide-y divide-zinc-800">
                {avisos.length === 0 ? (
                  <p className="px-5 py-8 text-sm text-zinc-500 text-center">
                    Nenhum aviso ou feedback recente.
                  </p>
                ) : (
                  avisos.map((a, i) => (
                    <div key={i} className="px-5 py-4 hover:bg-zinc-900/50 transition-colors">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
                            a.tipo === "nota"
                              ? "bg-blue-950 text-blue-400 border-blue-900"
                              : a.tipo === "feedback"
                              ? "bg-emerald-950 text-emerald-400 border-emerald-900"
                              : "bg-zinc-900 text-zinc-400 border-zinc-800"
                          }`}
                        >
                          {a.tipo.charAt(0).toUpperCase() + a.tipo.slice(1)}
                        </span>
                        <span className="text-xs text-zinc-500">{a.autor}</span>
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed">{a.msg}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
