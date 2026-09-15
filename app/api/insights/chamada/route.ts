import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import {
  buildPrompt,
  createGenAI,
  generateJsonWithFallback,
} from "@/lib/gemini-fallback";

const genAI = createGenAI();

const FALLBACK_CHAMADA = {
  tipoAlerta: "ALERTA DE FREQUÊNCIA",
  mensagem:
    "Não foi possível gerar a análise da IA no momento. Tente novamente mais tarde.",
};

export async function POST(req: NextRequest) {
  const denied = requireApiAuth(req);
  if (denied) return denied;

  try {
    const { turma, presentes, faltas, total } = await req.json();
    const taxaFalta = Math.round((faltas / (total || 1)) * 100);

    const prompt = buildPrompt(
      `Você é um assistente pedagógico. Baseado nos dados da chamada de hoje, gere um insight curto (máximo 2 linhas) para o professor.
Retorne no formato: { "tipoAlerta": "ALERTA DE FREQUÊNCIA" ou "ENGAJAMENTO ALTO", "mensagem": "texto aqui" }`,
      `Turma: ${turma}. Hoje: ${presentes} presentes, ${faltas} faltas. Taxa de ausência diária: ${taxaFalta}%.`
    );

    const data = await generateJsonWithFallback(genAI, prompt);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro crítico na API de chamada:", error);
    return NextResponse.json(FALLBACK_CHAMADA, { status: 200 });
  }
}
