import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { requireApiAuth, serviceUnavailable } from "@/lib/api-auth";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  const denied = requireApiAuth(req);
  if (denied) return denied;

  try {
    const { nome, titulacao, area_atuacao, carga_horaria, turmasCount } =
      await req.json();

    const systemPrompt = `Você é um analista acadêmico sênior do ERP educacional UniClassTech.
Analise os dados do docente e retorne ESTRITAMENTE um objeto JSON válido (sem blocos de código markdown, sem texto fora das chaves) com o seguinte formato:
{
  "tipoAlerta": "ALERTA DE RETENÇÃO" ou "DESEMPENHO POSITIVO" ou "EQUILÍBRIO DE CARGA",
  "corAlerta": "amber" ou "emerald" ou "blue",
  "mensagem": "Texto curto de até 2 frases explicando o diagnóstico acadêmico para a diretoria.",
  "metricaValor": "-12%" ou "+18%" ou "100%",
  "metricaLabel": "QUEDA" ou "ENGAGEMENT" ou "ADERÊNCIA",
  "turmaDestaque": "Sigla da turma ou área",
  "detalheComparativo": "Texto explicativo de 1 linha sobre a métrica."
}`;

    const userPrompt = `Docente: ${titulacao} ${nome}
Área: ${area_atuacao}
Carga Horária: ${carga_horaria}
Turmas Atribuídas: ${turmasCount}`;

    let completion;
    try {
      completion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        model: "llama3-70b-8192",
        temperature: 0.5,
        response_format: { type: "json_object" },
      });
    } catch {
      completion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        model: "llama3-8b-8192",
        temperature: 0.5,
        response_format: { type: "json_object" },
      });
    }

    const content = completion?.choices[0]?.message?.content || "{}";
    const data = JSON.parse(content);
    return NextResponse.json(data);
  } catch {
    return serviceUnavailable("Os insights gerados por IA estão temporariamente indisponíveis.");
  }
}
