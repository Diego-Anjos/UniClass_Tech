import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import {
  buildPrompt,
  createGenAI,
  generateJsonWithFallback,
} from "@/lib/gemini-fallback";
import { blocoPreferenciasIa } from "@/lib/professor-preferencias";
import { buscarPreferenciasProfessor } from "@/lib/professor-preferencias-server";

const genAI = createGenAI();

const FALLBACK_INSIGHT =
  "Não foi possível gerar a análise da IA no momento. Tente novamente mais tarde.";

export async function POST(req: NextRequest) {
  const denied = requireRole(req, ["professor", "admin"]);
  if (denied) return denied;

  try {
    const {
      turma,
      totalAlunos,
      totalFaltas,
      professorId,
      professorNome,
      disciplina,
      turno,
    } = await req.json();
    const prefs = await buscarPreferenciasProfessor(professorId);
    const total = Number(totalAlunos) || 0;
    const faltas = Number(totalFaltas) || 0;

    const prompt = buildPrompt(
      `Tarefa: alerta de frequência da turma para o docente.
${blocoPreferenciasIa(prefs)}
Até duas frases, citando a turma e os números reais. Sem markdown.
Retorne: { "insight": "seu alerta aqui" }`,
      `Na turma ${turma}, de ${total} alunos registrados hoje, houve ${faltas} falta(s). Oriente o professor sobre engajamento desta aula.`,
      {
        publico: "professor",
        professorNome: String(professorNome ?? "").trim() || undefined,
        disciplina: String(disciplina ?? "").trim() || undefined,
        turno: String(turno ?? "").trim() || undefined,
        turmaNome: String(turma ?? "").trim() || undefined,
        tamanhoTurma: total,
        dadosEspecificos: `Total alunos: ${total}. Faltas hoje: ${faltas}.`,
      }
    );

    const data = await generateJsonWithFallback(genAI, prompt);
    const insight =
      (typeof data.insight === "string" && data.insight) || FALLBACK_INSIGHT;
    return NextResponse.json({ insight });
  } catch (error) {
    console.error("Erro crítico na API de frequência:", error);
    return NextResponse.json({ insight: FALLBACK_INSIGHT }, { status: 200 });
  }
}
