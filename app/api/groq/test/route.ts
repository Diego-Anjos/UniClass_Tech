import Groq from "groq-sdk";
import { NextResponse } from "next/server";

export async function GET() {
  // Guard: chave de API deve existir como variável de servidor (nunca NEXT_PUBLIC_)
  if (!process.env.GROQ_API_KEY) {
    console.error("[/api/groq/test] GROQ_API_KEY não definida no ambiente.");
    return NextResponse.json(
      { status: "error", error: "Configuração de servidor incompleta: chave da Groq ausente." },
      { status: 503 }
    );
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // Lista os modelos disponíveis — chamada leve que valida a chave sem consumir tokens
    await groq.models.list();

    return NextResponse.json({ status: "ok" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Falha ao conectar com a Groq.";
    console.error("[/api/groq/test] Erro:", message);
    return NextResponse.json({ status: "error", error: message }, { status: 500 });
  }
}
