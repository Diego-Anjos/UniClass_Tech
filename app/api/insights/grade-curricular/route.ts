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
    const { cursoNome, disciplinasAtuais, alunoNome } = await req.json();
    const listaDisciplinas = Array.isArray(disciplinasAtuais)
      ? disciplinasAtuais
      : [];
    const listaTexto =
      listaDisciplinas.length > 0
        ? listaDisciplinas.join(", ")
        : "ainda no início do percurso, sem disciplinas listadas neste momento";

    const prompt = buildPrompt(
      `Tarefa: orientação de grade curricular / carreira.
Até duas frases práticas, citando o curso e disciplinas reais quando houver. Sem markdown.
Retorne: { "insight": "sua recomendação aqui" }`,
      `Curso: ${cursoNome}. Disciplinas atuais: ${listaTexto}. Indique uma dica de estudo ou preparação para os próximos semestres.`,
      {
        publico: "aluno",
        alunoNome: String(alunoNome ?? "").trim() || undefined,
        curso: String(cursoNome ?? "").trim() || undefined,
        disciplina: listaDisciplinas[0]
          ? String(listaDisciplinas[0])
          : undefined,
        dadosEspecificos: `Disciplinas: ${listaTexto}`,
      }
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
