import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { requireApiAuth, serviceUnavailable } from "@/lib/api-auth";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  const denied = requireApiAuth(req);
  if (denied) return denied;

  try {
    const { notas } = await req.json();

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "Você é o assistente de IA do ERP UniClassTech. Analise o seguinte JSON com notas (N1, N2) e faltas de um aluno. Crie um parágrafo curto, direto e empático (máximo 3 frases). Se houver notas abaixo de 6 ou faltas altas, dê um alerta construtivo. Se estiver indo bem, seja motivador. Não use formatação markdown como negrito.",
        },
        { role: "user", content: JSON.stringify(notas) },
      ],
      model: "llama3-70b-8192",
      temperature: 0.6,
    });

    return NextResponse.json(
      { insight: completion.choices[0]?.message?.content },
      { status: 200 }
    );
  } catch (error) {
    console.error("ERRO GROQ:", error);
    return serviceUnavailable("Os insights gerados por IA estão temporariamente indisponíveis.");
  }
}
