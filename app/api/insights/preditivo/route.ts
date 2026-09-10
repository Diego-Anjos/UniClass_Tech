import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { escopo, totalTurmas, alunosEmRisco } = await req.json();

    const mensagens = [
      {
        role: "system",
        content: "Você é um especialista em análise preditiva educacional da plataforma UniClassTech. Com base nos dados fornecidos, gere um resumo executivo de exatamente DUAS frases com métricas ou ações preventivas (sem formatação markdown)."
      },
      {
        role: "user",
        content: `Escopo: ${escopo}. Total de turmas ativas: ${totalTurmas}. Alunos detectados em situação de risco: ${alunosEmRisco}. Destaque uma recomendação preditiva rápida para evitar evasão e melhorar o aproveitamento.`
      }
    ];

    let completion;
    try {
      completion = await groq.chat.completions.create({
        messages: mensagens,
        model: "gemma2-9b-it",
        temperature: 0.6,
        max_tokens: 140,
      });
    } catch (err) {
      completion = await groq.chat.completions.create({
        messages: mensagens,
        model: "gemma-7b-it",
        temperature: 0.6,
        max_tokens: 140,
      });
    }

    const insight = completion?.choices[0]?.message?.content || 
      "Acompanhamento preditivo estabilizado. Mantenha os planos de reforço pedagógico nas disciplinas com menor índice de rendimento.";

    return NextResponse.json({ insight });
  } catch (error) {
    return NextResponse.json({ insight: "Os insights gerados por IA estão temporariamente indisponíveis. Tente novamente mais tarde." }, { status: 200 });
  }
}
