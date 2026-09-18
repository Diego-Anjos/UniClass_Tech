import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Esteira de redundância Gemini (ordem = prioridade).
 * RPD é por modelo: Flash modernos ~20 RPD; Lite ~500 RPD (tanque de guerra).
 * gemini-2.5-flash-lite removido: Google deixou de suportá-lo (404).
 */
export const modelosFallback = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
] as const;

/** Alias explícito da lista de redundância (mesmo array). */
export const fallbackModels = modelosFallback;

export const JSON_ONLY_INSTRUCTION =
  "RETORNE APENAS UM JSON VÁLIDO E MAIS NADA, SEM MARCADORES MARKDOWN.";

const QUOTA_MESSAGE =
  "O assistente atingiu o limite de uso gratuito temporário do Google. Por favor, tente novamente em alguns minutos.";

const QUOTA_INSIGHT =
  "Análise pausada devido ao limite de requisições.";

/**
 * JSON seguro compatível com os contratos das rotas /api/insights/*
 * (insight, mensagem, reply, analise, dica, tipoAlerta, etc.).
 */
export function getSafeGeminiFallbackJson(
  reason: string = "gemini_unavailable"
): Record<string, unknown> {
  const isQuota = reason.startsWith("quota");
  const msg = QUOTA_MESSAGE;
  return {
    status: "ok",
    insight: isQuota ? QUOTA_INSIGHT : msg,
    mensagem: msg,
    reply: msg,
    analise: msg,
    resposta: msg,
    dica: msg,
    tipoAlerta: "ALERTA TEMPORÁRIO",
    corAlerta: "amber",
    riscoLabel: "Indisponível",
    metricaLabel: "STATUS",
    metricaValor: "—",
    risco: "Indisponível",
    recomendacao: msg,
    pontos_atencao: "Serviço de IA temporariamente indisponível (cota/limite).",
    turmaDestaque: "Indisponível",
    detalheComparativo: msg,
    _fallback: true,
    _reason: reason,
  };
}

export function createGenAI() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
}

function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const e = error as Record<string, unknown>;
  if (typeof e.status === "number") return e.status;
  if (typeof e.statusCode === "number") return e.statusCode;
  if (typeof e.httpStatusCode === "number") return e.httpStatusCode;
  const nested = e.error;
  if (nested && typeof nested === "object") {
    const n = nested as Record<string, unknown>;
    if (typeof n.code === "number") return n.code;
    if (typeof n.status === "number") return n.status;
  }
  return undefined;
}

/** Cota/rate-limit (429) — RPD isolado por modelo; dispara fallback para o próximo. */
export function isProjectQuotaError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const status = getErrorStatus(error);
  return (
    status === 429 ||
    /\b429\b/.test(message) ||
    /too many requests/i.test(message) ||
    /exceeded your current quota/i.test(message) ||
    /resource_exhausted/i.test(message) ||
    /resource exhausted/i.test(message) ||
    /quota exceeded/i.test(message)
  );
}

/** Detecta 429 (quota/rate limit) e 503 (indisponibilidade / alta demanda). */
export function isQuotaOrUnavailableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  const status = getErrorStatus(error);
  return (
    isProjectQuotaError(error) ||
    status === 503 ||
    /\b503\b/.test(message) ||
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
 * Loop de fallback Gemini: tenta cada modelo até obter JSON parseável.
 * Em 429 (RPD por modelo), AVANÇA para o próximo da esteira — não aborta.
 * Em 503/alta demanda, também tenta o próximo modelo.
 * Em falha total, retorna JSON seguro (nunca propaga exceção para a UI).
 */
export async function generateJsonWithFallback(
  genAI: GoogleGenerativeAI,
  prompt: string
): Promise<Record<string, unknown>> {
  let lastError: unknown;
  let exhaustedQuotaOnAny = false;

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

      // RPD é por modelo: 429 neste modelo → seguir para o próximo da esteira.
      if (isProjectQuotaError(error)) {
        exhaustedQuotaOnAny = true;
        console.warn(
          `Cota/RPD esgotada no modelo ${modeloNome} (429). Avançando na esteira.`,
          message
        );
        continue;
      }

      if (isQuotaOrUnavailableError(error)) {
        console.warn(
          `Modelo indisponível (503/alta demanda) ${modeloNome}. Avançando na esteira.`,
          message
        );
        continue;
      }

      console.warn(`Falha no modelo ${modeloNome}:`, message);
    }
  }

  console.warn(
    "Todos os modelos Gemini falharam. Retornando JSON seguro de degradação.",
    lastError instanceof Error ? lastError.message : lastError
  );

  return getSafeGeminiFallbackJson(
    exhaustedQuotaOnAny ? "quota_429_all_models" : "all_models_failed"
  );
}

export function buildPrompt(system: string, user: string): string {
  return `${system}

${JSON_ONLY_INSTRUCTION}

${user}`;
}
