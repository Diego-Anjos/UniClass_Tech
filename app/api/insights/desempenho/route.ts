import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import {
  buildPrompt,
  createGenAI,
  generateJsonWithFallback,
} from "@/lib/gemini-fallback";

const genAI = createGenAI();

const FALLBACK_INSIGHT =
  "Não foi possível gerar a análise da IA no momento. Tente novamente mais tarde.";

export async function POST(req: Request) {
  const denied = requireApiAuth(req);
  if (denied) return denied;

  try {
    const { notas } = await req.json();

    const prompt = buildPrompt(
      `Você é o assistente de IA do ERP UniClassTech. Analise o seguinte JSON com notas (N1, N2) e faltas de um aluno. Crie um parágrafo curto, direto e empático (máximo 3 frases). Se houver notas abaixo de 6 ou faltas altas, dê um alerta construtivo. Se estiver indo bem, seja motivador. Não use formatação markdown como negrito.
Retorne no formato: { "insight": "seu parágrafo aqui" }`,
      JSON.stringify(notas)
    );

    const data = await generateJsonWithFallback(genAI, prompt);
    const insight =
      (typeof data.insight === "string" && data.insight) || FALLBACK_INSIGHT;
    return NextResponse.json({ insight }, { status: 200 });
  } catch (error) {
    console.error("ERRO GEMINI:", error);
    return NextResponse.json({ insight: FALLBACK_INSIGHT }, { status: 200 });
  }
}
