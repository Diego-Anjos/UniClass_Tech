import Groq from "groq-sdk";
import { NextResponse } from "next/server";

export async function GET() {
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
