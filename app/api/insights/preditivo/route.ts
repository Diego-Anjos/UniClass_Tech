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

const FALLBACK_INSIGHT =
  "Não foi possível gerar a análise da IA no momento. Tente novamente mais tarde.";

export async function POST(req: NextRequest) {
  const denied = requireRole(req, ["professor", "admin"]);
  if (denied) return denied;

  try {
    const { escopo, totalTurmas, alunosEmRisco, professorId } =
      await req.json();
    const prefs = await buscarPreferenciasProfessor(professorId);

    const prompt = buildPrompt(
      `Você é um coordenador de curso experiente e humano da UniClassTech. Com base nos dados fornecidos, gere um resumo pedagógico de exatamente DUAS frases com observação de tendências e ações preventivas acolhedoras (sem formatação markdown). Foque na retenção e no desenvolvimento dos estudantes.
${blocoPreferenciasIa(prefs)}
Retorne no formato: { "insight": "seu resumo aqui" }`,
      `Escopo: ${escopo}. Total de turmas ativas: ${totalTurmas}. Alunos detectados em situação de risco: ${alunosEmRisco}. Destaque uma recomendação prática e humana para evitar evasão e melhorar o aproveitamento.`
    );

    const data = await generateJsonWithFallback(genAI, prompt);
    const insight =
      (typeof data.insight === "string" && data.insight) || FALLBACK_INSIGHT;
    return NextResponse.json({ insight });
  } catch (error) {
    console.error("Erro crítico na API preditiva:", error);
    return NextResponse.json({ insight: FALLBACK_INSIGHT }, { status: 200 });
  }
}
