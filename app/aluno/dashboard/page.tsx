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
import {
  limparSessaoAluno,
  useAlunoSession,
} from "@/lib/aluno-session";

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral", href: "/aluno/dashboard", active: true },
  { icon: ClipboardList, label: "Boletim e Notas", href: "/aluno/dashboard/notas", active: false },
  { icon: CalendarCheck, label: "Frequência", href: "/aluno/dashboard/frequencia", active: false },
  { icon: BookOpen, label: "Grade e Matérias", href: "/aluno/dashboard/grade", active: false },
  { icon: Map, label: "Mapa de Salas e Labs", href: "/aluno/dashboard/mapa", active: false },
  { icon: MessageSquare, label: "Contato", href: "/aluno/dashboard/contato", active: false },
];

const DIAS_SEMANA = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
] as const;

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
  local: string;
  horario: string;
};

type Aviso = {
  tipo: string;
  autor: string;
  msg: string;
};

type TurmaVinculo = {
  curso?: string | null;
  sala?: string | null;
  turno?: string | null;
  dias_aula?: string[] | string | null;
  carga_horaria?: number | null;
  professor?: string | null;
};

function iniciaisDe(nome: string) {
  return (
    nome
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "—"
  );
}

function formatarSemestre(raw: unknown): string {
  if (raw == null || raw === "") return "1º Semestre";
  const texto = String(raw);
  return texto.includes("Semestre") ? texto : `${texto}º Semestre`;
}

