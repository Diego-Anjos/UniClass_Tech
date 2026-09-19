import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { requireRole } from "@/lib/api-auth";
import { modelosFallback } from "@/lib/gemini-fallback";

function isRateLimitOrUnavailableError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("429") ||
    lower.includes("503") ||
    lower.includes("quota") ||
    lower.includes("too many requests") ||
    lower.includes("rate limit") ||
    lower.includes("service unavailable") ||
    lower.includes("high demand")
  );
}

export async function GET(req: Request) {
  const denied = requireRole(req, ["admin"]);
  if (denied) return denied;

  if (!process.env.GEMINI_API_KEY) {
    console.error("[/api/gemini/test] GEMINI_API_KEY não definida no ambiente.");
    return NextResponse.json(
      {
        status: "error",
        error: "Configuração de servidor incompleta: chave do Gemini ausente.",
      },
      { status: 503 }
    );
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const modeloNome = modelosFallback[0];
    const model = genAI.getGenerativeModel({ model: modeloNome });
    await model.generateContent("Responda apenas: ok");

    return NextResponse.json({
      success: true,
      status: "ok",
      provider: "gemini",
      model: modeloNome,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Falha ao conectar com o Gemini.";
    console.error("[/api/gemini/test] Erro:", message);

    // Cota/rate limit / 503 = chave válida e rede OK — sucesso parcial, não falha de conexão
    if (isRateLimitOrUnavailableError(message)) {
      return NextResponse.json(
        {
          success: true,
          status: "rate_limited",
          message: "Conectado (Limite de Cota)",
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { success: false, status: "error", error: message },
      { status: 503 }
    );
  }
}
