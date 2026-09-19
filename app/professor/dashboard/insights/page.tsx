"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
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
  ChevronDown,
  Send,
  UserRound,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { ProfessorSettingsControl } from "@/components/professor/config-modal";
import { ProfessorAvatar } from "@/components/professor/professor-avatar";
import {
  limparSessaoProfessor,
  parseTurmasProfessor,
  useProfessorSession,
} from "@/lib/professor-session";

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral",    href: "/professor/dashboard",           active: false },
  { icon: BookOpen,        label: "Turmas e Notas", href: "/professor/dashboard/notas",     active: false },
  { icon: UserCheck,       label: "Chamada Rápida", href: "/professor/dashboard/chamada",   active: false },
  { icon: CalendarDays,    label: "Agenda Semestral", href: "/professor/dashboard/agenda",  active: false },
  { icon: MapIcon, label: "Mapa de Salas", href: "/professor/dashboard/mapa", active: false },
  { icon: Sparkles,        label: "Insights IA",    href: "/professor/dashboard/insights",  active: true  },
  { icon: MessageSquare,   label: "Mensagens",      href: "/professor/dashboard/mensagens",  active: false },
];

const anoAtual = new Date().getFullYear();
const anosDisponiveis = Array.from(
  { length: anoAtual - 2026 + 1 },
  (_, i) => 2026 + i
);

type AlunoInsight = {
  id: string;
  nome: string;
  ra: string;
  curso: string;
  semestre: number;
  professor: string;
  n1: number | null;
};

type NotasAlunoResumo = {
  n1: number | null;
  n2: number | null;
  n3: number | null;
  media: number | null;
};

