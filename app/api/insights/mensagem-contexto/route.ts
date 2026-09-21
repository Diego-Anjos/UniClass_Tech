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
    const {
      alunoNome,
      turmaNome,
      assunto,
      conteudo,
      professorNome,
      disciplina,
      turno,
    } = await req.json();

    const prompt = buildPrompt(
      `Tarefa: resumo de mensagem do aluno para orientar resposta do docente.
Uma frase direta, começando pelo fato principal. Sem saudações, markdown ou jargão técnico.
Retorne: { "insight": "seu resumo aqui" }`,
      `O aluno ${alunoNome} da turma ${turmaNome} enviou mensagem com assunto '${assunto}' e conteúdo: "${conteudo}".`,
      {
        publico: "professor",
        professorNome: String(professorNome ?? "").trim() || undefined,
        alunoNome: String(alunoNome ?? "").trim() || undefined,
        turmaNome: String(turmaNome ?? "").trim() || undefined,
        disciplina: String(disciplina ?? "").trim() || undefined,
        turno: String(turno ?? "").trim() || undefined,
        dadosEspecificos: `Assunto: ${assunto}. Conteúdo: ${conteudo}`,
      }
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
