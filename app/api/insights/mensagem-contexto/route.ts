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
    const { alunoNome, turmaNome, assunto, conteudo } = await req.json();

    const prompt = buildPrompt(
      `Você é um assistente acadêmico interno para professores. Gere uma única frase direta resumindo a situação ou contexto para orientar a resposta do professor. Inicie a resposta diretamente com o fato principal, sem saudações ou markdown.
Retorne no formato: { "insight": "seu resumo aqui" }`,
      `O aluno ${alunoNome} da turma ${turmaNome} enviou uma mensagem com assunto '${assunto}' e conteúdo: "${conteudo}". Dê um resumo de contexto útil para o professor responder de forma ágil.`
    );

    const data = await generateJsonWithFallback(genAI, prompt);
    const insight =
      (typeof data.insight === "string" && data.insight) || FALLBACK_INSIGHT;
    return NextResponse.json({ insight });
  } catch (error) {
    console.error("Erro crítico na API de mensagem-contexto:", error);
    return NextResponse.json({ insight: FALLBACK_INSIGHT }, { status: 200 });
  }
}
