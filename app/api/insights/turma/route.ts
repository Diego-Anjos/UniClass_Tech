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

const FALLBACK_ANALISE =
  "Não foi possível gerar a análise da IA no momento. Tente novamente mais tarde.";

export async function POST(req: NextRequest) {
  const denied = requireRole(req, ["professor", "admin"]);
  if (denied) return denied;

  try {
    const body = await req.json();
    const {
      professor,
      professorId,
      filtros,
      metricasGlobais,
      codigo,
      curso,
      turno,
      semestre,
      matriculados,
      capacidade,
    } = body;

    const prefs = await buscarPreferenciasProfessor(professorId);

    // Payload do painel do professor (métricas filtradas)
    if (metricasGlobais || filtros) {
      const metricasJson = JSON.stringify(metricasGlobais);
      const tamanho =
        metricasGlobais &&
        typeof metricasGlobais === "object" &&
        Number.isFinite(Number((metricasGlobais as { totalAlunos?: unknown }).totalAlunos))
          ? Number((metricasGlobais as { totalAlunos?: unknown }).totalAlunos)
          : undefined;

      const prompt = buildPrompt(
        `Tarefa: análise de turma para o(a) ${professor}.
Filtro: ${filtros?.ano ?? "—"} / ${filtros?.semestre ?? "—"}.
Máximo 3 frases: tendência + recomendação prática.
${blocoPreferenciasIa(prefs)}
REGRAS: português do Brasil; sem inglês; use APENAS os números em "Métricas atuais"; não invente séries.
Retorne: { "analise": "seu texto aqui", "insight": "mesmo texto aqui" }`,
        `Métricas atuais (não invente fora disso): ${metricasJson}`,
        {
          publico: "professor",
          professorNome: String(professor ?? "").trim() || undefined,
          tamanhoTurma: tamanho,
          dadosEspecificos: metricasJson,
        }
      );

      const data = await generateJsonWithFallback(genAI, prompt);
      const analise =
        (typeof data.analise === "string" && data.analise) ||
        (typeof data.insight === "string" && data.insight) ||
        FALLBACK_ANALISE;
      return NextResponse.json({ analise, insight: analise });
    }

    // Payload do painel admin (gestão da turma)
    const detalheTurma = `Turma: ${codigo}
Curso: ${curso}
Turno: ${turno}
Semestre: ${semestre}
Matriculados: ${matriculados}
Capacidade: ${capacidade}`;

    const prompt = buildPrompt(
      `Tarefa: análise administrativa da turma.
Parágrafo curto (máx. 3 frases) sobre ocupação, engajamento e acompanhamento. Sem markdown.
${blocoPreferenciasIa(prefs)}
Retorne: { "analise": "seu texto aqui", "insight": "mesmo texto aqui" }`,
      detalheTurma,
      {
        publico: "admin",
        turmaNome: String(codigo ?? "").trim() || undefined,
        curso: String(curso ?? "").trim() || undefined,
        turno: String(turno ?? "").trim() || undefined,
        disciplina: String(curso ?? "").trim() || undefined,
        tamanhoTurma: Number.isFinite(Number(matriculados))
          ? Number(matriculados)
          : undefined,
        dadosEspecificos: detalheTurma,
      }
    );

    const data = await generateJsonWithFallback(genAI, prompt);
    const analise =
      (typeof data.analise === "string" && data.analise) ||
      (typeof data.insight === "string" && data.insight) ||
      FALLBACK_ANALISE;
    return NextResponse.json({ analise, insight: analise });
  } catch (error) {
    console.error("Erro crítico na API de insight da turma:", error);
    return NextResponse.json(
      { analise: FALLBACK_ANALISE, insight: FALLBACK_ANALISE },
      { status: 200 }
    );
  }
}
