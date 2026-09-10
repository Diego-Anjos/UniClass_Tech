import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { professor, filtros, metricasGlobais } = await req.json();

    const systemPrompt = `Você é um analista de dados educacionais ajudando o(a) ${professor}.
Com base nas métricas globais da turma (médias de notas e frequência) filtradas por ${filtros.ano} e ${filtros.semestre}, faça uma breve análise de desempenho (máximo de 3 frases).
Aponte tendências (ex: "notas caíram no segundo bimestre") e dê uma recomendação rápida. 
REGRAS OBRIGATÓRIAS:
1. RESPONDA ESTRITAMENTE EM PORTUGUÊS DO BRASIL. 
2. NUNCA utilize palavras em inglês.
3. Mantenha um tom profissional e direto.`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Métricas atuais: ${JSON.stringify(metricasGlobais)}` }
      ],
      model: "gemma2-9b-it",
      temperature: 0.5,
      max_tokens: 300,
    });

    return NextResponse.json({ analise: completion.choices[0]?.message?.content || "Análise indisponível no momento." });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ analise: "Não foi possível gerar a análise macro da turma neste momento." });
  }
}
