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
      presencaGlobal,
      disciplinasEmRisco,
      totalAulas,
      curso,
    } = await req.json();
    const nome = String(alunoNome ?? "Estudante").trim();
    const presenca = Number(presencaGlobal);
    const risco = Array.isArray(disciplinasEmRisco)
      ? disciplinasEmRisco.join(", ")
      : "nenhuma no momento";
    const aulas =
      Number.isFinite(Number(totalAulas)) && Number(totalAulas) > 0
        ? Math.round(Number(totalAulas))
        : null;

    const prompt = buildPrompt(
      `Tarefa: orientação de frequência para o estudante.
Uma ou duas frases curtas, falando diretamente com o aluno. Cite nome, % e disciplinas reais. Sem tom de script automático.
Retorne: { "insight": "sua orientação aqui" }`,
      `Estudante: ${nome}. Presença global: ${
        Number.isFinite(presenca) ? `${presenca}%` : "ainda sem histórico consolidado"
      }${aulas ? ` (base em ${aulas} aulas)` : ""}. Disciplinas em atenção/risco: ${risco}.`,
      {
        publico: "aluno",
        alunoNome: nome,
        curso: String(curso ?? "").trim() || undefined,
        dadosEspecificos: `Presença global: ${presenca}%.${
          aulas ? ` Total de aulas consideradas: ${aulas}.` : ""
        } Disciplinas em risco: ${risco}.`,
      }
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
