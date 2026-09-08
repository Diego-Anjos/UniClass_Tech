import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { turma, totalAlunos, totalFaltas } = await req.json();

    const mensagens = [
      {
        role: "system",
        content: "Você é um assistente pedagógico. Analise os dados de presença da turma e gere um alerta conciso de até duas frases para o professor sobre retenção, engajamento ou acompanhamento de faltas. Não use markdown especial."
      },
      {
        role: "user",
        content: `Na turma ${turma}, de ${totalAlunos} alunos registrados hoje, houve ${totalFaltas} falta(s). Dê uma orientação direta ao professor sobre o engajamento desta aula.`
      }
    ];

    let completion;
    try {
      completion = await groq.chat.completions.create({
        messages: mensagens,
        model: "openai/gpt-oss-20b",
        temperature: 0.6,
        max_tokens: 120,
      });
    } catch (err) {
      completion = await groq.chat.completions.create({
        messages: mensagens,
        model: "llama-3.1-8b-instant",
        temperature: 0.6,
        max_tokens: 120,
      });
    }

    const insight = completion?.choices[0]?.message?.content || "Presença registrada. Acompanhe os alunos recorrentemente ausentes para evitar evasão.";
    return NextResponse.json({ insight });
  } catch (error) {
    return NextResponse.json({ error: "Falha na análise de frequência." }, { status: 500 });
  }
}
