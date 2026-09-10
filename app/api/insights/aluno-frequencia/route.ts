import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { alunoNome, presencaGlobal, disciplinasEmRisco } = await req.json();

    const mensagens = [
      {
        role: "system" as const,
        content:
          "Aja como um orientador acadêmico empático e humano. Escreva exatamente uma ou duas frases curtas. Fale diretamente com o aluno de forma natural, amigável e encorajadora. Nunca use linguagem engessada, clichês institucionais ou pareça um script automático. Vá direto ao ponto.",
      },
      {
        role: "user" as const,
        content: `Estudante: ${alunoNome}. Presença global: ${presencaGlobal}%. Disciplinas em situação de atenção/risco: ${
          Array.isArray(disciplinasEmRisco) && disciplinasEmRisco.length > 0
            ? disciplinasEmRisco.join(", ")
            : "nenhuma"
        }. Dê uma orientação direta para manutenção de frequência.`,
      },
    ];

    let completion;
    try {
      completion = await groq.chat.completions.create({
        messages: mensagens,
        model: "openai/gpt-oss-20b",
        temperature: 0.6,
        max_tokens: 150,
      });
    } catch (err) {
      console.warn("Falha no modelo primário (openai/gpt-oss-20b):", err);
      completion = await groq.chat.completions.create({
        messages: mensagens,
        model: "llama3-8b-8192",
        temperature: 0.6,
        max_tokens: 150,
      });
    }

    const insight =
      completion?.choices[0]?.message?.content ||
      "Sua frequência está sob controle. Continue participando das aulas para evitar acúmulo de faltas no fim do semestre.";

    return NextResponse.json({ insight });
  } catch (error) {
    console.error("Erro crítico na API de frequência do aluno:", error);
    return NextResponse.json(
      { error: "Falha na análise de frequência do aluno." },
      { status: 500 }
    );
  }
}
