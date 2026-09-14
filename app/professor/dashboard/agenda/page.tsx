"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { ProfessorSettingsControl } from "@/components/professor/config-modal";
import { supabase } from "@/lib/supabase";
import {
  iniciaisDoProfessor,
  limparSessaoProfessor,
  useProfessorSession,
} from "@/lib/professor-session";

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral", href: "/professor/dashboard", active: false },
  { icon: BookOpen, label: "Turmas e Notas", href: "/professor/dashboard/notas", active: false },
  { icon: UserCheck, label: "Chamada Rápida", href: "/professor/dashboard/chamada", active: false },
  { icon: CalendarDays, label: "Agenda Semestral", href: "/professor/dashboard/agenda", active: true },
  { icon: MapIcon, label: "Mapa de Salas", href: "/professor/dashboard/mapa", active: false },
  { icon: Sparkles, label: "Insights IA", href: "/professor/dashboard/insights", active: false },
  { icon: MessageSquare, label: "Mensagens", href: "/professor/dashboard/mensagens", active: false },
];

const TIPOS_EVENTO = [
  "Prova",
  "Atividade Valendo Nota",
  "Aula de Reforço",
  "Entrega de Trabalho",
] as const;

type TipoEvento = (typeof TIPOS_EVENTO)[number];

type EventoAgenda = {
  id: string;
  titulo: string;
  tipo_evento: string;
  data_evento: string;
  descricao: string | null;
  turma: string;
  disciplina: string | null;
};

/** Parse turmas vindas do Supabase/sessão (array, JSON ou CSV). */
function parseTurmasProfessor(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map(String).map((s) => s.trim()).filter(Boolean);
  }
  if (typeof raw !== "string") return [];
  const texto = raw.trim();
  if (!texto || texto === "—") return [];
  try {
    const parsed = JSON.parse(texto);
    if (Array.isArray(parsed)) {
      return parsed.map(String).map((s) => s.trim()).filter(Boolean);
    }
  } catch {
    // CSV / texto simples
  }
  return texto
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

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

const inputClass =
  "w-full appearance-none bg-zinc-950 border border-zinc-700 text-sm text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-zinc-500 hover:border-zinc-600 transition-colors";

const inputDisabledClass =
  "w-full appearance-none bg-zinc-900/80 border border-zinc-800 text-sm text-zinc-300 rounded-lg px-4 py-2.5 cursor-not-allowed";

