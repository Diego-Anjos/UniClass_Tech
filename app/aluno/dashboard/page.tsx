"use client";

import { useEffect, useState } from "react";
import { Clock, TrendingUp, Info } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAlunoSession } from "@/lib/aluno-session";

/** Limite institucional de faltas (reprovação por frequência). */
const LIMITE_CRITICO_FALTAS_PCT = 25;

const TEXTO_TOOLTIP_FALTAS =
  "A sua percentagem de faltas é calculada com base no total de aulas ministradas. Lembre-se: atingir 25% de faltas resulta em reprovação.";

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

function formatarSemestre(raw: unknown): string {
  if (raw == null || raw === "") return "1º Semestre";
  const texto = String(raw).trim();
  if (!texto) return "1º Semestre";
  if (/semestre/i.test(texto)) return texto.replace(/ºº+/g, "º");
  const numero = texto.replace(/º/g, "").trim();
  return numero ? `${numero}º Semestre` : "1º Semestre";
}

function toNum(valor: unknown): number | null {
  if (valor == null || valor === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

/**
 * Extrai a nota parcial de uma linha (ficha `alunos` ou tabela `notas`).
 * Prioridade: media_final → n1 → soma atv1–atv4+prova.
 */
function notaParcialDaLinha(row: Record<string, unknown>): number | null {
  const mediaFinal = toNum(row.media_final);
  if (mediaFinal != null && mediaFinal > 0) return mediaFinal;

  const n1 = toNum(row.n1);
  if (n1 != null && n1 > 0) return n1;

  const composto =
    (toNum(row.atv1) ?? 0) +
    (toNum(row.atv2) ?? 0) +
    (toNum(row.atv3) ?? 0) +
    (toNum(row.atv4) ?? 0) +
    (toNum(row.prova) ?? 0);

  return composto > 0 ? composto : null;
}

function mediaDeNotas(rows: Record<string, unknown>[]): number | null {
  const vals = rows
    .map((r) => notaParcialDaLinha(r))
    .filter((n): n is number => n != null && n > 0);
  if (vals.length === 0) return null;
  return vals.reduce((acc, n) => acc + n, 0) / vals.length;
}

function normalizarTurma(raw: unknown): TurmaVinculo | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw[0] ? normalizarTurma(raw[0]) : null;
  if (typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  let professor: string | null = null;
  const nested = t.professores;
  if (nested && typeof nested === "object") {
    const obj = Array.isArray(nested) ? nested[0] : nested;
    if (obj && typeof obj === "object" && (obj as Record<string, unknown>).nome != null) {
      const n = String((obj as Record<string, unknown>).nome).trim();
      if (n) professor = n;
    }
  }
  if (!professor && t.professor != null) {
    professor = String(t.professor);
  }
  return {
    curso: t.curso != null ? String(t.curso) : null,
    sala: t.sala != null ? String(t.sala) : null,
    turno: t.turno != null ? String(t.turno) : null,
    dias_aula: (t.dias_aula as string[] | string | null) ?? null,
    carga_horaria: toNum(t.carga_horaria),
    professor,
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

function isFaltaStatus(status: unknown): boolean {
  return String(status ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .includes("falta");
}

export default function AlunoDashboardPage() {
  const { alunoLogado, carregandoSessao } = useAlunoSession();
  const [aluno, setAluno] = useState<AlunoInfo | null>(null);
  const [mediaGeral, setMediaGeral] = useState<number | null>(null);
  const [faltasTotais, setFaltasTotais] = useState(0);
  const [totalAulas, setTotalAulas] = useState(0);
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

        // ── Notas + turmas (mesma estratégia do boletim) ──
        let notasRows: Record<string, unknown>[] = [];

        const { data: notasData, error: notasError } = await supabase
          .from("notas")
          .select(
            "n1, n2, media_final, faltas, turma, turmas(curso, sala, turno, dias_aula, carga_horaria, professor_id, professores!professor_id(nome))"
          )
          .eq("ra_aluno", ra);

        if (notasError) {
          console.warn(
            "Erro ao buscar notas com join (tentando select simples):",
            notasError.message
          );
          const simples = await supabase
            .from("notas")
            .select("n1, n2, media_final, faltas, turma")
            .eq("ra_aluno", ra);

          if (simples.error) {
            console.warn(
              "Erro ao buscar tabela notas:",
              simples.error.message
            );
          } else {
            notasRows = (simples.data ?? []) as Record<string, unknown>[];
          }
        } else {
          notasRows = (notasData ?? []) as Record<string, unknown>[];
        }

        // Fallback: ficha do aluno (schema real: atv1–atv4, prova, n1)
        if (notasRows.length === 0) {
          const { data: fichaNotas, error: fichaError } = await supabase
            .from("alunos")
            .select(
              "turma, curso, professor, atv1, atv2, atv3, atv4, prova, n1, faltas"
            )
            .eq("ra", ra);

          if (fichaError) {
            console.error(
              "Erro no fallback de notas do dashboard:",
              fichaError.message
            );
            // Último recurso: linha já carregada no perfil
            if (alunoData) {
              notasRows = [alunoData as Record<string, unknown>];
            }
          } else {
            notasRows = (fichaNotas ?? []) as Record<string, unknown>[];
          }
        }

        setMediaGeral(mediaDeNotas(notasRows));

        const turmasVinculadas = notasRows
          .map((n) => normalizarTurma(n.turmas))
          .filter((t): t is TurmaVinculo => t !== null);

        // Se o fallback veio da ficha sem join de turmas, tenta carregar pela coluna turma
        if (turmasVinculadas.length === 0) {
          const codigosTurma = [
            ...new Set(
              notasRows
                .map((r) => String(r.turma ?? "").trim())
                .filter(Boolean)
            ),
          ];
          if (codigosTurma.length > 0) {
            const { data: turmasData, error: turmasError } = await supabase
              .from("turmas")
              .select(
                "codigo, curso, sala, turno, dias_aula, carga_horaria, professor_id, professores!professor_id(nome)"
              )
              .in("codigo", codigosTurma);

            if (turmasError) {
              console.warn(
                "Erro ao buscar turmas para agenda:",
                turmasError.message
              );
            } else {
              for (const t of turmasData ?? []) {
                const normalizada = normalizarTurma(t as Record<string, unknown>);
                if (normalizada) turmasVinculadas.push(normalizada);
              }
            }
          }
        }

        const cargaTotal = turmasVinculadas.reduce((acc, t) => {
          const carga = toNum(t.carga_horaria) ?? 0;
          return acc + carga;
        }, 0);

        // ── Faltas reais (registro_chamada) + fallback alunos.faltas ──
        let faltasCount = 0;
        let aulasMinistradas = 0;

        const { data: chamadaRows, error: chamadaError } = await supabase
          .from("registro_chamada")
          .select("status, data_aula")
          .eq("aluno_ra", ra);

        if (chamadaError) {
          console.error(
            "Erro ao buscar registro_chamada:",
            chamadaError.message
          );
        } else {
          const rows = chamadaRows ?? [];
          faltasCount = rows.filter((r) => isFaltaStatus(r.status)).length;
          // Cada registro = 1 aula ministrada (presente ou falta)
          aulasMinistradas = rows.length;
        }

        // Fallback: coluna faltas na ficha do aluno
        const faltasFicha = toNum(
          (alunoData as Record<string, unknown> | null)?.faltas
        );
        if (faltasCount === 0 && faltasFicha != null && faltasFicha > 0) {
          faltasCount = faltasFicha;
        }

        // Sem chamadas ainda: usa carga horária das disciplinas como denominador
        if (aulasMinistradas <= 0 && cargaTotal > 0) {
          aulasMinistradas = Math.max(1, Math.round(cargaTotal));
        }

        setFaltasTotais(faltasCount);
        setTotalAulas(aulasMinistradas);

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
        setTotalAulas(0);
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
    mediaGeral !== null && mediaGeral > 0
      ? mediaGeral >= 7
        ? {
            label: "Bom Desempenho",
            className:
              "bg-emerald-950 text-emerald-400 border-emerald-900",
          }
        : mediaGeral >= 6
          ? {
              label: "Média Parcial",
              className: "bg-amber-950 text-amber-400 border-amber-900",
            }
          : {
              label: "Atenção",
              className: "bg-red-950 text-red-400 border-red-900",
            }
      : {
          label: "Sem Notas",
          className: "bg-zinc-900 text-zinc-400 border-zinc-800",
        };

  const pctFaltas =
    totalAulas > 0
      ? Math.min(100, Math.round((faltasTotais / totalAulas) * 100))
      : 0;
  const emRiscoFrequencia = pctFaltas >= LIMITE_CRITICO_FALTAS_PCT;
  const barraFaltasClass = emRiscoFrequencia
    ? "bg-red-500"
    : pctFaltas >= 15
      ? "bg-amber-500"
      : "bg-emerald-500";

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-10">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">
              Olá, {aluno ? aluno.nome.split(" ")[0] : "Estudante"}!
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Curso: {aluno ? aluno.curso : "Matrícula Pendente"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <div className="p-6 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-500 uppercase tracking-widest">
                  Média Geral
                </p>
                <TrendingUp className="w-4 h-4 text-zinc-600" />
              </div>
              <p className="text-4xl font-semibold tracking-tight">
                {mediaGeral !== null && mediaGeral > 0
                  ? mediaGeral.toFixed(1)
                  : "---"}
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
                <div className="relative group">
                  <button
                    type="button"
                    className="text-zinc-600 hover:text-zinc-300 transition-colors cursor-help"
                    aria-label="Informação sobre o cálculo de faltas"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                  <div
                    role="tooltip"
                    className="pointer-events-none absolute right-0 top-full z-20 mt-2 w-64 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-left text-xs leading-relaxed text-zinc-300 opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
                  >
                    {TEXTO_TOOLTIP_FALTAS}
                  </div>
                </div>
              </div>
              <p className="text-4xl font-semibold tracking-tight">
                {faltasTotais}
                <span className="text-lg text-zinc-500 font-normal">
                  /{totalAulas > 0 ? totalAulas : "—"}
                </span>
              </p>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${barraFaltasClass}`}
                  style={{ width: `${pctFaltas}%` }}
                />
              </div>
              <p
                className={`text-xs ${
                  emRiscoFrequencia ? "text-red-400" : "text-zinc-600"
                }`}
              >
                {totalAulas > 0
                  ? `${pctFaltas}% de faltas · limite crítico: ${LIMITE_CRITICO_FALTAS_PCT}%`
                  : "Sem aulas registradas ainda"}
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
  );
}
