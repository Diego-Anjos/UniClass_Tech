import { GoogleGenerativeAI } from "@google/generative-ai";

export const modelosFallback = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-2.5-flash",
] as const;

export const JSON_ONLY_INSTRUCTION =
  "RETORNE APENAS UM JSON VÁLIDO E MAIS NADA, SEM MARCADORES MARKDOWN.";

const QUOTA_MESSAGE =
  "O assistente de IA está em alta demanda no momento devido ao limite de requisições. Tente novamente em alguns minutos.";

/**
 * JSON seguro compatível com os contratos das rotas /api/insights/*
 * (insight, mensagem, reply, analise, dica, tipoAlerta, etc.).
 */
export function getSafeGeminiFallbackJson(
  reason: string = "gemini_unavailable"
): Record<string, unknown> {
  return {
    status: "ok",
    insight: QUOTA_MESSAGE,
    mensagem: QUOTA_MESSAGE,
    reply: QUOTA_MESSAGE,
    analise: QUOTA_MESSAGE,
    dica: QUOTA_MESSAGE,
    tipoAlerta: "ALERTA TEMPORÁRIO",
    corAlerta: "amber",
    riscoLabel: "Indisponível",
    metricaLabel: "STATUS",
    metricaValor: "—",
    risco: "Indisponível",
    recomendacao: QUOTA_MESSAGE,
    pontos_atencao: "Serviço de IA temporariamente indisponível (cota/limite).",
    turmaDestaque: "Indisponível",
    detalheComparativo: QUOTA_MESSAGE,
    _fallback: true,
    _reason: reason,
  };
}

export function createGenAI() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
}

/** Detecta 429 (quota/rate limit) e 503 (indisponibilidade / alta demanda). */
export function isQuotaOrUnavailableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  return (
    /\b429\b/.test(message) ||
    /\b503\b/.test(message) ||
    lower.includes("too many requests") ||
    lower.includes("exceeded your current quota") ||
    lower.includes("resource_exhausted") ||
    lower.includes("resource exhausted") ||
    lower.includes("quota exceeded") ||
    lower.includes("rate limit") ||
    lower.includes("high demand") ||
    lower.includes("service unavailable")
  );
}

/** Remove cercas ```json e extrai o primeiro objeto/array JSON do texto. */
export function parseJsonFromText(text: string): unknown {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const startObj = cleaned.indexOf("{");
    const endObj = cleaned.lastIndexOf("}");
    if (startObj >= 0 && endObj > startObj) {
      return JSON.parse(cleaned.slice(startObj, endObj + 1));
    }
    const startArr = cleaned.indexOf("[");
    const endArr = cleaned.lastIndexOf("]");
    if (startArr >= 0 && endArr > startArr) {
      return JSON.parse(cleaned.slice(startArr, endArr + 1));
    }
    throw new Error("Resposta do Gemini não contém JSON válido.");
  }
}

/**
 * Loop de fallback Gemini: tenta cada modelo permitido até obter JSON parseável.
 * Em falha total (429, 503 ou qualquer outro erro), retorna JSON seguro —
 * nunca propaga exceção para quebrar a UI.
 */
export async function generateJsonWithFallback(
  genAI: GoogleGenerativeAI,
  prompt: string
): Promise<Record<string, unknown>> {
  let lastError: unknown;
  let sawQuotaOrUnavailable = false;

  for (const modeloNome of modelosFallback) {
    try {
      console.log(`Tentando o modelo: ${modeloNome}`);
      const model = genAI.getGenerativeModel({ model: modeloNome });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const parsed = parseJsonFromText(text);

      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("JSON raiz inválido (esperado objeto).");
      }

      console.log(`Modelo Gemini OK: ${modeloNome}`);
      return parsed as Record<string, unknown>;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      lastError = error;

      if (isQuotaOrUnavailableError(error)) {
        sawQuotaOrUnavailable = true;
        const is429 =
          /\b429\b/.test(message) ||
          /too many requests/i.test(message) ||
          /quota/i.test(message);
        console.warn(
          is429
            ? `Cota/rate limit (429) no modelo ${modeloNome}:`
            : `Modelo indisponível (503/alta demanda) ${modeloNome}:`,
          message
        );
      } else {
        console.warn(`Falha no modelo ${modeloNome}:`, message);
      }
    }
  }

  const reason = sawQuotaOrUnavailable
    ? "quota_or_unavailable"
    : "all_models_failed";

  console.warn(
    "Todos os modelos Gemini falharam. Retornando JSON seguro de degradação.",
    lastError instanceof Error ? lastError.message : lastError
  );

  return getSafeGeminiFallbackJson(reason);
}

export function buildPrompt(system: string, user: string): string {
  return `${system}

${JSON_ONLY_INSTRUCTION}

${user}`;
}
