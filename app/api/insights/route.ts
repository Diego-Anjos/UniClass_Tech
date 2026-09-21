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
      context,
      turmasAtivas,
      professorId,
      professorNome,
      disciplina,
      turno,
      turmasResumo,
    } = await req.json();

    const totalTurmas = Number(turmasAtivas) || 0;
    const nomeDocente =
      String(professorNome ?? context ?? "Professor").trim() || "Professor";
    const prefs = await buscarPreferenciasProfessor(professorId);

    const resumoTurmas = Array.isArray(turmasResumo)
      ? turmasResumo
          .slice(0, 8)
          .map((t: unknown) => {
            if (!t || typeof t !== "object") return null;
            const row = t as Record<string, unknown>;
            const curso = String(row.curso ?? row.disciplina ?? "").trim();
            const codigo = String(row.codigo ?? "").trim();
            const turnoTurma = String(row.turno ?? "").trim();
            if (!curso && !codigo) return null;
            return [curso || "Turma", codigo && `Turma ${codigo}`, turnoTurma]
              .filter(Boolean)
              .join(" · ");
          })
          .filter(Boolean)
          .join("; ")
      : "";

    const instrucaoTurmas =
      totalTurmas > 0
        ? `O(a) professor(a) ${nomeDocente} tem ${totalTurmas} turma(s) ativa(s)${
            resumoTurmas ? `: ${resumoTurmas}` : ""
          }. NÃO diga que está sem turmas ou ocioso. Entregue exatamente DUAS frases: uma observação analítica sobre o momento da gestão de turma e uma dica prática acionável.`
        : `O(a) professor(a) ${nomeDocente} ainda não possui turmas ativas cadastradas. Entregue exatamente DUAS frases acolhedoras e práticas sobre preparação pedagógica — sem soar como boas-vindas genéricas.`;

    const prompt = buildPrompt(
      `Tarefa: insight de abertura do painel docente da UniClassTech.
${blocoPreferenciasIa(prefs)}
Sem markdown. Sem saudações. Retorne: { "insight": "duas frases aqui" }`,
      instrucaoTurmas,
      {
        publico: "professor",
        professorNome: nomeDocente,
        disciplina:
          String(disciplina ?? "").trim() ||
          undefined,
        turno: String(turno ?? "").trim() || undefined,
        dadosEspecificos: `Turmas ativas: ${totalTurmas}.${
          resumoTurmas ? ` Detalhe: ${resumoTurmas}.` : ""
        }`,
      }
    );

    const data = await generateJsonWithFallback(genAI, prompt);
    const insight =
      (typeof data.insight === "string" && data.insight) || FALLBACK_INSIGHT;
    return NextResponse.json({ insight });
  } catch (error) {
    console.error("Erro crítico na API de insights:", error);
    return NextResponse.json({ insight: FALLBACK_INSIGHT }, { status: 200 });
  }
}
