import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import {
  buildPrompt,
  createGenAI,
  generateJsonWithFallback,
} from "@/lib/gemini-fallback";

const genAI = createGenAI();

const FALLBACK_PROFESSOR = {
  tipoAlerta: "EQUILÍBRIO DE CARGA",
  corAlerta: "amber",
  mensagem:
    "Não foi possível gerar a análise da IA no momento. Tente novamente mais tarde.",
  metricaValor: "—",
  metricaLabel: "STATUS",
  turmaDestaque: "Indisponível",
  detalheComparativo: "Serviço de IA temporariamente indisponível.",
};

export async function POST(req: NextRequest) {
  const denied = requireApiAuth(req);
  if (denied) return denied;

  try {
    const { nome, titulacao, area_atuacao, carga_horaria, turmasCount } =
      await req.json();

    const prompt = buildPrompt(
      `Você é um analista acadêmico sênior do ERP educacional UniClassTech.
Analise os dados do docente e retorne um objeto JSON com o seguinte formato:
{
  "tipoAlerta": "ALERTA DE RETENÇÃO" ou "DESEMPENHO POSITIVO" ou "EQUILÍBRIO DE CARGA",
  "corAlerta": "amber" ou "emerald" ou "blue",
  "mensagem": "Texto curto de até 2 frases explicando o diagnóstico acadêmico para a diretoria.",
  "metricaValor": "-12%" ou "+18%" ou "100%",
  "metricaLabel": "QUEDA" ou "ENGAGEMENT" ou "ADERÊNCIA",
  "turmaDestaque": "Sigla da turma ou área",
  "detalheComparativo": "Texto explicativo de 1 linha sobre a métrica."
}`,
      `Docente: ${titulacao} ${nome}
Área: ${area_atuacao}
Carga Horária: ${carga_horaria}
Turmas Atribuídas: ${turmasCount}`
    );

    const data = await generateJsonWithFallback(genAI, prompt);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro crítico na API de insight do professor:", error);
    return NextResponse.json(FALLBACK_PROFESSOR, { status: 200 });
  }
}