export default function AgendaSemestralPage() {
  const { professorLogado, carregandoSessao } = useProfessorSession();
  const [turmaSelecionada, setTurmaSelecionada] = useState("");
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<TipoEvento | "">("");
  const [dataEvento, setDataEvento] = useState("");
  const [descricao, setDescricao] = useState("");
  const [eventos, setEventos] = useState<EventoAgenda[]>([]);
  const [carregandoEventos, setCarregandoEventos] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  const turmasDoProfessor = useMemo(
    () =>
      parseTurmasProfessor(
        professorLogado?.turmas ?? professorLogado?.area_atuacao
      ),
    [professorLogado?.turmas, professorLogado?.area_atuacao]
  );

  const disciplinaProfessor = professorLogado?.disciplina?.trim() || "";

  useEffect(() => {
    if (!turmaSelecionada) {
      setEventos([]);
      return;
    }

    let cancelado = false;

    async function carregarEventos() {
      setCarregandoEventos(true);
      const { data, error } = await supabase
        .from("calendario_academico")
        .select("id, titulo, tipo_evento, data_evento, descricao, turma, disciplina")
        .eq("turma", turmaSelecionada)
        .order("data_evento", { ascending: true });

      if (cancelado) return;

      if (error) {
        console.error("Erro ao carregar agenda:", error.message);
        toast.error("Não foi possível carregar os eventos da turma.");
        setEventos([]);
      } else {
        setEventos((data as EventoAgenda[]) ?? []);
      }

      setCarregandoEventos(false);
    }

    void carregarEventos();

    return () => {
      cancelado = true;
    };
  }, [turmaSelecionada]);

  async function handleAdicionarEvento(e: FormEvent) {
    e.preventDefault();

    if (!turmaSelecionada) {
      toast.error("Selecione uma turma antes de adicionar o evento.");
      return;
    }
    if (!titulo.trim() || !tipo || !dataEvento) {
      toast.error("Preencha título, tipo e data do evento.");
      return;
    }

    setSalvando(true);
    try {
      const payload = {
        titulo: titulo.trim(),
        tipo_evento: tipo,
        data_evento: dataEvento,
        descricao: descricao.trim() || null,
        turma: turmaSelecionada,
        disciplina: disciplinaProfessor || null,
        professor_id: professorLogado!.id,
      };

      const { data, error } = await supabase
        .from("calendario_academico")
        .insert(payload)
        .select("id, titulo, tipo_evento, data_evento, descricao, turma, disciplina")
        .single();

      if (error) throw error;

      setEventos((prev) => {
        const atualizados = [...prev, data as EventoAgenda];
        return atualizados.sort((a, b) =>
          a.data_evento.localeCompare(b.data_evento)
        );
      });

      setTitulo("");
      setTipo("");
      setDataEvento("");
      setDescricao("");
      toast.success("Evento adicionado à agenda.");
    } catch (err: unknown) {
      console.error("Erro ao salvar evento:", err);
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Não foi possível salvar o evento.";
      toast.error(message);
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluirEvento(id: string) {
    setExcluindoId(id);
    try {
      const { error } = await supabase
        .from("calendario_academico")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setEventos((prev) => prev.filter((ev) => ev.id !== id));
      toast.success("Evento removido da agenda.");
    } catch (err: unknown) {
      console.error("Erro ao excluir evento:", err);
      toast.error("Não foi possível excluir o evento.");
    } finally {
      setExcluindoId(null);
    }
  }

  if (carregandoSessao || !professorLogado) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-zinc-400 text-sm">
        Carregando sessão...
      </div>
    );
  }

  const iniciais = iniciaisDoProfessor(
    professorLogado.nome || professorLogado.nomeCompletoTitulo
  );

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
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-semibold text-white shrink-0">
                {iniciais || "PR"}
              </div>
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
            onClick={limparSessaoProfessor}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-500 hover:bg-zinc-900 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sair
          </a>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-black">
        <div className="max-w-6xl mx-auto p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Agenda e Planejamento
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Programe avaliações e eventos para suas turmas
            </p>
          </div>

          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div>
              <label
                htmlFor="filtro-turma"
                className="block text-xs text-zinc-500 mb-1.5"
              >
                Turma
              </label>
              <select
                id="filtro-turma"
                value={turmaSelecionada}
                onChange={(e) => setTurmaSelecionada(e.target.value)}
                className={inputClass + " cursor-pointer"}
              >
                <option value="">Selecione a Turma</option>
                {turmasDoProfessor.length === 0 ? (
                  <option value="" disabled>
                    Nenhuma turma atribuída ao docente
                  </option>
                ) : (
                  turmasDoProfessor.map((turma) => (
                    <option key={turma} value={turma}>
                      {turma}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label
                htmlFor="filtro-disciplina"
                className="block text-xs text-zinc-500 mb-1.5"
              >
                Disciplina
              </label>
              <input
                id="filtro-disciplina"
                type="text"
                value={disciplinaProfessor || "—"}
                disabled
                readOnly
                className={inputDisabledClass}
                aria-label="Disciplina do professor"
              />
            </div>
          </div>

          <form
            onSubmit={handleAdicionarEvento}
            className="mb-8 rounded-xl border border-zinc-800 bg-zinc-950 p-5"
          >
            <h2 className="text-sm font-semibold text-white mb-4">
              Novo Evento
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label
                  htmlFor="titulo-evento"
                  className="block text-xs text-zinc-500 mb-1.5"
                >
                  Título do Evento
                </label>
                <input
                  id="titulo-evento"
                  type="text"
                  placeholder="Ex: Prova N1"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="tipo-evento"
                  className="block text-xs text-zinc-500 mb-1.5"
                >
                  Tipo
                </label>
                <select
                  id="tipo-evento"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as TipoEvento | "")}
                  className={inputClass + " cursor-pointer"}
                >
                  <option value="">Selecione o tipo</option>
                  {TIPOS_EVENTO.map((opcao) => (
                    <option key={opcao} value={opcao}>
                      {opcao}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="data-evento"
                  className="block text-xs text-zinc-500 mb-1.5"
                >
                  Data do Evento
                </label>
                <input
                  id="data-evento"
                  type="date"
                  value={dataEvento}
                  onChange={(e) => setDataEvento(e.target.value)}
                  className={inputClass + " [color-scheme:dark]"}
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="descricao-evento"
                  className="block text-xs text-zinc-500 mb-1.5"
                >
                  Descrição / Orientações{" "}
                  <span className="text-zinc-600">(opcional)</span>
                </label>
                <textarea
                  id="descricao-evento"
                  rows={3}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Instruções, material permitido, sala, etc."
                  className={inputClass + " resize-y min-h-[80px]"}
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="submit"
                disabled={salvando || !turmaSelecionada}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white text-black text-sm font-medium px-4 py-2.5 hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {salvando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Adicionar à Agenda"
                )}
              </button>
            </div>
          </form>

          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-white">
                Eventos da turma
              </h2>
              {turmaSelecionada && (
                <span className="text-xs text-zinc-500">
                  {carregandoEventos
                    ? "Carregando..."
                    : `${eventos.length} evento${eventos.length === 1 ? "" : "s"}`}
                </span>
              )}
            </div>

            {!turmaSelecionada ? (
              <p className="text-sm text-zinc-500 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 px-5 py-8 text-center">
                Selecione uma turma para ver e cadastrar eventos.
              </p>
            ) : carregandoEventos ? (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/40 px-5 py-10 text-sm text-zinc-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando eventos...
              </div>
            ) : eventos.length === 0 ? (
              <p className="text-sm text-zinc-500 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 px-5 py-8 text-center">
                Nenhum evento cadastrado para esta turma.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {eventos.map((evento) => (
                  <article
                    key={evento.id}
                    className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-wide">
                          {formatarDataEvento(evento.data_evento)}
                        </p>
                        <h3 className="mt-1 text-sm font-semibold text-white leading-snug">
                          {evento.titulo}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleExcluirEvento(evento.id)}
                        disabled={excluindoId === evento.id}
                        className="shrink-0 rounded-lg p-2 text-zinc-500 hover:bg-zinc-900 hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
                        aria-label={`Excluir evento ${evento.titulo}`}
                        title="Excluir evento"
                      >
                        {excluindoId === evento.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <p className="text-xs text-zinc-400">
                      {evento.disciplina?.trim() || disciplinaProfessor || "—"}
                    </p>

                    <span
                      className={`inline-flex w-fit rounded-md px-2 py-0.5 text-[11px] font-medium ${getCorTag(
                        evento.tipo_evento
                      )}`}
                    >
                      {evento.tipo_evento}
                    </span>

                    {evento.descricao?.trim() ? (
                      <p className="text-xs text-zinc-500 line-clamp-3">
                        {evento.descricao}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
