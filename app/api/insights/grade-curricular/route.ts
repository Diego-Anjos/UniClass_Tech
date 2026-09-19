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
    const { cursoNome, disciplinasAtuais } = await req.json();
    const listaDisciplinas = Array.isArray(disciplinasAtuais)
      ? disciplinasAtuais
      : [];

    const prompt = buildPrompt(
      `Você é um conselheiro pedagógico e de carreira acolhedor da UniClassTech. Com base no curso do estudante e suas disciplinas atuais, forneça uma recomendação prática e motivacional de até duas frases sobre competências complementares ou caminhos de desenvolvimento. Não use formatação markdown.
Retorne no formato: { "insight": "sua recomendação aqui" }`,
      `Curso: ${cursoNome}. Disciplinas atuais cursadas: ${
        listaDisciplinas.length > 0
          ? listaDisciplinas.join(", ")
          : "ainda no início do percurso, sem disciplinas listadas neste momento"
      }. Indique uma dica de estudo ou preparação para os próximos semestres.`
    );

    const data = await generateJsonWithFallback(genAI, prompt);
    const insight =
      (typeof data.insight === "string" && data.insight) || FALLBACK_INSIGHT;
    return NextResponse.json({ insight });
  } catch (error) {
    console.error("Erro crítico na API de grade curricular:", error);
    return NextResponse.json({ insight: FALLBACK_INSIGHT }, { status: 200 });
  }
}
