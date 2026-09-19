import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import {
  buildPrompt,
  createGenAI,
  generateJsonWithFallback,
} from "@/lib/gemini-fallback";

const genAI = createGenAI();

const FALLBACK_INSIGHT =
  "Não foi possível gerar a análise da IA no momento. Tente novamente mais tarde.";

export async function POST(req: NextRequest) {
  const denied = requireRole(req, ["aluno", "professor", "admin"]);
  if (denied) return denied;

  try {
    const { alunoNome, turmaNome, assunto, conteudo } = await req.json();

    const prompt = buildPrompt(
      `Você é um coordenador pedagógico acolhedor apoiando professores. Gere uma única frase humana e direta resumindo a situação para orientar a resposta do docente. Inicie com o fato principal, sem saudações, markdown ou jargão técnico.
Retorne no formato: { "insight": "seu resumo aqui" }`,
      `O aluno ${alunoNome} da turma ${turmaNome} enviou uma mensagem com assunto '${assunto}' e conteúdo: "${conteudo}". Dê um resumo de contexto útil para o professor responder com empatia e agilidade.`
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
