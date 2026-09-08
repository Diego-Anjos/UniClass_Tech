import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { alunoNome, turmaNome, assunto, conteudo } = await req.json();

    const mensagens = [
      {
        role: "system",
        content: "Você é um assistente acadêmico interno para professores. Gere uma única frase direta resumindo a situação ou contexto para orientar a resposta do professor. Inicie a resposta diretamente com o fato principal, sem saudações ou markdown."
      },
      {
        role: "user",
        content: `O aluno ${alunoNome} da turma ${turmaNome} enviou uma mensagem com assunto '${assunto}' e conteúdo: "${conteudo}". Dê um resumo de contexto útil para o professor responder de forma ágil.`
      }
    ];

    let completion;
    try {
      completion = await groq.chat.completions.create({
        messages: mensagens,
        model: "openai/gpt-oss-20b",
        temperature: 0.5,
        max_tokens: 100,
      });
    } catch (err) {
      completion = await groq.chat.completions.create({
        messages: mensagens,
        model: "llama-3.1-8b-instant",
        temperature: 0.5,
        max_tokens: 100,
      });
    }

    const insight = completion?.choices[0]?.message?.content || 
      "Aluno solicitando esclarecimento pedagógico. Verifique os lançamentos recentes.";

    return NextResponse.json({ insight });
  } catch (error) {
    return NextResponse.json({ error: "Falha ao gerar contexto da mensagem." }, { status: 500 });
  }
}
