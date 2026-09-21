import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import {
  buildPrompt,
  createGenAI,
  generateJsonWithFallback,
} from "@/lib/gemini-fallback";

const genAI = createGenAI();

const FALLBACK_INSIGHT =
  "Não foi possível gerar a análise da IA no momento. Tente novamente mais tarde.";

function formatarNotasParaPrompt(notas: unknown, alunoNome?: string): string {
  if (!Array.isArray(notas) || notas.length === 0) {
    return alunoNome
      ? `${alunoNome} ainda não possui lançamentos consolidados neste boletim.`
      : "Ainda sem lançamentos consolidados neste boletim.";
  }

  return notas
    .map((item, idx) => {
      if (!item || typeof item !== "object") return null;
      const n = item as Record<string, unknown>;
      const disciplina = String(n.disciplina ?? `Disciplina ${idx + 1}`);
      const professor = String(n.professor ?? "—");
      const n1 = n.n1 ?? "ainda não lançada";
      const n2 = n.n2 ?? "ainda não lançada";
      const n3 = n.n3 ?? "ainda não lançada";
      const faltas = n.faltas ?? 0;
      return `- ${disciplina} (prof. ${professor}): N1=${n1}, N2=${n2}, N3=${n3}, faltas registradas=${faltas}`;
    })
    .filter(Boolean)
    .join("\n");
}

export async function POST(req: Request) {
  const denied = requireRole(req, ["aluno", "professor", "admin"]);
  if (denied) return denied;

  try {
    const { notas, alunoNome, curso, semestre } = await req.json();
    const nome = String(alunoNome ?? "").trim();
    const detalhe = formatarNotasParaPrompt(notas, nome);

    const prompt = buildPrompt(
      `Tarefa: feedback de desempenho no boletim do estudante.
Fale diretamente com o aluno em no máximo 3 frases. Cite disciplinas e números reais quando existirem.
Se houver nota abaixo de 6 ou faltas altas, oriente com cuidado. Se estiver bem, reconheça o esforço sem exagero.
Retorne: { "insight": "seu parágrafo aqui" }`,
      `Situação do boletim:\n${detalhe}`,
      {
        publico: "aluno",
        alunoNome: nome || undefined,
        curso: String(curso ?? "").trim() || undefined,
        dadosEspecificos: [
          semestre ? `Semestre: ${semestre}` : null,
          detalhe,
        ]
          .filter(Boolean)
          .join("\n"),
      }
    );

    const data = await generateJsonWithFallback(genAI, prompt);
    const insight =
      (typeof data.insight === "string" && data.insight) || FALLBACK_INSIGHT;
    return NextResponse.json({ insight }, { status: 200 });
  } catch (error) {
    console.error("ERRO GEMINI:", error);
    return NextResponse.json({ insight: FALLBACK_INSIGHT }, { status: 200 });
  }
}
