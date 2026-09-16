import { GoogleGenerativeAI } from "@google/generative-ai";

export const modelosFallback = [
  "gemini-3.5-flash",
  "gemini-3-flash",
  "gemini-2.5-flash",
] as const;

export const JSON_ONLY_INSTRUCTION =
  "RETORNE APENAS UM JSON VÁLIDO E MAIS NADA, SEM MARCADORES MARKDOWN.";

export function createGenAI() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
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
 * Em falha total, relança o último erro para o catch da rota (degradação graciosa).
 */
export async function generateJsonWithFallback(
  genAI: GoogleGenerativeAI,
  prompt: string
): Promise<Record<string, unknown>> {
  let lastError: unknown;

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
      console.warn(`Falha no modelo ${modeloNome}:`, message);
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Todos os modelos Gemini falharam.");
}

export function buildPrompt(system: string, user: string): string {
  return `${system}

${JSON_ONLY_INSTRUCTION}

${user}`;
}
