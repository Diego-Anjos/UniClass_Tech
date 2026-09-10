import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { cursoNome, disciplinasAtuais } = await req.json();

    const listaDisciplinas = Array.isArray(disciplinasAtuais)
      ? disciplinasAtuais
      : [];

    const mensagens = [
      {
        role: "system" as const,
        content:
          "Você é um conselheiro pedagógico e de carreira da UniClassTech. Com base no curso do estudante e suas disciplinas atuais, forneça uma recomendação prática de até duas frases sobre competências complementares ou tecnologias recomendadas para o mercado. Não use formatação markdown.",
      },
      {
        role: "user" as const,
        content: `Curso: ${cursoNome}. Disciplinas atuais cursadas: ${
          listaDisciplinas.length > 0
            ? listaDisciplinas.join(", ")
            : "nenhuma disciplina cadastrada"
        }. Indique uma dica de estudo ou preparação para os próximos semestres.`,
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
        model: "llama3-8b-8192",
        temperature: 0.6,
        max_tokens: 120,
      });
    }

    const insight =
      completion?.choices[0]?.message?.content ||
      "Aprofunde-se nos fundamentos práticos das disciplinas atuais. Praticar projetos pessoais fortalece sua evolução para os próximos semestres.";

    return NextResponse.json({ insight });
  } catch (error) {
    console.error("Erro crítico na API de grade curricular:", error);
    return NextResponse.json(
      { error: "Falha na análise de grade curricular." },
      { status: 500 }
    );
  }
}
