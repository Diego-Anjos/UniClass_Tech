import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { andar, salaProxima } = await req.json();

    const mensagens = [
      {
        role: "system" as const,
        content:
          "Você é o assistente de navegação no campus da UniClassTech. Dê uma dica curta e útil de até duas frases sobre como otimizar o tempo no andar selecionado ou onde estudar. Não use formatação markdown.",
      },
      {
        role: "user" as const,
        content: `O estudante está visualizando o ${andar}. Sua próxima aula é no ambiente '${salaProxima}'. Dê uma orientação de deslocamento ou recomendação de laboratório livre.`,
      },
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
      console.warn("Falha no modelo primário (openai/gpt-oss-20b):", err);
      completion = await groq.chat.completions.create({
        messages: mensagens,
        model: "llama-3.1-8b-instant",
        temperature: 0.6,
        max_tokens: 120,
      });
    }

    const insight =
      completion?.choices[0]?.message?.content ||
      "Consulte os laboratórios com status 'Livre' para estudo prático individual durante seus horários vagos.";

    return NextResponse.json({ insight });
  } catch (error) {
    console.error("Erro crítico na API do mapa de salas:", error);
    return NextResponse.json(
      { error: "Falha ao gerar dica do mapa." },
      { status: 500 }
    );
  }
}
