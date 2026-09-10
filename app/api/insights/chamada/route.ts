import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { turma, presentes, faltas, total } = await req.json();

    const taxaFalta = Math.round((faltas / (total || 1)) * 100);

    const systemPrompt = `Você é um assistente pedagógico. Baseado nos dados da chamada de hoje, gere um insight curto (máximo 2 linhas) para o professor. 
Retorne um JSON: { "tipoAlerta": "ALERTA DE FREQUÊNCIA" ou "ENGAJAMENTO ALTO", "mensagem": "texto aqui" }`;

    const userPrompt = `Turma: ${turma}. Hoje: ${presentes} presentes, ${faltas} faltas. Taxa de ausência diária: ${taxaFalta}%.`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      model: "llama3-8b-8192",
      temperature: 0.5,
      response_format: { type: "json_object" }
    });

    const data = JSON.parse(completion.choices[0]?.message?.content || "{}");
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({
      tipoAlerta: "ALERTA DE FREQUÊNCIA",
      mensagem: "Presença registrada. Acompanhe os alunos recorrentemente ausentes para evitar evasão."
    });
  }
}