type TurmaOption = {
  id: string;
  codigo: string;
  curso: string;
  turno?: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ResumoEngajamento = {
  totalRegistros: number;
  presentes: number;
  faltas: number;
  taxaPresenca: number;
  taxaFaltas: number;
  fonte: "registro_chamada";
  resumo: string;
};

type FiltrosMacro = {
  ano: string;
  semestre: string;
};

type DadoGraficoMacro = {
  mes: string;
  notaMedia: number;
  frequencia: number;
};

type MesSerie = { mes: string; n: number };

const MSG_IA_INDISPONIVEL =
  "O assistente atingiu o limite de uso gratuito temporário do Google. Por favor, tente novamente em alguns minutos.";

const MESES_1_SEMESTRE: MesSerie[] = [
  { mes: "Jan", n: 1 },
  { mes: "Fev", n: 2 },
  { mes: "Mar", n: 3 },
  { mes: "Abr", n: 4 },
  { mes: "Mai", n: 5 },
  { mes: "Jun", n: 6 },
];

const MESES_2_SEMESTRE: MesSerie[] = [
  { mes: "Jul", n: 7 },
  { mes: "Ago", n: 8 },
  { mes: "Set", n: 9 },
  { mes: "Out", n: 10 },
  { mes: "Nov", n: 11 },
  { mes: "Dez", n: 12 },
];

function labelTurma(turma: TurmaOption) {
  const turno = turma.turno ? ` (${turma.turno})` : "";
  return `${turma.curso} - Turma ${turma.codigo}${turno}`;
}

function iniciaisDoNome(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .join("");
}

function mensagemInicialIA(nomeAluno: string): ChatMessage {
  return {
    role: "assistant",
    content: `Olá, professor! Estou analisando o histórico de ${nomeAluno}. O que gostaria de saber sobre o desempenho dele(a)?`,
  };
}

/** 1º Semestre: Jan–Jun · 2º Semestre: Jul–Dez. */
function rangeDoSemestre(ano: number, semestre: string) {
  const eSegundo = semestre === "2º Semestre";
  return {
    meses: eSegundo ? MESES_2_SEMESTRE : MESES_1_SEMESTRE,
    inicio: eSegundo ? `${ano}-07-01T00:00:00Z` : `${ano}-01-01T00:00:00Z`,
    fim: eSegundo ? `${ano}-12-31T23:59:59Z` : `${ano}-06-30T23:59:59Z`,
  };
}

function parseDataISO(raw: unknown): Date | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const d = new Date(s.includes("T") ? s : `${s}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function mediaNumeros(valores: number[]): number {
  if (valores.length === 0) return 0;
  return Number(
    (valores.reduce((acc, v) => acc + v, 0) / valores.length).toFixed(1)
  );
}

function mensagemErroChat(status: number, payload: Record<string, unknown>) {
  const reply =
    typeof payload.reply === "string" ? payload.reply.trim() : "";
  if (reply) return reply;
  const error =
    typeof payload.error === "string" ? payload.error.trim() : "";
  if (status === 429 || status === 503) return MSG_IA_INDISPONIVEL;
  if (error) return error;
  return MSG_IA_INDISPONIVEL;
}

export default function ProfessorInsightsPage() {
  const { professorLogado, carregandoSessao } = useProfessorSession();
  const [turmas, setTurmas] = useState<TurmaOption[]>([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState("");
  const [carregandoTurmas, setCarregandoTurmas] = useState(true);
  const [alunos, setAlunos] = useState<AlunoInsight[]>([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState<AlunoInsight | null>(
    null
  );
  const [resumoAluno, setResumoAluno] = useState<ResumoEngajamento | null>(null);
  const [mediaAluno, setMediaAluno] = useState<number | null>(null);
  const [notasAluno, setNotasAluno] = useState<NotasAlunoResumo | null>(null);
  const [carregandoAlunos, setCarregandoAlunos] = useState(false);
  const [carregandoResumo, setCarregandoResumo] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputChat, setInputChat] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [filtrosMacro, setFiltrosMacro] = useState<FiltrosMacro>({
    ano: anoAtual.toString(),
    semestre: "1º Semestre",
  });
  const [dadosGrafico, setDadosGrafico] = useState<DadoGraficoMacro[]>([]);
  const [carregandoGrafico, setCarregandoGrafico] = useState(false);
  const [analiseMacroIA, setAnaliseMacroIA] = useState("");
  const [carregandoMacro, setCarregandoMacro] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const alunoRa = alunoSelecionado?.ra ?? "";
  const alunoId = alunoSelecionado?.id ?? "";
  const professorId = professorLogado?.id ?? "";
  const professorTitulo = professorLogado?.nomeCompletoTitulo ?? "";
  const professorArea = professorLogado?.area_atuacao ?? "";

  const ano = filtrosMacro.ano;
  const semestre = filtrosMacro.semestre;

  const turmaMeta = useMemo(
    () => turmas.find((t) => t.codigo === turmaSelecionada) ?? null,
    [turmas, turmaSelecionada]
  );
  const turmaId = turmaMeta?.id ?? "";

  const contextoAluno = useMemo(() => {
    if (!alunoSelecionado) {
      return "Nenhum aluno específico selecionado. Fale sobre a turma em geral.";
    }

    const taxaFaltas = resumoAluno?.taxaFaltas;
    const taxaPresenca = resumoAluno?.taxaPresenca;
    const media =
      mediaAluno ??
      notasAluno?.media ??
      (alunoSelecionado.n1 != null && Number.isFinite(alunoSelecionado.n1)
        ? alunoSelecionado.n1
        : null);
    const n1 = notasAluno?.n1 ?? alunoSelecionado.n1;
    const n2 = notasAluno?.n2 ?? null;
    const n3 = notasAluno?.n3 ?? null;

    return [
      `Nome: ${alunoSelecionado.nome}`,
      `RA: ${alunoSelecionado.ra}`,
      `Curso: ${alunoSelecionado.curso}`,
      `Semestre do aluno: ${alunoSelecionado.semestre}`,
      `Turma selecionada: ${turmaSelecionada || "—"}`,
      `Professor vinculado: ${alunoSelecionado.professor || "—"}`,
      `N1: ${n1 != null ? Number(n1).toFixed(1) : "indisponível no banco"}`,
      `N2: ${n2 != null ? Number(n2).toFixed(1) : "indisponível no banco"}`,
      `N3: ${n3 != null ? Number(n3).toFixed(1) : "indisponível no banco"}`,
      media != null
        ? `Média atual: ${media.toFixed(1)}`
        : "Média atual: indisponível no banco",
      taxaPresenca != null
        ? `Taxa de presença: ${taxaPresenca}%`
        : "Taxa de presença: indisponível",
      taxaFaltas != null
        ? `Percentual de faltas: ${taxaFaltas}%`
        : "Percentual de faltas: indisponível",
      resumoAluno
        ? `Registros de chamada: ${resumoAluno.presentes} presentes, ${resumoAluno.faltas} faltas em ${resumoAluno.totalRegistros} aula(s).`
        : "Sem registros de chamada carregados.",
      resumoAluno?.resumo ? `Resumo: ${resumoAluno.resumo}` : null,
      "Use APENAS estes dados reais. Não invente notas, faltas ou eventos.",
    ]
      .filter(Boolean)
      .join("\n");
  }, [alunoSelecionado, resumoAluno, mediaAluno, notasAluno, turmaSelecionada]);

  function limparContextoIndividual() {
    setAlunoSelecionado(null);
    setResumoAluno(null);
    setMediaAluno(null);
    setNotasAluno(null);
    setMessages([]);
    setInputChat("");
    setIsTyping(false);
  }

  useEffect(() => {
    if (!professorLogado?.id) {
      setTurmas([]);
      setTurmaSelecionada("");
      setCarregandoTurmas(false);
      return;
    }

    let cancelado = false;

    async function fetchTurmas() {
      setCarregandoTurmas(true);
      const codigos = parseTurmasProfessor(professorLogado!.turmas);
      const vinculoProfessor = professorLogado!.nomeCompletoTitulo?.trim() ?? "";
      const selectCols = "id, codigo, curso, turno";

      let data: Record<string, unknown>[] | null = null;
      let error: { message: string } | null = null;

      if (codigos.length > 0) {
        const res = await supabase
          .from("turmas")
          .select(selectCols)
          .in("codigo", codigos);
        data = (res.data as Record<string, unknown>[] | null) ?? null;
        error = res.error;
      } else if (vinculoProfessor) {
        const res = await supabase
          .from("turmas")
          .select(selectCols)
          .eq("professor", vinculoProfessor);
        data = (res.data as Record<string, unknown>[] | null) ?? null;
        error = res.error;
      } else {
        if (!cancelado) {
          setTurmas([]);
          setTurmaSelecionada("");
          setCarregandoTurmas(false);
        }
        return;
      }

      if (cancelado) return;

      if (error) {
        console.error("Erro ao buscar turmas:", error.message);
        setTurmas([]);
        setTurmaSelecionada("");
        setCarregandoTurmas(false);
        return;
      }

      const lista = ((data ?? []) as Record<string, unknown>[]).map(
        (turma) => ({
          id: String(turma.id),
          codigo: String(turma.codigo ?? ""),
          curso: String(turma.curso ?? ""),
          turno: turma.turno ? String(turma.turno) : undefined,
        })
      );

      setTurmas(lista);

      if (lista.length === 1) {
        setTurmaSelecionada(lista[0].codigo);
      } else {
        setTurmaSelecionada((prev) =>
          prev && lista.some((t) => t.codigo === prev) ? prev : ""
        );
      }
      setCarregandoTurmas(false);
    }

    void fetchTurmas();

    return () => {
      cancelado = true;
    };
  }, [professorLogado?.id, professorLogado?.turmas, professorLogado?.nomeCompletoTitulo]);

  // 1. Cascata Turma → Aluno: reset exclusivo (deps limpas)
  useEffect(() => {
    setAlunoSelecionado(null);
    setResumoAluno(null);
    setMediaAluno(null);
    setNotasAluno(null);
    setMessages([]);
    setInputChat("");
    setIsTyping(false);
  }, [turmaSelecionada]);

  // Lista de alunos da turma (separado do reset para não misturar responsabilidades)
  useEffect(() => {
    let cancelado = false;

    async function buscarAlunosDaTurma(codigoTurma: string) {
      setCarregandoAlunos(true);
      setAlunos([]);

      const { data, error } = await supabase
        .from("alunos")
        .select("id, nome, ra, professor, curso, semestre, n1")
        .eq("turma", codigoTurma)
        .order("nome", { ascending: true });

      if (cancelado) return;

      if (error) {
        console.error("Erro ao buscar alunos da turma:", error.message);
        setAlunos([]);
        setCarregandoAlunos(false);
        return;
      }

      const mapa = new Map<string, AlunoInsight>();
      for (const row of data ?? []) {
        const id = String(row.id);
        if (mapa.has(id)) continue;
        const n1Raw = Number(row.n1);
        mapa.set(id, {
          id,
          nome: String(row.nome ?? ""),
          ra: String(
            row.ra ||
              (row as { matricula?: string }).matricula ||
              "RA-"
          ),
          curso: String(row.curso ?? "—"),
          semestre: Number(row.semestre ?? 1) || 1,
          professor: String(row.professor ?? ""),
          n1: Number.isFinite(n1Raw) ? n1Raw : null,
        });
      }

      setAlunos(
        Array.from(mapa.values()).sort((a, b) =>
          a.nome.localeCompare(b.nome, "pt-BR")
        )
      );
      setCarregandoAlunos(false);
    }

    if (!turmaSelecionada) {
      setAlunos([]);
      setCarregandoAlunos(false);
      return;
    }

    void buscarAlunosDaTurma(turmaSelecionada.trim());

    return () => {
      cancelado = true;
    };
  }, [turmaSelecionada]);

  // Raio-X: frequência + notas reais (N1/N2/N3/média) do aluno selecionado
  useEffect(() => {
    if (!alunoRa) {
      setResumoAluno(null);
      setMediaAluno(null);
      setNotasAluno(null);
      return;
    }

    let cancelado = false;

    async function carregarRaioX() {
      setCarregandoResumo(true);

      const [chamadaRes, notasRes] = await Promise.all([
        supabase
          .from("registro_chamada")
          .select("status")
          .eq("aluno_ra", alunoRa),
        supabase
          .from("notas")
          .select("n1, n2, n3, media_final")
          .eq("ra_aluno", alunoRa),
      ]);

      if (cancelado) return;

      if (chamadaRes.error) {
        console.error(
          "Erro ao buscar registro_chamada:",
          chamadaRes.error.message
        );
        setResumoAluno(null);
      } else if (!chamadaRes.data || chamadaRes.data.length === 0) {
        setResumoAluno(null);
      } else {
        const presentes = chamadaRes.data.filter(
          (r) => String(r.status ?? "").toLowerCase() === "presente"
        ).length;
        const faltas = chamadaRes.data.filter(
          (r) => String(r.status ?? "").toLowerCase() === "falta"
        ).length;
        const total = chamadaRes.data.length;
        const taxaPresenca = Math.round((presentes / (total || 1)) * 100);
        const taxaFaltas = Math.round((faltas / (total || 1)) * 100);

        setResumoAluno({
          totalRegistros: total,
          presentes,
          faltas,
          taxaPresenca,
          taxaFaltas,
          fonte: "registro_chamada",
          resumo:
            taxaPresenca >= 85
              ? `Boa frequência: ${taxaPresenca}% de presença em ${total} registro(s) de chamada.`
              : taxaPresenca >= 70
                ? `Frequência moderada: ${taxaPresenca}% de presença, com ${faltas} falta(s) registradas.`
                : `Alerta de frequência: apenas ${taxaPresenca}% de presença e ${faltas} falta(s) em ${total} aula(s).`,
        });
      }

      if (notasRes.error) {
        console.error("Erro ao buscar notas do aluno:", notasRes.error.message);
        setMediaAluno(alunoSelecionado?.n1 ?? null);
        setNotasAluno({
          n1: alunoSelecionado?.n1 ?? null,
          n2: null,
          n3: null,
          media: alunoSelecionado?.n1 ?? null,
        });
      } else {
        const rows = notasRes.data ?? [];
        const avgCampo = (campo: "n1" | "n2" | "n3" | "media_final") => {
          const vals = rows
            .map((r) => Number(r[campo]))
            .filter((v) => Number.isFinite(v));
          return vals.length > 0 ? mediaNumeros(vals) : null;
        };
        const n1 = avgCampo("n1") ?? alunoSelecionado?.n1 ?? null;
        const n2 = avgCampo("n2");
        const n3 = avgCampo("n3");
        const media = avgCampo("media_final") ?? n1;
        setNotasAluno({ n1, n2, n3, media });
        setMediaAluno(media);
      }

      setCarregandoResumo(false);
    }

    void carregarRaioX();
    return () => {
      cancelado = true;
    };
  }, [alunoRa, alunoSelecionado?.n1]);

  useEffect(() => {
    if (!alunoId) {
      setMessages([]);
      setInputChat("");
      setIsTyping(false);
      return;
    }
    const nome = alunoSelecionado?.nome ?? "o aluno";
    setMessages([mensagemInicialIA(nome)]);
    setInputChat("");
    setIsTyping(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alunoId]);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isTyping]);

  // 2. Fetch macro (gráficos + síntese) — deps de tamanho fixo
  useEffect(() => {
    if (!turmaSelecionada || !ano || !semestre) {
      setDadosGrafico([]);
      setCarregandoGrafico(false);
      setCarregandoMacro(false);
      setAnaliseMacroIA(
        "Selecione uma turma para gerar a visão geral de desempenho."
      );
      return;
    }

    if (!professorId) {
      setDadosGrafico([]);
      setCarregandoGrafico(false);
      setCarregandoMacro(false);
      return;
    }

    let cancelado = false;
    const anoNum = Number.parseInt(ano, 10) || anoAtual;
    const { meses, inicio, fim } = rangeDoSemestre(anoNum, semestre);

    async function carregarSerieEAnaliseMacro() {
      setCarregandoGrafico(true);
      setCarregandoMacro(true);
      setDadosGrafico([]);
      setAnaliseMacroIA("");

      try {
        // RAs da turma (self-contained — não depende de estado de alunos no dep array)
        const { data: alunosTurma, error: alunosError } = await supabase
          .from("alunos")
          .select("ra, n1")
          .eq("turma", turmaSelecionada.trim());

        if (cancelado) return;

        if (alunosError) {
          console.error("Erro ao listar RAs da turma:", alunosError.message);
        }

        const ras = Array.from(
          new Set(
            (alunosTurma ?? [])
              .map((a) => String(a.ra ?? "").trim())
              .filter(Boolean)
          )
        );

        const mediaN1Fallback = mediaNumeros(
          (alunosTurma ?? [])
            .map((a) => Number(a.n1))
            .filter((v) => Number.isFinite(v))
        );

        if (ras.length === 0) {
          setDadosGrafico([]);
          setAnaliseMacroIA(
            "Nenhum aluno encontrado nesta turma para gerar a análise macro."
          );
          return;
        }

        const { data: notasRows, error: notasError } = await supabase
          .from("notas")
          .select("media_final")
          .in("ra_aluno", ras);

        if (notasError) {
          console.error("Erro ao agregar notas macro:", notasError.message);
        }

        let notaMediaTurma = mediaNumeros(
          (notasRows ?? [])
            .map((r) => Number(r.media_final))
            .filter((v) => Number.isFinite(v))
        );

        if (notaMediaTurma <= 0 && mediaN1Fallback > 0) {
          notaMediaTurma = mediaN1Fallback;
        }

        // Frequência no range real do semestre (data_aula)
        let chamadaQuery = supabase
          .from("registro_chamada")
          .select("status, data_aula")
          .in("aluno_ra", ras)
          .gte("data_aula", inicio)
          .lte("data_aula", fim);

        if (turmaId) {
          chamadaQuery = chamadaQuery.eq("turma_curso", turmaId);
        }

        const { data: chamadaRows, error: chamadaError } = await chamadaQuery;

        if (chamadaError) {
          console.error(
            "Erro ao agregar frequência macro:",
            chamadaError.message
          );
        }

        let serie: DadoGraficoMacro[] = meses.map(({ mes, n }) => {
          const chamadasDoMes = (chamadaRows ?? []).filter((row) => {
            const d = parseDataISO(row.data_aula);
            return (
              d != null && d.getFullYear() === anoNum && d.getMonth() + 1 === n
            );
          });
          const presentes = chamadasDoMes.filter(
            (r) => String(r.status ?? "").toLowerCase() === "presente"
          ).length;
          const frequencia =
            chamadasDoMes.length > 0
              ? Math.round((presentes / chamadasDoMes.length) * 100)
              : 0;

          return {
            mes,
            notaMedia: notaMediaTurma,
            frequencia,
          };
        });

        const temFrequencia = serie.some((p) => p.frequencia > 0);
        const temNota = notaMediaTurma > 0;
        if (!temFrequencia && !temNota) {
          serie = [];
        } else if (!temFrequencia && temNota) {
          serie = [{ mes: "Atual", notaMedia: notaMediaTurma, frequencia: 0 }];
        }

        if (cancelado) return;
        setDadosGrafico(serie);
        // Libera os gráficos imediatamente — não espera o Gemini
        setCarregandoGrafico(false);

        if (serie.length === 0) {
          setAnaliseMacroIA(
            "Sem dados suficientes de notas/frequência para gerar a análise macro neste período."
          );
          return;
        }

        const mediaNotas =
          serie.reduce((acc, item) => acc + item.notaMedia, 0) /
          (serie.length || 1);
        const pontosFreq = serie.filter((p) => p.frequencia > 0);
        const mediaFrequencia =
          pontosFreq.length > 0
            ? pontosFreq.reduce((acc, item) => acc + item.frequencia, 0) /
              pontosFreq.length
            : 0;

        const response = await fetch("/api/insights/turma", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            professor: professorTitulo,
            professorId,
            filtros: {
              ano,
              semestre,
              turma: turmaSelecionada,
            },
            metricasGlobais: {
              serieMensal: serie,
              mediaNotas: Number(mediaNotas.toFixed(1)),
              mediaFrequencia: Math.round(mediaFrequencia),
              totalAlunos: ras.length,
              area: professorArea,
              periodo: { inicio, fim },
              notaSemHistoricoTemporal: true,
            },
          }),
        });

        const data = (await response.json().catch(() => ({}))) as Record<
          string,
          unknown
        >;
        if (cancelado) return;
        if (!response.ok) {
          setAnaliseMacroIA(
            mensagemErroChat(response.status, data) ||
              "Análise indisponível no momento."
          );
          return;
        }
        setAnaliseMacroIA(
          (typeof data.analise === "string" && data.analise) ||
            (typeof data.reply === "string" && data.reply) ||
            "Análise indisponível no momento."
        );
      } catch (err) {
        console.error("Erro ao carregar dados macro:", err);
        if (!cancelado) {
          setDadosGrafico([]);
          setAnaliseMacroIA(
            "Não foi possível gerar a análise macro da turma neste momento."
          );
        }
      } finally {
        if (!cancelado) {
          setCarregandoGrafico(false);
          setCarregandoMacro(false);
        }
      }
    }

    void carregarSerieEAnaliseMacro();
    return () => {
      cancelado = true;
    };
    // Array de tamanho fixo — sem objetos/arrays dinâmicos
    // professorTitulo/Area lidos via closure (não devem re-disparar Gemini)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turmaSelecionada, ano, semestre, professorId, turmaId]);

  function handleSelecionarAluno(alunoIdSelecionado: string) {
    if (!alunoIdSelecionado) {
      limparContextoIndividual();
      return;
    }
    const aluno = alunos.find((a) => a.id === alunoIdSelecionado) ?? null;
    setAlunoSelecionado(aluno);
    if (!aluno) {
      setResumoAluno(null);
      setMediaAluno(null);
      setNotasAluno(null);
      setMessages([]);
    }
  }

  function handleSelecionarTurma(codigo: string) {
    setTurmaSelecionada(codigo);
  }

  async function enviarMensagem(e?: FormEvent) {
    e?.preventDefault();
    const texto = inputChat.trim();
    if (!texto || isTyping || !professorLogado || !alunoSelecionado) return;

    const novasMensagens: ChatMessage[] = [
      ...messages,
      { role: "user", content: texto },
    ];
    setMessages(novasMensagens);
    setInputChat("");
    setIsTyping(true);

    // 3. Payload blindado: contexto + métricas reais do aluno (N1/N2/N3 + faltas)
    const payload = {
      messages: novasMensagens,
      professor: professorLogado.nomeCompletoTitulo,
      professorId: professorLogado.id,
      mensagem: texto,
      contextoAluno,
      aluno: {
        nome: alunoSelecionado.nome,
        ra: alunoSelecionado.ra,
        curso: alunoSelecionado.curso,
        turma: turmaSelecionada,
        n1: notasAluno?.n1 ?? alunoSelecionado.n1,
        n2: notasAluno?.n2 ?? null,
        n3: notasAluno?.n3 ?? null,
        mediaRecente: mediaAluno ?? notasAluno?.media ?? alunoSelecionado.n1,
        media: mediaAluno ?? notasAluno?.media ?? alunoSelecionado.n1,
        taxaPresenca: resumoAluno?.taxaPresenca ?? null,
        taxaFaltas: resumoAluno?.taxaFaltas ?? null,
        presentes: resumoAluno?.presentes ?? null,
        faltas: resumoAluno?.faltas ?? null,
      },
      contextoAlunoObj: {
        nome: alunoSelecionado.nome,
        ra: alunoSelecionado.ra,
        turma: turmaSelecionada,
        n1: notasAluno?.n1 ?? alunoSelecionado.n1,
        n2: notasAluno?.n2 ?? null,
        n3: notasAluno?.n3 ?? null,
        media: mediaAluno ?? notasAluno?.media ?? alunoSelecionado.n1,
        faltas: resumoAluno?.faltas ?? null,
        taxaPresenca: resumoAluno?.taxaPresenca ?? null,
        taxaFaltas: resumoAluno?.taxaFaltas ?? null,
      },
    };

    try {
      const response = await fetch("/api/insights/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;

      if (!response.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: mensagemErroChat(response.status, data),
          },
        ]);
        return;
      }

      const reply =
        (typeof data.reply === "string" && data.reply) ||
        "Desculpe, não consegui processar a análise agora.";

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      console.error("Erro no chat pedagógico:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: MSG_IA_INDISPONIVEL,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  }

  if (carregandoSessao || !professorLogado) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-zinc-400 text-sm">
        Carregando sessão...
      </div>
    );
  }

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
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                Insights de Inteligência Artificial
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                Análise preditiva com Gemini sobre o desempenho das suas turmas.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 items-center shrink-0">
              <div className="relative inline-block">
                <select
                  value={turmaSelecionada}
                  onChange={(e) => handleSelecionarTurma(e.target.value)}
                  disabled={carregandoTurmas}
                  className="appearance-none bg-zinc-950 border border-zinc-700 text-sm text-white font-medium rounded-lg pl-4 pr-10 py-2.5 focus:outline-none focus:ring-1 focus:ring-zinc-500 cursor-pointer hover:border-zinc-600 transition-colors min-w-[240px] disabled:opacity-60"
                >
                  {carregandoTurmas ? (
                    <option value="">Carregando turmas...</option>
                  ) : turmas.length === 0 ? (
                    <option value="">Nenhuma turma da sua área</option>
                  ) : (
                    <>
                      {turmas.length > 1 && (
                        <option value="">Selecione a Turma</option>
                      )}
                      {turmas.map((turma) => (
                        <option key={turma.id} value={turma.codigo}>
                          {labelTurma(turma)}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              </div>

              <div className="relative inline-block">
                <select
                  value={alunoSelecionado?.id ?? ""}
                  onChange={(e) => handleSelecionarAluno(e.target.value)}
                  disabled={!turmaSelecionada || carregandoAlunos}
                  className="appearance-none bg-zinc-950 border border-zinc-700 text-sm text-white font-medium rounded-lg pl-4 pr-10 py-2.5 focus:outline-none focus:ring-1 focus:ring-zinc-500 cursor-pointer hover:border-zinc-600 transition-colors min-w-[280px] disabled:opacity-60"
                >
                  <option value="">
                    {!turmaSelecionada
                      ? "Selecione a turma primeiro"
                      : carregandoAlunos
                        ? "Carregando alunos..."
                        : alunos.length === 0
                          ? "Nenhum aluno nesta turma"
                          : "Filtrar por Aluno"}
                  </option>
                  {alunos.map((aluno) => (
                    <option key={aluno.id} value={aluno.id}>
                      {aluno.nome} — RA {aluno.ra}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Raio-X do Aluno */}
            <div className="lg:col-span-2 rounded-xl bg-[#0f1117] border border-gray-800 p-5">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-gray-800 flex items-center justify-center">
                  <UserRound className="w-4 h-4 text-zinc-300" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Raio-X do Aluno
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Perfil acadêmico e engajamento
                  </p>
                </div>
              </div>

              {!alunoSelecionado ? (
                <div className="rounded-lg border border-dashed border-gray-800 bg-black/40 px-4 py-10 text-center">
                  <p className="text-sm text-zinc-500">
                    {!turmaSelecionada
                      ? "Selecione a turma e o aluno nos filtros acima para visualizar o diagnóstico individual."
                      : "Selecione um aluno no filtro acima para visualizar o diagnóstico individual."}
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-semibold text-white shrink-0">
                      {iniciaisDoNome(alunoSelecionado.nome)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-medium text-white truncate">
                        {alunoSelecionado.nome}
                      </p>
                      <p className="text-xs text-zinc-500">
                        RA {alunoSelecionado.ra}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-black/50 border border-gray-800 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-zinc-500 mb-1">
                        Curso
                      </p>
                      <p className="text-sm text-zinc-200 truncate">
                        {alunoSelecionado.curso}
                      </p>
                    </div>
                    <div className="rounded-lg bg-black/50 border border-gray-800 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-zinc-500 mb-1">
                        Semestre
                      </p>
                      <p className="text-sm text-zinc-200">
                        {alunoSelecionado.semestre}º
                      </p>
                    </div>
                    <div className="rounded-lg bg-black/50 border border-gray-800 p-3 col-span-2">
                      <p className="text-[11px] uppercase tracking-wide text-zinc-500 mb-1">
                        Média recente
                      </p>
                      <p className="text-sm text-zinc-200">
                        {carregandoResumo
                          ? "…"
                          : mediaAluno != null
                            ? mediaAluno.toFixed(1)
                            : alunoSelecionado.n1 != null
                              ? Number(alunoSelecionado.n1).toFixed(1)
                              : "Sem nota registrada"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg bg-black/50 border border-gray-800 p-4">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-500 mb-2">
                      Engajamento / Faltas
                    </p>
                    {carregandoResumo ? (
                      <p className="text-sm text-zinc-400 animate-pulse">
                        Consultando frequência...
                      </p>
                    ) : resumoAluno ? (
                      <>
                        <div className="flex items-end justify-between gap-3 mb-3">
                          <div>
                            <p className="text-2xl font-semibold text-white">
                              {resumoAluno.taxaPresenca}%
                            </p>
                            <p className="text-xs text-zinc-500">presença</p>
                          </div>
                          <div className="text-right text-xs text-zinc-400 space-y-0.5">
                            <p>
                              Presentes:{" "}
                              <span className="text-emerald-400">
                                {resumoAluno.presentes}
                              </span>
                            </p>
                            <p>
                              Faltas:{" "}
                              <span className="text-red-400">
                                {resumoAluno.faltas}
                              </span>
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-zinc-300 leading-relaxed">
                          {resumoAluno.resumo}
                        </p>
                        <p className="text-[11px] text-zinc-600 mt-2">
                          Fonte: registro_chamada
                        </p>
                      </>
                    ) : (
                      <div className="rounded-lg border border-dashed border-gray-800 bg-black/30 px-3 py-6 text-center">
                        <p className="text-sm text-zinc-500">
                          Sem registros de chamada para este aluno.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Assistente Pedagógico */}
            <div className="lg:col-span-3 bg-[#0f1117] border border-gray-800 rounded-xl h-[500px] flex flex-col overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-3 shrink-0">
                <div className="w-8 h-8 rounded-lg bg-purple-950/50 border border-purple-900/40 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-purple-300" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-white">
                    Assistente Pedagógico (Google Gemini)
                  </h2>
                  <p className="text-xs text-zinc-500 truncate">
                    {alunoSelecionado
                      ? `Contexto: ${alunoSelecionado.nome}`
                      : !turmaSelecionada
                        ? "Selecione a turma e o aluno para contextualizar a conversa"
                        : "Selecione um aluno para contextualizar a conversa"}
                  </p>
                </div>
              </div>

              <div
                ref={chatScrollRef}
                className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
              >
                {!alunoSelecionado ? (
                  <div className="h-full flex items-center justify-center px-6 text-center">
                    <p className="text-sm text-zinc-500">
                      {!turmaSelecionada
                        ? "Selecione a turma e o aluno nos filtros acima para iniciar a análise conversacional com a IA."
                        : "Escolha um aluno no filtro para iniciar a análise conversacional com a IA."}
                    </p>
                  </div>
                ) : (
                  <>
                    {messages.map((msg, index) => (
                      <div
                        key={`${msg.role}-${index}`}
                        className={`flex ${
                          msg.role === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                            msg.role === "user"
                              ? "bg-purple-600 text-white rounded-br-md"
                              : "bg-[#1a1d24] text-gray-200 rounded-bl-md"
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {isTyping && (
                      <div className="flex justify-start">
                        <div className="bg-[#1a1d24] text-gray-400 rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm animate-pulse">
                          Analisando...
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <form
                onSubmit={(e) => void enviarMensagem(e)}
                className="shrink-0 border-t border-gray-800 p-3 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputChat}
                  onChange={(e) => setInputChat(e.target.value)}
                  disabled={!alunoSelecionado || isTyping}
                  placeholder={
                    alunoSelecionado
                      ? "Pergunte sobre desempenho, faltas ou engajamento..."
                      : !turmaSelecionada
                        ? "Selecione a turma e o aluno para conversar"
                        : "Selecione um aluno para conversar"
                  }
                  className="flex-1 bg-black border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-purple-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={
                    !alunoSelecionado || !inputChat.trim() || isTyping
                  }
                  className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-purple-600 text-white hover:bg-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  aria-label="Enviar mensagem"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

          <hr className="border-gray-800 my-8" />

          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Visão Geral de Desempenho
              </h2>
              <p className="text-sm text-zinc-500 mt-0.5">
                Frequência mensal via data_aula no semestre · média de notas atual
                da turma (sem histórico temporal no banco)
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative inline-block">
                <select
                  value={ano}
                  onChange={(e) =>
                    setFiltrosMacro((prev) => ({
                      ...prev,
                      ano: e.target.value,
                    }))
                  }
                  className="appearance-none bg-zinc-950 border border-zinc-700 text-sm text-white rounded-lg pl-3 pr-9 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-500 cursor-pointer"
                >
                  {anosDisponiveis.map((anoOpt) => (
                    <option key={anoOpt} value={anoOpt}>
                      {anoOpt}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              </div>
              <div className="relative inline-block">
                <select
                  value={semestre}
                  onChange={(e) =>
                    setFiltrosMacro((prev) => ({
                      ...prev,
                      semestre: e.target.value,
                    }))
                  }
                  className="appearance-none bg-zinc-950 border border-zinc-700 text-sm text-white rounded-lg pl-3 pr-9 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-500 cursor-pointer"
                >
                  <option value="1º Semestre">1º Semestre</option>
                  <option value="2º Semestre">2º Semestre</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl bg-[#0f1117] border border-gray-800 p-5 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white">
                    Evolução da Nota Média
                  </h3>
                  <span className="text-[11px] text-[#9333ea]">● Notas</span>
                </div>
                <div className="h-56 w-full">
                  {carregandoGrafico ? (
                    <div className="h-full flex items-center justify-center text-sm text-zinc-500">
                      Carregando série de notas...
                    </div>
                  ) : dadosGrafico.length === 0 ? (
                    <div className="h-full flex items-center justify-center rounded-lg border border-dashed border-gray-800 bg-black/30 px-4 text-center">
                      <p className="text-sm text-zinc-500">
                        Sem dados de notas para o período selecionado.
                      </p>
                    </div>
                  ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosGrafico}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#27272a"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="mes"
                        tick={{ fill: "#a1a1aa", fontSize: 12 }}
                        axisLine={{ stroke: "#3f3f46" }}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 10]}
                        tick={{ fill: "#a1a1aa", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f1117",
                          border: "1px solid #1f2937",
                          borderRadius: "8px",
                          color: "#e4e4e7",
                        }}
                      />
                      <Bar
                        dataKey="notaMedia"
                        name="Nota média"
                        fill="#9333ea"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white">
                    Tendência de Frequência
                  </h3>
                  <span className="text-[11px] text-[#10b981]">
                    ● Frequência
                  </span>
                </div>
                <div className="h-56 w-full">
                  {carregandoGrafico ? (
                    <div className="h-full flex items-center justify-center text-sm text-zinc-500">
                      Carregando série de frequência...
                    </div>
                  ) : dadosGrafico.length === 0 ? (
                    <div className="h-full flex items-center justify-center rounded-lg border border-dashed border-gray-800 bg-black/30 px-4 text-center">
                      <p className="text-sm text-zinc-500">
                        Sem dados de frequência para o período selecionado.
                      </p>
                    </div>
                  ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dadosGrafico}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#27272a"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="mes"
                        tick={{ fill: "#a1a1aa", fontSize: 12 }}
                        axisLine={{ stroke: "#3f3f46" }}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[50, 100]}
                        tick={{ fill: "#a1a1aa", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        unit="%"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f1117",
                          border: "1px solid #1f2937",
                          borderRadius: "8px",
                          color: "#e4e4e7",
                        }}
                      />
                      <Legend
                        wrapperStyle={{ color: "#a1a1aa", fontSize: 12 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="frequencia"
                        name="Frequência %"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        dot={{ fill: "#10b981", r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-[#0f1117] border border-gray-800 rounded-xl p-5 flex flex-col min-h-[500px]">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-purple-950/50 border border-purple-900/40 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-purple-300" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Síntese Preditiva da Turma
                  </h3>
                  <p className="text-xs text-zinc-500">
                    {ano} · {semestre}
                  </p>
                </div>
              </div>

              {carregandoMacro ? (
                <div className="flex-1 space-y-3">
                  <p className="text-sm text-zinc-400 animate-pulse">
                    O Gemini está analisando as tendências da turma...
                  </p>
                  <div className="h-3 rounded bg-zinc-800/80 animate-pulse w-full" />
                  <div className="h-3 rounded bg-zinc-800/80 animate-pulse w-11/12" />
                  <div className="h-3 rounded bg-zinc-800/80 animate-pulse w-4/5" />
                  <div className="h-3 rounded bg-zinc-800/80 animate-pulse w-9/12" />
                </div>
              ) : (
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {analiseMacroIA ||
                    "Ajuste os filtros de ano e período para gerar a síntese preditiva."}
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
