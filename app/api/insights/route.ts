import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import {
  buildPrompt,
  createGenAI,
  generateJsonWithFallback,
} from "@/lib/gemini-fallback";

const genAI = createGenAI();

const FALLBACK_INSIGHT =
  "Não foi possível gerar a análise da IA no momento. Tente novamente mais tarde.";

export async function POST(req: NextRequest) {
  const denied = requireApiAuth(req);
  if (denied) return denied;

  try {
    const { context, turmasAtivas } = await req.json();

    const prompt = buildPrompt(
      `Você é um assistente acadêmico virtual da plataforma UniClassTech. Você fornece dicas úteis, curtas e profissionais para professores. Seja direto e não use formatação markdown especial, apenas texto limpo.
Retorne no formato: { "insight": "suas duas frases aqui" }`,
      `Gere uma análise motivacional ou dica de gestão em exatas DUAS frases curtas para o ${context}, considerando que ele possui ${turmasAtivas} turma(s) ativa(s) no momento.`
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
