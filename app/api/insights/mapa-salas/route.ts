import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import {
  buildPrompt,
  createGenAI,
  generateJsonWithFallback,
} from "@/lib/gemini-fallback";

const genAI = createGenAI();

const FALLBACK_DICA =
  "Não foi possível gerar a análise da IA no momento. Consulte os laboratórios com status 'Livre' para estudo durante seus horários vagos.";

export async function POST(req: NextRequest) {
  const denied = requireApiAuth(req);
  if (denied) return denied;

  try {
    const { andar, salaProxima } = await req.json();

    const prompt = buildPrompt(
      `Aja como um assistente de campus inteligente. Dê uma dica curta e amigável em uma única frase sobre como o aluno pode aproveitar os laboratórios com status 'Livre' para estudar. Fale de forma natural e garanta que a frase tenha começo, meio e fim.
Retorne no formato: { "dica": "sua frase aqui", "insight": "mesma frase aqui" }`,
      `O estudante está visualizando o ${andar}. Sua próxima aula é no ambiente '${salaProxima}'. Sugira como aproveitar um laboratório livre para estudar antes ou depois da aula.`
    );

    const data = await generateJsonWithFallback(genAI, prompt);
    const dica =
      (typeof data.dica === "string" && data.dica.trim()) ||
      (typeof data.insight === "string" && data.insight.trim()) ||
      FALLBACK_DICA;

    return NextResponse.json({ dica, insight: dica });
  } catch (error) {
    console.error("Erro crítico na API do mapa de salas:", error);
    return NextResponse.json(
      { dica: FALLBACK_DICA, insight: FALLBACK_DICA },
      { status: 200 }
    );
  }
}
