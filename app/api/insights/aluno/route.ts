import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import {
  buildPrompt,
  createGenAI,
  generateJsonWithFallback,
} from "@/lib/gemini-fallback";

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
  // Chaves alternativas (degradação / contratos legados)
  risco: "Indisponível",
  recomendacao:
    "Não foi possível gerar a análise da IA no momento. Tente novamente mais tarde.",
  pontos_atencao: "Serviço de IA indisponível.",
};

export async function POST(req: NextRequest) {
  console.log("Iniciando IA. Chave existe?", !!process.env.GEMINI_API_KEY);

  const denied = requireApiAuth(req);
  if (denied) return denied;

  try {
    const { nome, curso, semestre, professor } = await req.json();

    const prompt = buildPrompt(
      `Você é um analista pedagógico sênior do ERP educacional UniClassTech.
Com base no estudante, seu curso e semestre, gere um diagnóstico acadêmico preditivo no seguinte formato JSON:
{
  "tipoAlerta": "ALERTA PREDITIVO" | "DESEMPENHO NOTÁVEL" | "RISCO DE EVASÃO",
  "corAlerta": "amber" | "emerald" | "rose",
  "mensagem": "Texto objetivo de até 2 frases sobre o desempenho ou frequência do aluno.",
  "riscoLabel": "Baixo" | "Moderado" | "Crítico" | "Nenhum",
  "metricaLabel": "FALTAS" | "MÉDIA N1" | "ENGAJAMENTO",
  "metricaValor": "14%" | "8.8" | "92%"
}`,
      `Aluno: ${nome}
Curso: ${curso}
Semestre: ${semestre}
Professor Responsável: ${professor || "Corpo Docente"}`
    );

    const data = await generateJsonWithFallback(genAI, prompt);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro crítico na API de insight do aluno:", error);
    return NextResponse.json(FALLBACK_ALUNO, { status: 200 });
  }
}
