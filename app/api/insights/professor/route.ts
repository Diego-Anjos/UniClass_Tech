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
  const denied = requireRole(req, ["professor", "admin"]);
  if (denied) return denied;

  try {
    const {
      nome,
      titulacao,
      area_atuacao,
      carga_horaria,
      turmasCount,
      professorId,
    } = await req.json();
    const prefs = await buscarPreferenciasProfessor(professorId);

    const prompt = buildPrompt(
      `Você é um coordenador de curso experiente e humano da UniClassTech.
${blocoPreferenciasIa(prefs)}
Analise os dados do docente e retorne um objeto JSON com o seguinte formato:
{
  "tipoAlerta": "ALERTA DE RETENÇÃO" ou "DESEMPENHO POSITIVO" ou "EQUILÍBRIO DE CARGA",
  "corAlerta": "amber" ou "emerald" ou "blue",
  "mensagem": "Texto curto e empático de até 2 frases explicando o diagnóstico acadêmico para a diretoria, com foco no desenvolvimento dos estudantes.",
  "metricaValor": "-12%" ou "+18%" ou "100%",
  "metricaLabel": "QUEDA" ou "ENGAGEMENT" ou "ADERÊNCIA",
  "turmaDestaque": "Sigla da turma ou área",
  "detalheComparativo": "Texto explicativo de 1 linha sobre a métrica, em linguagem natural."
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
