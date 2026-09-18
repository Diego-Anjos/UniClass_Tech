import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import {
  buildPrompt,
  createGenAI,
  generateJsonWithFallback,
} from "@/lib/gemini-fallback";
import { blocoPreferenciasIa } from "@/lib/professor-preferencias";
import { buscarPreferenciasProfessor } from "@/lib/professor-preferencias-server";

const genAI = createGenAI();

const FALLBACK_REPLY =
  "Não foi possível gerar a análise da IA no momento. Tente novamente mais tarde.";

export async function POST(req: NextRequest) {
  const denied = requireApiAuth(req);
  if (denied) return denied;

  try {
    const {
      messages,
      professor,
      professorId,
      contextoAluno,
      aluno,
    } = await req.json();

    const prefs = await buscarPreferenciasProfessor(professorId);

    const historico = Array.isArray(messages)
      ? messages
          .map(
            (m: { role?: string; content?: string }) =>
              `${m.role === "assistant" ? "Assistente" : "Professor"}: ${m.content ?? ""}`
          )
          .join("\n")
      : "";

    const fatosAluno =
      aluno && typeof aluno === "object"
        ? `\nFatos estruturados (fonte do ERP — não invente valores fora disso):
${JSON.stringify(aluno)}`
        : "";

    const prompt = buildPrompt(
      `Você é um assistente pedagógico de Inteligência Artificial integrado ao ERP UniClassTech, auxiliando o(a) ${professor}.
Seu objetivo é responder dúvidas sobre o desempenho, faltas e perfil do aluno selecionado.
Aja de forma natural, consultiva e direta, como um colega de trabalho humano conversando no chat. Não use roteiros engessados.
${blocoPreferenciasIa(prefs)}
REGRAS: use APENAS os dados fornecidos no contexto; se faltar informação, diga que não há dado no sistema — nunca invente notas, faltas ou percentuais.

Contexto atual do aluno selecionado no painel do professor:
${contextoAluno || "(sem contexto textual)"}
${fatosAluno}

Responda sempre em português do Brasil de forma clara e sem usar formatações excessivas.
Retorne no formato: { "reply": "sua resposta aqui" }`,
      `Histórico da conversa:\n${historico || "(sem mensagens anteriores)"}`
    );

    const data = await generateJsonWithFallback(genAI, prompt);
    const reply =
      (typeof data.reply === "string" && data.reply) || FALLBACK_REPLY;
    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Erro crítico na API de chat:", error);
    return NextResponse.json({ reply: FALLBACK_REPLY }, { status: 200 });
  }
}
