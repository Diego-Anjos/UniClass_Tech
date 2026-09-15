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
    const { alunoNome, presencaGlobal, disciplinasEmRisco } = await req.json();

    const prompt = buildPrompt(
      `Aja como um orientador acadêmico empático e humano. Escreva exatamente uma ou duas frases curtas. Fale diretamente com o aluno de forma natural, amigável e encorajadora. Nunca use linguagem engessada, clichês institucionais ou pareça um script automático. Vá direto ao ponto.
Retorne no formato: { "insight": "sua orientação aqui" }`,
      `Estudante: ${alunoNome}. Presença global: ${presencaGlobal}%. Disciplinas em situação de atenção/risco: ${
        Array.isArray(disciplinasEmRisco) && disciplinasEmRisco.length > 0
          ? disciplinasEmRisco.join(", ")
          : "nenhuma"
      }. Dê uma orientação direta para manutenção de frequência.`
    );

    const data = await generateJsonWithFallback(genAI, prompt);
    const insight =
      (typeof data.insight === "string" && data.insight) || FALLBACK_INSIGHT;
    return NextResponse.json({ insight });
  } catch (error) {
    console.error("Erro crítico na API de frequência do aluno:", error);
    return NextResponse.json({ insight: FALLBACK_INSIGHT }, { status: 200 });
  }
}
