import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // Guard: chave de API deve existir como variável de servidor (nunca NEXT_PUBLIC_)
  if (!process.env.GROQ_API_KEY) {
    console.error("[/api/insights] GROQ_API_KEY não definida no ambiente.");
    return NextResponse.json(
      { error: "Configuração de servidor incompleta: chave da Groq ausente." },
      { status: 503 }
    );
  }

  try {
    const { curso, capacidade, ocupacao } = await req.json();

    if (!curso || capacidade === undefined || ocupacao === undefined) {
      return NextResponse.json(
        { error: "Campos obrigatórios ausentes: curso, capacidade, ocupacao." },
        { status: 400 }
      );
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const completion = await groq.chat.completions.create({
      model: "llama3-8b-8192",
      messages: [
        {
          role: "system",
          content:
            "Você é um assistente de gestão acadêmica. Analise os dados da turma. " +
            "Seja direto, profissional e gere no máximo 2 frases em português sugerindo " +
            "uma ação (ex: abrir mais vagas, fundir turmas ou focar em retenção). " +
            "Não use saudações.",
        },
        {
          role: "user",
          content: `Curso: ${curso}, Ocupação: ${ocupacao} de ${capacidade} vagas.`,
        },
      ],
      temperature: 0.6,
      max_tokens: 150,
    });

    const insight =
      completion.choices?.[0]?.message?.content?.trim() ??
      "Não foi possível gerar uma análise no momento.";

    return NextResponse.json({ insight });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno do servidor.";
    console.error("[/api/insights] Erro:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