function toNum(valor: unknown): number | null {
  if (valor == null || valor === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

function normalizarTurma(raw: unknown): TurmaVinculo | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw[0] ? normalizarTurma(raw[0]) : null;
  if (typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  return {
    curso: t.curso != null ? String(t.curso) : null,
    sala: t.sala != null ? String(t.sala) : null,
    turno: t.turno != null ? String(t.turno) : null,
    dias_aula: (t.dias_aula as string[] | string | null) ?? null,
    carga_horaria: toNum(t.carga_horaria),
    professor: t.professor != null ? String(t.professor) : null,
  };
}

function normalizarDiasAula(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function turmaOcorreHoje(turma: TurmaVinculo, diaHoje: string): boolean {
  const dias = normalizarDiasAula(turma.dias_aula);
  if (dias.length === 0) return false;
  const hojeNorm = diaHoje
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return dias.some((d) => {
    const lower = d
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return lower === hojeNorm || lower.startsWith(hojeNorm.slice(0, 3));
  });
}

export default function AlunoDashboardPage() {
  const { alunoLogado, carregandoSessao } = useAlunoSession();
  const [aluno, setAluno] = useState<AlunoInfo | null>(null);
  const [mediaGeral, setMediaGeral] = useState<number | null>(null);
  const [faltasTotais, setFaltasTotais] = useState(0);
  const [limiteFaltas, setLimiteFaltas] = useState(40);
  const [proximaAula, setProximaAula] = useState<ProximaAula | null>(null);
  const [aulasHoje, setAulasHoje] = useState<AulaHoje[]>([]);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (carregandoSessao || !alunoLogado) return;

    async function carregarDashboard() {
      setLoading(true);
      const ra = alunoLogado!.ra;
      const diaHoje = DIAS_SEMANA[new Date().getDay()];

      try {
        // ── Perfil do aluno logado ──
        const { data: alunoData, error: alunoError } = await supabase
          .from("alunos")
          .select("*")
          .eq("ra", ra)
          .single();

        if (alunoError || !alunoData) {
          if (alunoError) {
            console.error("Erro ao buscar aluno:", alunoError.message);
          }
          setAluno({
            nome: alunoLogado!.nome,
            ra,
            curso: alunoLogado!.curso || "Tecnologia da Informação",
            semestre: formatarSemestre(alunoLogado!.semestreAtual),
          });
        } else {
          setAluno({
            nome: String(alunoData.nome ?? alunoLogado!.nome),
            ra: String(alunoData.ra || alunoData.matricula || ra),
            curso: String(
              alunoData.curso || alunoLogado!.curso || "Tecnologia da Informação"
            ),
            semestre: formatarSemestre(
              alunoData.semestre_atual ??
                alunoData.semestre ??
                alunoLogado!.semestreAtual
            ),
          });
        }

        // ── Notas + turmas do RA ──
        const { data: notasData, error: notasError } = await supabase
          .from("notas")
          .select(
            "media_final, turmas(curso, sala, turno, dias_aula, carga_horaria, professor)"
          )
          .eq("ra_aluno", ra);

        if (notasError) {
          console.error("Erro ao buscar notas/turmas:", notasError.message);
        }

        const notasRows = (notasData ?? []) as Record<string, unknown>[];

        const mediasValidas = notasRows
          .map((n) => toNum(n.media_final))
          .filter((n): n is number => n !== null);

        if (mediasValidas.length > 0) {
          const soma = mediasValidas.reduce((acc, n) => acc + n, 0);
          setMediaGeral(soma / mediasValidas.length);
        } else {
          setMediaGeral(null);
        }

        const turmasVinculadas = notasRows
          .map((n) => normalizarTurma(n.turmas))
          .filter((t): t is TurmaVinculo => t !== null);

        const cargaTotal = turmasVinculadas.reduce((acc, t) => {
          const carga = toNum(t.carga_horaria) ?? 0;
          return acc + carga;
        }, 0);
        const limiteCalculado =
          cargaTotal > 0 ? Math.max(1, Math.floor(cargaTotal * 0.25)) : 40;
        setLimiteFaltas(limiteCalculado);

        // ── Faltas (schema real: registro_chamada + aluno_ra) ──
        let faltasCount = 0;
        const faltasQuery = await supabase
          .from("registro_chamada")
          .select("status")
          .eq("aluno_ra", ra)
          .ilike("status", "falta");

        if (faltasQuery.error) {
          // Fallback: tenta nomes alternativos pedidos no spec
          const alt = await supabase
            .from("registro_chamadas")
            .select("status")
            .eq("ra_aluno", ra)
            .eq("status", "Falta");

          if (alt.error) {
            console.error(
              "Erro ao buscar faltas:",
              faltasQuery.error.message,
              alt.error.message
            );
          } else {
            faltasCount = (alt.data ?? []).length;
          }
        } else {
          faltasCount = (faltasQuery.data ?? []).length;
        }
        setFaltasTotais(faltasCount);

        // ── Aulas de hoje / próxima aula ──
        const aulasDoDia = turmasVinculadas.filter((t) =>
          turmaOcorreHoje(t, diaHoje)
        );

        const listaHoje: AulaHoje[] = aulasDoDia.map((t) => ({
          materia: t.curso?.trim() || "Disciplina",
          local: t.sala?.trim()
            ? t.sala.toLowerCase().startsWith("sala")
              ? t.sala
              : `Sala ${t.sala}`
            : "Sala a definir",
          horario: t.turno?.trim() || "—",
        }));
        setAulasHoje(listaHoje);

        if (listaHoje.length > 0) {
          const primeira = listaHoje[0];
          setProximaAula({
            disciplina: primeira.materia,
            local: primeira.local,
            horario: primeira.horario,
          });
        } else {
          setProximaAula(null);
        }

        // ── Mural de avisos (mensagens) ──
        const avisosMapeados: Aviso[] = [];
        const { data: msgsRa, error: msgsRaError } = await supabase
          .from("mensagens")
          .select(
            "assunto, conteudo, remetente, origem, destinatario, ra, aluno_ra, data_envio"
          )
          .or(
            `ra.eq.${ra},aluno_ra.eq.${ra},destinatario.eq.${ra},destinatario.ilike.%${ra}%`
          )
          .order("data_envio", { ascending: false })
          .limit(8);

        let msgsRows = msgsRa ?? [];

        if (msgsRaError || msgsRows.length === 0) {
          if (msgsRaError) {
            console.warn("Mensagens por RA:", msgsRaError.message);
          }
          const gerais = await supabase
            .from("mensagens")
            .select(
              "assunto, conteudo, remetente, origem, destinatario, ra, aluno_ra, data_envio"
            )
            .or(
              "origem.eq.secretaria,destino.eq.aluno,destinatario.ilike.%aluno%,destinatario.ilike.%geral%"
            )
            .order("data_envio", { ascending: false })
            .limit(8);

          if (gerais.error) {
            console.warn("Mensagens gerais:", gerais.error.message);
          } else {
            msgsRows = gerais.data ?? [];
          }
        }

        for (const row of msgsRows) {
          const r = row as Record<string, unknown>;
          const assunto = String(r.assunto ?? "").trim();
          const conteudo = String(r.conteudo ?? r.mensagem ?? "").trim();
          if (!assunto && !conteudo) continue;

          const origem = String(r.origem ?? "").toLowerCase();
          avisosMapeados.push({
            tipo:
              origem === "secretaria" || origem === "admin"
                ? "aviso"
                : origem === "professor" || origem === "docente"
                  ? "feedback"
                  : "aviso",
            autor: String(
              r.remetente ?? r.docente ?? r.origem ?? "UniClassTech"
            ),
            msg: conteudo || assunto,
          });
        }
        setAvisos(avisosMapeados);
      } catch (err) {
        console.error("Erro ao carregar dashboard do aluno:", err);
        setMediaGeral(null);
        setFaltasTotais(0);
        setLimiteFaltas(40);
        setProximaAula(null);
        setAulasHoje([]);
        setAvisos([]);
      } finally {
        setLoading(false);
      }
    }

    void carregarDashboard();
  }, [alunoLogado, carregandoSessao]);

  const badgeMedia =
    mediaGeral !== null
      ? mediaGeral >= 7
        ? {
            label: "Aprovado",
            className:
              "bg-emerald-950 text-emerald-400 border-emerald-900",
          }
        : {
            label: "Atenção",
            className: "bg-amber-950 text-amber-400 border-amber-900",
          }
      : {
          label: "Sem Notas",
          className: "bg-zinc-900 text-zinc-400 border-zinc-800",
        };

  const pctFaltas =
    limiteFaltas > 0
      ? Math.min(100, Math.round((faltasTotais / limiteFaltas) * 100))
      : 0;

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
                <p className="text-xs text-zinc-500">RA: {aluno?.ra || "—"}</p>
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

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 py-10">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">
              Olá, {aluno ? aluno.nome.split(" ")[0] : "Estudante"}!
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Curso: {aluno ? aluno.curso : "Matrícula Pendente"}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="p-6 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-500 uppercase tracking-widest">
                  Média Geral
                </p>
                <TrendingUp className="w-4 h-4 text-zinc-600" />
              </div>
              <p className="text-4xl font-semibold tracking-tight">
                {mediaGeral !== null ? mediaGeral.toFixed(1) : "---"}
              </p>
              <span
                className={`self-start text-xs font-medium px-2 py-0.5 rounded-full border ${badgeMedia.className}`}
              >
                {badgeMedia.label}
              </span>
            </div>

            <div className="p-6 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-500 uppercase tracking-widest">
                  Faltas Totais
                </p>
                <AlertCircle className="w-4 h-4 text-zinc-600" />
              </div>
              <p className="text-4xl font-semibold tracking-tight">
                {faltasTotais}
                <span className="text-lg text-zinc-500 font-normal">
                  /{limiteFaltas}
                </span>
              </p>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-600 rounded-full transition-all"
                  style={{ width: `${pctFaltas}%` }}
                />
              </div>
              <p className="text-xs text-zinc-600">
                {pctFaltas}% do limite utilizado
              </p>
            </div>

            <div className="p-6 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-500 uppercase tracking-widest">
                  Próxima Aula
                </p>
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
                <>
                  <p className="text-xl font-semibold leading-snug">Dia Livre</p>
                  <p className="text-sm text-zinc-400">
                    Aproveite para estudar
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Aulas de Hoje</h2>
                <span className="text-xs text-zinc-600">
                  {loading
                    ? "Carregando..."
                    : `${aulasHoje.length} turma(s)`}
                </span>
              </div>
              <div className="divide-y divide-zinc-800">
                {aulasHoje.length === 0 ? (
                  <p className="px-6 py-8 text-sm text-zinc-500 text-center">
                    Você não tem aulas presenciais agendadas para hoje.
                  </p>
                ) : (
                  aulasHoje.map((aula, index) => (
                    <div
                      key={`${aula.materia}-${aula.horario}-${index}`}
                      className="flex items-start gap-4 px-6 py-4 hover:bg-zinc-900/50 transition-colors"
                    >
                      <div className="shrink-0 mt-0.5 text-xs font-medium text-zinc-500 w-14 text-right">
                        {aula.horario}
                      </div>
                      <div className="w-px self-stretch bg-zinc-800 mx-1" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white">
                          {aula.materia}
                        </p>
                        <p className="text-xs text-zinc-600 mt-0.5">
                          {aula.local}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-800">
                <h2 className="text-sm font-semibold">
                  Mural de Avisos & Feedbacks
                </h2>
              </div>
              <div className="flex flex-col divide-y divide-zinc-800">
                {avisos.length === 0 ? (
                  <p className="px-5 py-8 text-sm text-zinc-500 text-center">
                    Nenhum aviso ou feedback recente.
                  </p>
                ) : (
                  avisos.map((a, i) => (
                    <div
                      key={i}
                      className="px-5 py-4 hover:bg-zinc-900/50 transition-colors"
                    >
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
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        {a.msg}
                      </p>
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
