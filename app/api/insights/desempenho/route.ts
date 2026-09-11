import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  try {
    const { notas } = await req.json();

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "Você é o assistente de IA do ERP UniClassTech. Analise o seguinte JSON com notas (N1, N2) e faltas de um aluno. Crie um parágrafo curto, direto e empático (máximo 3 frases). Se houver notas abaixo de 6 ou faltas altas, dê um alerta construtivo. Se estiver indo bem, seja motivador. Não use formatação markdown como negrito.",
        },
        { role: "user", content: JSON.stringify(notas) },
      ],
      model: "llama-3.1-70b-versatile",
      temperature: 0.6,
    });

    return NextResponse.json(
      { insight: completion.choices[0]?.message?.content },
      { status: 200 }
    );
  } catch (error) {
    console.error("ERRO GROQ:", error);
    return NextResponse.json(
      {
        insight:
          "Não foi possível analisar seu desempenho no momento. Continue acompanhando suas notas e faltas — em breve o feedback inteligente estará disponível novamente.",
      },
      { status: 200 }
    );
  }
}
