import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import {
  buildPrompt,
  createGenAI,
  generateJsonWithFallback,
} from "@/lib/gemini-fallback";
import { blocoPreferenciasIa } from "@/lib/professor-preferencias";
import { buscarPreferenciasProfessor } from "@/lib/professor-preferencias-server";

const genAI = createGenAI();

/** Compatível com a UI do prontuário (AiInsightAluno). */
const FALLBACK_ALUNO = {
  tipoAlerta: "ALERTA PREDITIVO",
  corAlerta: "amber",
  mensagem:
    "Não foi possível gerar a análise da IA no momento. Tente novamente mais tarde.",
  riscoLabel: "Indisponível",
  metricaLabel: "STATUS",
  metricaValor: "—",
  risco: "Indisponível",
  recomendacao:
    "Não foi possível gerar a análise da IA no momento. Tente novamente mais tarde.",
  pontos_atencao: "Serviço de IA indisponível.",
};

function numOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function fmtNota(n: number | null): string {
  return n == null ? "ainda não lançada (início/meio de semestre)" : n.toFixed(1);
}

function fmtPct(n: number | null): string {
  return n == null
    ? "ainda sem histórico suficiente neste semestre"
    : `${Math.round(n)}%`;
}

export async function POST(req: NextRequest) {
  console.log("Iniciando IA. Chave existe?", !!process.env.GEMINI_API_KEY);

  const denied = requireRole(req, ["professor", "admin"]);
  if (denied) return denied;

  try {
    const body = await req.json();
    const {
      nome,
      curso,
      semestre,
      professor,
      professorId,
      n1,
      n2,
      n3,
      media,
      percentualFaltas,
      taxaPresenca,
      faltas,
      presentes,
      totalAulas,
    } = body;

    const prefs = await buscarPreferenciasProfessor(professorId);

    const n1Num = numOrNull(n1);
    const n2Num = numOrNull(n2);
    const n3Num = numOrNull(n3);
    const mediaNum =
      numOrNull(media) ??
      (() => {
        const vals = [n1Num, n2Num, n3Num].filter(
          (v): v is number => v != null
        );
        if (vals.length === 0) return null;
        return vals.reduce((a, b) => a + b, 0) / vals.length;
      })();
    const pctFaltas = numOrNull(percentualFaltas);
    const pctPresenca = numOrNull(taxaPresenca);
    const faltasNum = numOrNull(faltas);
    const presentesNum = numOrNull(presentes);
    const totalAulasNum = numOrNull(totalAulas);

    // Métrica exibida na UI: preferir dado real do ERP (anti-alucinação).
    let metricaLabel = "STATUS";
    let metricaValor = "—";
    if (pctFaltas != null) {
      metricaLabel = "FALTAS";
      metricaValor = `${Math.round(pctFaltas)}%`;
    } else if (mediaNum != null) {
      metricaLabel = "MÉDIA";
      metricaValor = mediaNum.toFixed(1);
    } else if (n1Num != null) {
      metricaLabel = "MÉDIA N1";
      metricaValor = n1Num.toFixed(1);
    }

    const situacao = `Situação acadêmica do estudante (fonte única de verdade):
Aluno: ${nome ?? "—"}
Curso: ${curso ?? "—"}
Semestre: ${semestre ?? "—"}
Professor Responsável: ${professor || "Corpo Docente"}
N1: ${fmtNota(n1Num)}
N2: ${fmtNota(n2Num)}
N3: ${fmtNota(n3Num)}
Média atual: ${fmtNota(mediaNum)}
Percentual de faltas: ${fmtPct(pctFaltas)}
Taxa de presença: ${fmtPct(pctPresenca)}
Faltas (registros): ${faltasNum ?? "ainda sem histórico suficiente neste semestre"}
Presentes (registros): ${presentesNum ?? "ainda sem histórico suficiente neste semestre"}
Total de aulas registradas: ${totalAulasNum ?? "ainda sem histórico suficiente neste semestre"}`;

    const prompt = buildPrompt(
      `Tarefa: prontuário pedagógico do estudante para o docente.
${blocoPreferenciasIa(prefs)}
REGRAS OBRIGATÓRIAS (ANTI-ALUCINAÇÃO):
1. Use APENAS os números e fatos listados em "Situação acadêmica".
2. NUNCA invente notas, médias, percentuais ou totais de aulas.
3. Se algo ainda não foi lançado, contextualize o momento do semestre — sem dizer que o dado "não existe".
4. metricaLabel deve ser exatamente "${metricaLabel}" e metricaValor exatamente "${metricaValor}".
5. Cite o nome do aluno e números reais na mensagem (até 2 frases).

Retorne JSON:
{
  "tipoAlerta": "ALERTA PREDITIVO" | "DESEMPENHO NOTÁVEL" | "RISCO DE EVASÃO",
  "corAlerta": "amber" | "emerald" | "rose",
  "mensagem": "Texto analítico de até 2 frases.",
  "riscoLabel": "Baixo" | "Moderado" | "Crítico" | "Nenhum" | "Indisponível",
  "metricaLabel": "${metricaLabel}",
  "metricaValor": "${metricaValor}"
}`,
      situacao,
      {
        publico: "professor",
        professorNome: String(professor || "").trim() || undefined,
        alunoNome: String(nome ?? "").trim() || undefined,
        curso: String(curso ?? "").trim() || undefined,
        dadosEspecificos: situacao,
      }
    );

    const data = await generateJsonWithFallback(genAI, prompt);

    return NextResponse.json({
      ...FALLBACK_ALUNO,
      ...data,
      // Sobrescreve métricas com valores ancorados no ERP (mesmo se o modelo errar).
      metricaLabel,
      metricaValor,
      mensagem:
        (typeof data.mensagem === "string" && data.mensagem.trim()) ||
        FALLBACK_ALUNO.mensagem,
      tipoAlerta:
        (typeof data.tipoAlerta === "string" && data.tipoAlerta.trim()) ||
        FALLBACK_ALUNO.tipoAlerta,
      corAlerta:
        (typeof data.corAlerta === "string" && data.corAlerta.trim()) ||
        FALLBACK_ALUNO.corAlerta,
      riscoLabel:
        (typeof data.riscoLabel === "string" && data.riscoLabel.trim()) ||
        FALLBACK_ALUNO.riscoLabel,
    });
  } catch (error) {
    console.error("Erro crítico na API de insight do aluno:", error);
    return NextResponse.json(FALLBACK_ALUNO, { status: 200 });
  }
}
