import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
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
  const denied = requireRole(req, ["professor", "admin"]);
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

    const alunoObj =
      aluno && typeof aluno === "object"
        ? (aluno as Record<string, unknown>)
        : null;

    const fatosAluno = alunoObj
      ? `\nSituação acadêmica do estudante (não invente valores fora disso):
${JSON.stringify(alunoObj)}
Média atual: ${alunoObj.mediaRecente ?? alunoObj.media ?? "ainda não consolidada neste semestre"}
N1: ${alunoObj.n1 ?? "ainda não lançada"} | N2: ${alunoObj.n2 ?? "ainda não lançada"} | N3: ${alunoObj.n3 ?? "ainda não lançada"}
Percentual de faltas: ${alunoObj.taxaFaltas ?? "ainda sem histórico suficiente"}
Taxa de presença: ${alunoObj.taxaPresenca ?? "ainda sem histórico suficiente"}`
      : "";

    const prompt = buildPrompt(
      `Você é um coordenador de curso experiente e humano, auxiliando o(a) ${professor} no acompanhamento do estudante.
Seu objetivo é responder dúvidas sobre desempenho, frequência e perfil do aluno selecionado.
Aja de forma natural, consultiva e empática, como um colega pedagógico conversando no chat — nunca como um sistema técnico.
${blocoPreferenciasIa(prefs)}
REGRAS ANTI-ALUCINAÇÃO:
1. Use APENAS os dados fornecidos no contexto e na situação acadêmica.
2. Nunca invente notas (N1, N2, N3), médias, faltas ou percentuais.
3. Se faltar informação (ex.: N2/N3 ainda não lançadas), contextualize de forma natural — diga que ainda estamos no decorrer do semestre ou aguardando avaliações, sem mencionar "sistema", "banco" ou "dado ausente".
4. Não cite eventos, provas ou conversas que não estejam no histórico/contexto.
5. Oriente sempre para o desenvolvimento e a melhoria contínua do estudante.

Contexto atual do aluno selecionado no painel do professor:
${contextoAluno || "(sem contexto textual)"}
${fatosAluno}

Responda sempre em português do Brasil de forma clara, humana e sem formatações excessivas.
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
