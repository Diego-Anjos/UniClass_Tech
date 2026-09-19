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
    const { turma, totalAlunos, totalFaltas, professorId } = await req.json();
    const prefs = await buscarPreferenciasProfessor(professorId);

    const prompt = buildPrompt(
      `Você é um coordenador pedagógico acolhedor. Analise os dados de presença da turma e gere um alerta conciso e empático de até duas frases para o professor sobre retenção, engajamento ou acompanhamento de faltas — sempre com foco no cuidado com os estudantes. Não use markdown especial.
${blocoPreferenciasIa(prefs)}
Retorne no formato: { "insight": "seu alerta aqui" }`,
      `Na turma ${turma}, de ${totalAlunos} alunos registrados hoje, houve ${totalFaltas} falta(s). Dê uma orientação humana ao professor sobre o engajamento desta aula.`
    );

    const data = await generateJsonWithFallback(genAI, prompt);
    const insight =
      (typeof data.insight === "string" && data.insight) || FALLBACK_INSIGHT;
    return NextResponse.json({ insight });
  } catch (error) {
    console.error("Erro crítico na API de frequência:", error);
    return NextResponse.json({ insight: FALLBACK_INSIGHT }, { status: 200 });
  }
}
