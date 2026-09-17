import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import {
  buildPrompt,
  createGenAI,
  generateJsonWithFallback,
} from "@/lib/gemini-fallback";

const genAI = createGenAI();

const FALLBACK_CHAMADA = {
  tipoAlerta: "ALERTA DE FREQUÊNCIA",
  mensagem:
    "Não foi possível gerar a análise da IA no momento. Tente novamente mais tarde.",
};

function toNonNegInt(value: unknown, fallback = 0): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.round(n);
}

export async function POST(req: NextRequest) {
  const denied = requireApiAuth(req);
  if (denied) return denied;

  try {
    const body = await req.json();

    const turma = String(body.turma ?? "Turma não informada").trim();
    let total = toNonNegInt(body.total);
    let presentes = toNonNegInt(body.presentes);
    let faltas = toNonNegInt(body.faltas);

    // Normaliza inconsistências do cliente: presentes + faltas deve bater com total
    if (total <= 0 && presentes + faltas > 0) {
      total = presentes + faltas;
    }
    if (presentes + faltas !== total && total > 0) {
      // Prioriza os contadores enviados e recalcula total se necessário
      if (presentes + faltas > 0) {
        total = presentes + faltas;
      } else {
        presentes = total;
        faltas = 0;
      }
    }

    const taxaPresenca =
      total > 0 ? Math.round((presentes / total) * 100) : 0;
    const taxaFalta = total > 0 ? Math.round((faltas / total) * 100) : 0;

    // Classificação determinística — a IA não decide o tipo com base em números inventados
    const tipoAlerta =
      faltas === 0 && total > 0
        ? "ENGAJAMENTO ALTO"
        : taxaFalta >= 20
          ? "ALERTA DE FREQUÊNCIA"
          : taxaPresenca >= 90
            ? "ENGAJAMENTO ALTO"
            : "ALERTA DE FREQUÊNCIA";

    const prompt = buildPrompt(
      `Você é um assistente pedagógico da UniClassTech.
Gere UM insight curto (máximo 2 frases) sobre a chamada de HOJE.

REGRAS OBRIGATÓRIAS:
- Use EXATAMENTE os números fornecidos abaixo. NÃO invente, arredonde de outra forma nem alucine totais, presenças, faltas ou porcentagens.
- Se faltas > 0, NÃO diga que houve 100% de presença ou presença total.
- Mencione na mensagem: total de alunos, presentes e faltas (os valores literais recebidos).
- tipoAlerta deve ser exatamente: "${tipoAlerta}"
- Retorne APENAS JSON: { "tipoAlerta": "${tipoAlerta}", "mensagem": "texto aqui" }`,
      `A turma "${turma}" tem ${total} alunos. Hoje tivemos ${presentes} presenças e ${faltas} faltas (taxa de presença ${taxaPresenca}%, taxa de ausência ${taxaFalta}%). Com base nisso, gere um alerta curto sobre o engajamento de hoje.`
    );

    const data = await generateJsonWithFallback(genAI, prompt);

    const mensagem =
      typeof data.mensagem === "string" && data.mensagem.trim()
        ? data.mensagem.trim()
        : FALLBACK_CHAMADA.mensagem;

    return NextResponse.json({
      tipoAlerta,
      mensagem,
    });
  } catch (error) {
    console.error("Erro crítico na API de chamada:", error);
    return NextResponse.json(FALLBACK_CHAMADA, { status: 200 });
  }
}
