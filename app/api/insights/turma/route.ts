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
      const prompt = buildPrompt(
        `Você é um coordenador de curso experiente e humano, ajudando o(a) ${professor} a acompanhar a turma.
Com base nas métricas da turma (médias de notas e frequência) filtradas por ${filtros?.ano} e ${filtros?.semestre}, faça uma breve análise pedagógica (máximo de 3 frases).
Aponte tendências com empatia e dê uma recomendação prática focada no desenvolvimento dos estudantes.
${blocoPreferenciasIa(prefs)}
REGRAS OBRIGATÓRIAS:
1. RESPONDA ESTRITAMENTE EM PORTUGUÊS DO BRASIL.
2. NUNCA utilize palavras em inglês.
3. Mantenha o tom definido nas preferências do docente, sem perder o acolhimento pedagógico.
4. Use APENAS os números em "Métricas atuais". NÃO invente médias, frequências, totais de alunos ou séries mensais.
5. Se o histórico ainda for inicial ou incompleto, contextualize naturalmente (ex.: "ainda no começo do semestre...") — não diga que o dado é "insuficiente" ou "indisponível".
Retorne no formato: { "analise": "seu texto aqui", "insight": "mesmo texto aqui" }`,
        `Métricas atuais (não invente fora disso): ${JSON.stringify(metricasGlobais)}`
      );

      const data = await generateJsonWithFallback(genAI, prompt);
      const analise =
        (typeof data.analise === "string" && data.analise) ||
        (typeof data.insight === "string" && data.insight) ||
        FALLBACK_ANALISE;
      return NextResponse.json({ analise, insight: analise });
    }

    // Payload do painel admin (gestão da turma)
    const prompt = buildPrompt(
      `Você é um coordenador de curso experiente e humano da UniClassTech.
Analise a turma e retorne um parágrafo curto (máximo 3 frases) em português do Brasil sobre ocupação, engajamento e recomendações de acompanhamento pedagógico. Sem markdown. Foque no desenvolvimento dos estudantes.
${blocoPreferenciasIa(prefs)}
Retorne no formato: { "analise": "seu texto aqui", "insight": "mesmo texto aqui" }`,
      `Turma: ${codigo}
Curso: ${curso}
Turno: ${turno}
Semestre: ${semestre}
Matriculados: ${matriculados}
Capacidade: ${capacidade}`
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
