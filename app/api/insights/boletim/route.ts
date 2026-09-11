import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { alunoNome, totalDisciplinas, disciplinasPendentes } = await req.json();

    const mensagens = [
      {
        role: "system" as const,
        content:
          "Você é um mentor acadêmico virtual da UniClassTech. Com base na situação das disciplinas do aluno, forneça uma recomendação clara e encorajadora em exatamente DUAS frases curtas, orientando onde ele deve focar seus estudos. Sem formatação markdown.",
      },
      {
        role: "user" as const,
        content: `O estudante ${alunoNome} está cursando ${totalDisciplinas} disciplinas. Disciplinas que demandam atenção ou estão em andamento: ${disciplinasPendentes}. Dê uma orientação prática sobre metas de estudo para fechar o semestre com aprovação.`,
      },
    ];

    let completion;
    try {
      completion = await groq.chat.completions.create({
        messages: mensagens,
        model: "llama-3.1-70b-versatile",
        temperature: 0.6,
        max_tokens: 120,
      });
    } catch (err) {
      console.warn("Falha no modelo primário (llama-3.1-70b-versatile):", err);
      completion = await groq.chat.completions.create({
        messages: mensagens,
        model: "llama-3.1-8b-instant",
        temperature: 0.6,
        max_tokens: 120,
      });
    }

    const insight =
      completion?.choices[0]?.message?.content ||
      "Mantenha uma rotina diária de revisão para as disciplinas em andamento. Foque nas matérias com entregas práticas pendentes.";

    return NextResponse.json({ insight });
  } catch (error) {
    console.error("Erro crítico na API do boletim:", error);
    return NextResponse.json({ insight: "Os insights gerados por IA estão temporariamente indisponíveis. Tente novamente mais tarde." }, { status: 200 });
  }
}
