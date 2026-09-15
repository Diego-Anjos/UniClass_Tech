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
    const { alunoNome, totalDisciplinas, disciplinasPendentes } = await req.json();

    const prompt = buildPrompt(
      `Você é um mentor acadêmico virtual da UniClassTech. Com base na situação das disciplinas do aluno, forneça uma recomendação clara e encorajadora em exatamente DUAS frases curtas, orientando onde ele deve focar seus estudos. Sem formatação markdown.
Retorne no formato: { "insight": "suas duas frases aqui" }`,
      `O estudante ${alunoNome} está cursando ${totalDisciplinas} disciplinas. Disciplinas que demandam atenção ou estão em andamento: ${disciplinasPendentes}. Dê uma orientação prática sobre metas de estudo para fechar o semestre com aprovação.`
    );

    const data = await generateJsonWithFallback(genAI, prompt);
    const insight =
      (typeof data.insight === "string" && data.insight) || FALLBACK_INSIGHT;
    return NextResponse.json({ insight });
  } catch (error) {
    console.error("Erro crítico na API do boletim:", error);
    return NextResponse.json({ insight: FALLBACK_INSIGHT }, { status: 200 });
  }
}
