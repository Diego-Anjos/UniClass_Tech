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
    const { context, turmasAtivas, professorId } = await req.json();
    const totalTurmas = Number(turmasAtivas) || 0;
    const prefs = await buscarPreferenciasProfessor(professorId);

    const instrucaoTurmas =
      totalTurmas > 0
        ? `O professor tem ${totalTurmas} turma(s) ativa(s). NÃO diga que ele está sem turmas, sem disciplinas ou ocioso. Gere uma mensagem curta de bom dia, encorajando-o para as aulas, com uma dica prática de gestão de turma.`
        : `O professor ainda não possui turmas ativas cadastradas. Gere uma mensagem curta e acolhedora de bom dia, incentivando-o a se preparar para quando as turmas forem vinculadas.`;

    const prompt = buildPrompt(
      `Você é um coordenador pedagógico acolhedor da UniClassTech. Você oferece dicas úteis, curtas e humanas para professores — como um colega experiente, nunca como um sistema. Sem formatação markdown.
${blocoPreferenciasIa(prefs)}
Retorne no formato: { "insight": "suas duas frases aqui" }`,
      `Gere em exatas DUAS frases curtas para o ${context}. ${instrucaoTurmas}`
    );

    const data = await generateJsonWithFallback(genAI, prompt);
    const insight =
      (typeof data.insight === "string" && data.insight) || FALLBACK_INSIGHT;
    return NextResponse.json({ insight });
  } catch (error) {
    console.error("Erro crítico na API de insights:", error);
    return NextResponse.json({ insight: FALLBACK_INSIGHT }, { status: 200 });
  }
}
