import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { context, turmasAtivas } = await req.json();

    const mensagens = [
      {
        role: "system",
        content: "Você é um assistente acadêmico virtual da plataforma UniClassTech. Você fornece dicas úteis, curtas e profissionais para professores. Seja direto e não use formatação markdown especial, apenas texto limpo."
      },
      {
        role: "user",
        content: `Gere uma análise motivacional ou dica de gestão em exatas DUAS frases curtas para o ${context}, considerando que ele possui ${turmasAtivas} turma(s) ativa(s) no momento.`
      }
    ];

    let completion;

    try {
      // Tentativa 1: Modelo Primário
      completion = await groq.chat.completions.create({
        messages: mensagens,
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_tokens: 150,
      });
    } catch (erroPrimario: any) {
      console.warn("Falha no modelo primário (llama-3.3-70b-versatile):", erroPrimario.message || erroPrimario);
      
      // Tentativa 2: Modelo de Redundância
      completion = await groq.chat.completions.create({
        messages: mensagens,
        model: "llama-3.2-3b-preview",
        temperature: 0.7,
        max_tokens: 150,
      });
    }

    const insight = completion?.choices[0]?.message?.content || "Sua rotina acadêmica está organizada. Tenha um ótimo dia de aulas!";
    
    return NextResponse.json({ insight });
  } catch (error) {
    console.error("Erro crítico na API do Groq (ambos os modelos falharam):", error);
    return NextResponse.json({ insight: "Os insights gerados por IA estão temporariamente indisponíveis. Tente novamente mais tarde." }, { status: 200 });
  }
}
