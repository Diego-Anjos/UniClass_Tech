"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAlunoSession } from "@/lib/aluno-session";

type EventoCalendario = {
  id: string;
  titulo: string;
  tipo_evento: string;
  data_evento: string;
  descricao: string | null;
  turma: string;
  disciplina: string | null;
  professor_id?: string | null;
  nome_professor?: string | null;
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
            "id, titulo, tipo_evento, data_evento, descricao, turma, disciplina, professor_id"
          )
          .eq("turma", turma)
          .order("data_evento", { ascending: true });

        if (cancelado) return;

        if (error) {
          console.error("Erro ao carregar calendário:", error.message);
          setEventos([]);
          return;
        }

        const eventosBrutos = (data as EventoCalendario[]) ?? [];

        if (eventosBrutos.length === 0) {
          setEventos([]);
          return;
        }

        const idsProfessores = [
          ...new Set(
            eventosBrutos
              .map((e) => e.professor_id?.trim())
              .filter((id): id is string => Boolean(id))
          ),
        ];

        const mapProfessores: Record<string, string> = {};

        if (idsProfessores.length > 0) {
          const { data: professoresData, error: professoresError } =
            await supabase
              .from("professores")
              .select("id, nome")
              .in("id", idsProfessores);

          if (cancelado) return;

          if (professoresError) {
            console.error(
              "Erro ao carregar nomes dos professores:",
              professoresError.message
            );
          } else {
            for (const prof of professoresData ?? []) {
              const id = String(prof.id ?? "").trim();
              const nome = String(prof.nome ?? "").trim();
              if (id && nome) mapProfessores[id] = nome;
            }
          }
        }

        if (cancelado) return;

        setEventos(
          eventosBrutos.map((evento) => {
            const pid = evento.professor_id?.trim();
            return {
              ...evento,
              nome_professor: pid ? mapProfessores[pid] ?? null : null,
            };
          })
        );
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
      <div className="flex items-center justify-center py-20">
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-10">
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
                    {evento.nome_professor
                      ? ` • Prof. ${evento.nome_professor}`
                      : ""}
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
  );
}
