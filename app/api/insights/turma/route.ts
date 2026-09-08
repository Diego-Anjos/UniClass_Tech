import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { turma, totalAlunos } = await req.json();

    const mensagens = [
      {
        role: "system",
        content: "Você é um assistente acadêmico. Analise o contexto da turma e forneça uma dica pedagógica de até duas frases sobre como melhorar o engajamento ou as notas da turma. Seja direto e não use formatação markdown."
      },
      {
        role: "user",
        content: `Gere uma análise rápida para a turma de ${turma}, que possui ${totalAlunos} alunos no momento. Não cite notas específicas, foque em metodologias ativas ou dicas de revisão.`
      }
    ];

    let completion;
    try {
      completion = await groq.chat.completions.create({
        messages: mensagens, model: "openai/gpt-oss-20b", temperature: 0.7, max_tokens: 150,
      });
    } catch (err) {
      completion = await groq.chat.completions.create({
        messages: mensagens, model: "llama-3.1-8b-instant", temperature: 0.7, max_tokens: 150,
      });
    }

    const insight = completion?.choices[0]?.message?.content || "Revise os conceitos principais da disciplina para garantir nivelamento.";
    return NextResponse.json({ insight });
  } catch (error) {
    return NextResponse.json({ error: "Falha ao gerar análise da turma." }, { status: 500 });
  }
}
