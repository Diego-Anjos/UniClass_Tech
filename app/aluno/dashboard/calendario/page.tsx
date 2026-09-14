"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  ClipboardList,
  CalendarCheck,
  CalendarDays,
  BookOpen,
  Map as MapIcon,
  LogOut,
  Camera,
  GraduationCap,
  MessageSquare,
  Settings,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  iniciaisDoAluno,
  limparSessaoAluno,
  useAlunoSession,
} from "@/lib/aluno-session";

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral", href: "/aluno/dashboard", active: false },
  { icon: ClipboardList, label: "Boletim e Notas", href: "/aluno/dashboard/notas", active: false },
  { icon: CalendarDays, label: "Meu Calendário", href: "/aluno/dashboard/calendario", active: true },
  { icon: CalendarCheck, label: "Frequência", href: "/aluno/dashboard/frequencia", active: false },
  { icon: BookOpen, label: "Grade e Matérias", href: "/aluno/dashboard/grade", active: false },
  { icon: MapIcon, label: "Mapa de Salas e Labs", href: "/aluno/dashboard/mapa", active: false },
  { icon: MessageSquare, label: "Contato", href: "/aluno/dashboard/contato", active: false },
];

type EventoCalendario = {
  id: string;
  titulo: string;
  tipo_evento: string;
  data_evento: string;
  descricao: string | null;
  turma: string;
  disciplina: string | null;
};

const MESES_CURTOS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

function formatarDataEvento(isoDate: string): string {
  const [ano, mes, dia] = isoDate.split("-").map(Number);
  if (!ano || !mes || !dia) return isoDate;
  return `${dia} de ${MESES_CURTOS[mes - 1]}`;
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 animate-pulse">
      <div className="h-3 w-16 rounded bg-zinc-800 mb-3" />
      <div className="h-4 w-3/4 rounded bg-zinc-800 mb-2" />
      <div className="h-3 w-1/2 rounded bg-zinc-800 mb-4" />
      <div className="h-5 w-24 rounded bg-zinc-800 mb-3" />
      <div className="h-3 w-full rounded bg-zinc-800" />
    </div>
  );
}

export default function AlunoCalendarioPage() {
  const { alunoLogado, carregandoSessao } = useAlunoSession();
  const [turmaAluno, setTurmaAluno] = useState<string | null>(null);
  const [eventos, setEventos] = useState<EventoCalendario[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!alunoLogado?.ra) return;

    let cancelado = false;

    async function carregarCalendario() {
      setCarregando(true);

      try {
        const { data: alunoData, error: alunoError } = await supabase
          .from("alunos")
          .select("turma")
          .eq("ra", alunoLogado!.ra)
          .maybeSingle();

        if (cancelado) return;

        if (alunoError) {
          console.error("Erro ao buscar turma do aluno:", alunoError.message);
        }

        const turma = String(alunoData?.turma ?? "").trim();

        if (!turma) {
          setTurmaAluno(null);
          setEventos([]);
          setCarregando(false);
          return;
        }

        setTurmaAluno(turma);

        const { data, error } = await supabase
          .from("calendario_academico")
          .select(
            "id, titulo, tipo_evento, data_evento, descricao, turma, disciplina"
          )
          .eq("turma", turma)
          .order("data_evento", { ascending: true });

        if (cancelado) return;

        if (error) {
          console.error("Erro ao carregar calendário:", error.message);
          setEventos([]);
        } else {
          setEventos((data as EventoCalendario[]) ?? []);
        }
      } catch (err) {
        console.error("Erro ao carregar calendário:", err);
        if (!cancelado) setEventos([]);
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }

    void carregarCalendario();

    return () => {
      cancelado = true;
    };
  }, [alunoLogado]);

  if (carregandoSessao) {
    return (
      <div className="flex h-screen bg-black text-white items-center justify-center">
        <p className="text-sm text-zinc-500 animate-pulse">Carregando...</p>
      </div>
    );
  }

  const getCorTag = (tipo: string) => {
    switch (tipo) {
      case "Prova":
        return "bg-red-500/10 text-red-400 border border-red-500/20";
      case "Atividade Valendo Nota":
        return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
      case "Entrega de Trabalho":
        return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
      case "Aula de Reforço":
        return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
      default:
        return "bg-zinc-800 text-zinc-300 border border-zinc-700";
    }
  };

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-zinc-950 border-r border-zinc-800">
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
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-base font-semibold text-white">
                  {alunoLogado ? iniciaisDoAluno(alunoLogado.nome) : "—"}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-zinc-700 border border-zinc-900 rounded-full flex items-center justify-center">
                  <Camera className="w-2.5 h-2.5 text-zinc-300" />
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {alunoLogado?.nome || "Estudante"}
                </p>
                <p className="text-xs text-zinc-500">
                  RA: {alunoLogado?.ra || "—"}
                </p>
              </div>
            </div>
            <Link
              href="/aluno/dashboard/perfil"
              className="text-zinc-500 hover:text-white transition-colors shrink-0"
            >
              <Settings className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <nav className="flex flex-col gap-0.5 px-2 py-4 flex-1">
          {navItems.map(({ icon: Icon, label, href, active }) => (
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
          ))}
        </nav>

        <div className="px-2 py-4 border-t border-zinc-800">
          <a
            href="/"
            onClick={() => limparSessaoAluno()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-500 hover:bg-zinc-900 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sair
          </a>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-black">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 py-10">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Meu Calendário
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Acompanhe suas provas, entregas e eventos do semestre
            </p>
            {turmaAluno && !carregando && (
              <p className="text-xs text-zinc-500 mt-2">
                Turma: <span className="text-zinc-300">{turmaAluno}</span>
              </p>
            )}
          </div>

          {carregando ? (
            <div>
              <div className="mb-4 flex items-center gap-2 text-sm text-zinc-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando eventos...
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            </div>
          ) : eventos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 px-5 py-12 text-center">
              <CalendarDays className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
              <p className="text-sm text-zinc-400">
                Nenhum evento agendado para a sua turma no momento.
              </p>
              <p className="text-xs text-zinc-600 mt-2">
                Quando seus professores cadastrarem provas e entregas, elas
                aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {eventos.map((evento) => (
                <article
                  key={evento.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 flex flex-col gap-3"
                >
                  <div>
                    <p className="text-lg font-semibold text-white tracking-tight">
                      {formatarDataEvento(evento.data_evento)}
                    </p>
                    <h2 className="mt-1.5 text-sm font-medium text-zinc-100 leading-snug">
                      {evento.titulo}
                    </h2>
                  </div>

                  <p className="text-xs text-zinc-400">
                    {evento.disciplina?.trim() || "—"}
                  </p>

                  <span
                    className={`inline-flex w-fit rounded-md px-2 py-0.5 text-[11px] font-medium ${getCorTag(
                      evento.tipo_evento
                    )}`}
                  >
                    {evento.tipo_evento}
                  </span>

                  {evento.descricao?.trim() ? (
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      {evento.descricao}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
