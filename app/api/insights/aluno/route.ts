import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { requireApiAuth, serviceUnavailable } from "@/lib/api-auth";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  const denied = requireApiAuth(req);
  if (denied) return denied;

  try {
    const { nome, curso, semestre, professor } = await req.json();

    const systemPrompt = `Você é um analista pedagógico sênior do ERP educacional UniClassTech.
Com base no estudante, seu curso e semestre, gere um diagnóstico acadêmico preditivo e retorne ESTRITAMENTE um JSON válido (sem markdown, sem blocos de código) no seguinte formato:
{
  "tipoAlerta": "ALERTA PREDITIVO" | "DESEMPENHO NOTÁVEL" | "RISCO DE EVASÃO",
  "corAlerta": "amber" | "emerald" | "rose",
  "mensagem": "Texto objetivo de até 2 frases sobre o desempenho ou frequência do aluno.",
  "riscoLabel": "Baixo" | "Moderado" | "Crítico" | "Nenhum",
  "metricaLabel": "FALTAS" | "MÉDIA N1" | "ENGAJAMENTO",
  "metricaValor": "14%" | "8.8" | "92%"
}`;

    const userPrompt = `Aluno: ${nome}
Curso: ${curso}
Semestre: ${semestre}
Professor Responsável: ${professor || "Corpo Docente"}`;

    let completion;
    try {
      completion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        model: "llama3-70b-8192",
        temperature: 0.6,
        response_format: { type: "json_object" },
      });
    } catch {
      completion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        model: "llama3-8b-8192",
        temperature: 0.6,
        response_format: { type: "json_object" },
      });
    }

    const content = completion?.choices[0]?.message?.content || "{}";
    const data = JSON.parse(content);
    return NextResponse.json(data);
  } catch (error) {
    return serviceUnavailable("Os insights gerados por IA estão temporariamente indisponíveis.");
  }
}
