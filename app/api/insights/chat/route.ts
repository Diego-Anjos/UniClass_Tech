import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { messages, professor, contextoAluno } = await req.json();

    const systemPrompt = `Você é um assistente pedagógico de Inteligência Artificial integrado ao ERP UniClassTech, auxiliando o(a) ${professor}.
Seu objetivo é responder dúvidas sobre o desempenho, faltas e perfil do aluno selecionado.
Aja de forma natural, consultiva e direta, como um colega de trabalho humano conversando no chat. Não use roteiros engessados.

Contexto atual do aluno selecionado no painel do professor:
${contextoAluno}

Responda sempre em português do Brasil de forma clara e sem usar formatações excessivas.`;

    const groqMessages = [
      { role: "system", content: systemPrompt },
      ...messages
    ];

    const completion = await groq.chat.completions.create({
      messages: groqMessages,
      model: "gemma2-9b-it",
      temperature: 0.7,
      max_tokens: 500,
    });

    const respostaTexto = completion.choices[0]?.message?.content || "Desculpe, não consegui processar a análise agora.";

    return NextResponse.json({ reply: respostaTexto });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ insight: "Os insights gerados por IA estão temporariamente indisponíveis. Tente novamente mais tarde." }, { status: 200 });
  }
}
