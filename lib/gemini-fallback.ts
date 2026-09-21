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

/** Criatividade analítica sem perder precisão (Insights / Mapa / Diário). */
export const GEMINI_TEMPERATURE = 0.7;

export const JSON_ONLY_INSTRUCTION =
  "RETORNE APENAS UM JSON VÁLIDO E MAIS NADA, SEM MARCADORES MARKDOWN.";

/**
 * System prompt global — injetado via `systemInstruction` em toda chamada Gemini.
 * Persona: Coordenador Pedagógico Sênior da UniClassTech.
 */
export const COORDENADOR_PEDAGOGICO_SYSTEM = `Atue como um Coordenador Pedagógico Sênior da UniClassTech conversando com o professor (ou com o estudante, quando o público indicado for aluno).

DIRETRIZES DE COMPORTAMENTO (OBRIGATÓRIAS):
- NUNCA use saudações robóticas como "Olá", "Olá, professor", "Bom dia", "Aqui está sua análise", "Como modelo de linguagem", "Com certeza!", "Claro!" ou "Espero que isso ajude".
- Vá direto ao ponto. Tom encorajador, analítico e realista — sem floreios vazios nem relatório frio.
- Baseie-se EXCLUSIVAMENTE nos dados fornecidos no contexto e no prompt do usuário, citando nomes e números reais para criar proximidade.
- NUNCA invente notas, faltas, percentuais, turmas, salas, eventos ou conversas que não estejam no material recebido.
- Proibição estrita de jargão técnico de programação/banco nos textos exibidos (ex.: "banco de dados", "null", "array", "indisponível no sistema", "dado não encontrado", "registro ausente").
- Se faltarem notas (N2, N3) ou histórico de faltas, contextualize o momento do semestre de forma natural (ex.: "ainda no início do semestre…") — NUNCA diga que os dados "não existem" ou "estão faltando no sistema".
- Foco pedagógico: retenção, engajamento e desenvolvimento contínuo do estudante (ou da turma, quando o público for docente).
- Linguagem: português do Brasil, natural e conversacional. Evite tom de chatbot genérico e frases engessadas.
- A estrutura JSON de resposta permanece obrigatória; estas regras aplicam-se aos campos de texto (mensagem, insight, reply, analise, dica, etc.).`;

/** @deprecated Use COORDENADOR_PEDAGOGICO_SYSTEM — mantido para compatibilidade. */
export const PEDAGOGICAL_VOICE_RULES = COORDENADOR_PEDAGOGICO_SYSTEM;

/** Contexto oculto enviado em toda análise (professor, turma, disciplina, números). */
export type ContextoPedagogico = {
  publico?: "professor" | "aluno" | "admin";
  professorNome?: string | null;
  disciplina?: string | null;
  turno?: string | null;
  tamanhoTurma?: number | null;
  turmaNome?: string | null;
  alunoNome?: string | null;
  curso?: string | null;
  /** Bloco livre com fatos específicos (ex.: "Bocchi: 25% de faltas em 12 aulas"). */
  dadosEspecificos?: string | null;
};

/** Monta o bloco de contexto pedagógico para o prompt do usuário. */
export function blocoContextoPedagogico(ctx: ContextoPedagogico): string {
  const linhas: string[] = [
    "CONTEXTO PEDAGÓGICO (cite nomes e números reais; não invente fora disso):",
  ];

  if (ctx.publico) {
    const mapa = {
      professor: "docente (coordenador falando com o professor)",
      aluno: "estudante (coordenador falando com o aluno)",
      admin: "gestão acadêmica",
    } as const;
    linhas.push(`- Público da mensagem: ${mapa[ctx.publico]}`);
  }
  if (ctx.professorNome?.trim()) {
    linhas.push(`- Professor(a): ${ctx.professorNome.trim()}`);
  }
  if (ctx.disciplina?.trim()) {
    linhas.push(`- Disciplina/área: ${ctx.disciplina.trim()}`);
  }
  if (ctx.turmaNome?.trim()) {
    linhas.push(`- Turma: ${ctx.turmaNome.trim()}`);
  }
  if (ctx.turno?.trim()) {
    linhas.push(`- Turno: ${ctx.turno.trim()}`);
  }
  if (
    ctx.tamanhoTurma != null &&
    Number.isFinite(Number(ctx.tamanhoTurma))
  ) {
    linhas.push(
      `- Tamanho da turma: ${Math.round(Number(ctx.tamanhoTurma))} aluno(s)`
    );
  }
  if (ctx.alunoNome?.trim()) {
    linhas.push(`- Estudante em foco: ${ctx.alunoNome.trim()}`);
  }
  if (ctx.curso?.trim()) {
    linhas.push(`- Curso: ${ctx.curso.trim()}`);
  }
  if (ctx.dadosEspecificos?.trim()) {
    linhas.push(`- Dados específicos da análise:\n${ctx.dadosEspecificos.trim()}`);
  }

  return linhas.length > 1 ? linhas.join("\n") : "";
}

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

/** Remove cercas ```json / ``` e extrai o primeiro objeto/array JSON do texto. */
export function parseJsonFromText(text: string): unknown {
  // Gemini frequentemente envolve JSON em markdown; limpar antes do parse evita crash.
  const cleaned = String(text ?? "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
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
 * Injeta systemInstruction global (Coordenador Pedagógico) e temperature 0.7.
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
      const model = genAI.getGenerativeModel({
        model: modeloNome,
        systemInstruction: COORDENADOR_PEDAGOGICO_SYSTEM,
        generationConfig: {
          temperature: GEMINI_TEMPERATURE,
        },
      });
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

      // 404 / modelo descontinuado / JSON inválido → tenta o próximo sem travar.
      console.warn(`Falha no modelo ${modeloNome}:`, message);
      continue;
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

/**
 * Monta o prompt da tarefa + contexto pedagógico + instrução JSON.
 * As diretrizes de voz ficam no systemInstruction do modelo (COORDENADOR_PEDAGOGICO_SYSTEM).
 */
export function buildPrompt(
  system: string,
  user: string,
  contexto?: ContextoPedagogico
): string {
  const blocoCtx = contexto ? blocoContextoPedagogico(contexto) : "";
  return [system, blocoCtx, JSON_ONLY_INSTRUCTION, user]
    .filter((parte) => parte && String(parte).trim())
    .join("\n\n");
}
