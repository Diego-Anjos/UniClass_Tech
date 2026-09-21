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
    const { alunoNome, totalDisciplinas, disciplinasPendentes, curso } =
      await req.json();
    const nome = String(alunoNome ?? "Estudante").trim();
    const total = Number(totalDisciplinas) || 0;

    const prompt = buildPrompt(
      `Tarefa: orientação de boletim.
Exatamente DUAS frases curtas, citando o estudante e as disciplinas reais. Sem markdown.
Retorne: { "insight": "suas duas frases aqui" }`,
      `O estudante ${nome} está cursando ${total} disciplinas. Disciplinas que demandam atenção: ${disciplinasPendentes}. Oriente metas de estudo para fechar o semestre.`,
      {
        publico: "aluno",
        alunoNome: nome,
        curso: String(curso ?? "").trim() || undefined,
        dadosEspecificos: `${total} disciplina(s). Pendentes/atenção: ${disciplinasPendentes}.`,
      }
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
