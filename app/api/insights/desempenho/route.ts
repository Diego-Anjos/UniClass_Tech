import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import {
  buildPrompt,
  createGenAI,
  generateJsonWithFallback,
} from "@/lib/gemini-fallback";

const genAI = createGenAI();

const FALLBACK_INSIGHT =
  "Não foi possível gerar a análise da IA no momento. Tente novamente mais tarde.";

export async function POST(req: Request) {
  const denied = requireRole(req, ["aluno", "professor", "admin"]);
  if (denied) return denied;

  try {
    const { notas } = await req.json();

    const prompt = buildPrompt(
      `Você é um mentor acadêmico acolhedor da UniClassTech. Analise as notas (N1, N2) e a frequência do estudante. Crie um parágrafo curto, empático e motivacional (máximo 3 frases), falando diretamente com o aluno. Se houver notas abaixo de 6 ou faltas altas, oriente com cuidado e foco em melhoria. Se estiver indo bem, celebre o esforço. Se N2 ou outras notas ainda não tiverem sido lançadas, contextualize naturalmente o momento do semestre. Não use formatação markdown.
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
