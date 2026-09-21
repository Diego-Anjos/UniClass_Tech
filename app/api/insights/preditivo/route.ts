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
    const {
      escopo,
      totalTurmas,
      alunosEmRisco,
      professorId,
      professorNome,
      disciplina,
      turno,
    } = await req.json();
    const prefs = await buscarPreferenciasProfessor(professorId);
    const turmas = Number(totalTurmas) || 0;
    const risco = Number(alunosEmRisco) || 0;

    const prompt = buildPrompt(
      `Tarefa: resumo preditivo de retenção.
${blocoPreferenciasIa(prefs)}
Exatamente DUAS frases: tendência + ação preventiva. Cite os números reais. Sem markdown.
Retorne: { "insight": "seu resumo aqui" }`,
      `Escopo: ${escopo}. Total de turmas ativas: ${turmas}. Alunos em situação de risco: ${risco}.`,
      {
        publico: "professor",
        professorNome: String(professorNome ?? "").trim() || undefined,
        disciplina: String(disciplina ?? "").trim() || undefined,
        turno: String(turno ?? "").trim() || undefined,
        dadosEspecificos: `Escopo ${escopo}; ${turmas} turma(s); ${risco} aluno(s) em risco.`,
      }
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
