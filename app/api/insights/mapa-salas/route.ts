import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import {
  buildPrompt,
  createGenAI,
  generateJsonWithFallback,
} from "@/lib/gemini-fallback";

const genAI = createGenAI();

const FALLBACK_DICA =
  "Não foi possível gerar a análise da IA no momento. Consulte os laboratórios com status 'Livre' para estudo durante seus horários vagos.";

export async function POST(req: NextRequest) {
  const denied = requireRole(req, ["aluno", "professor", "admin"]);
  if (denied) return denied;

  try {
    const {
      andar,
      salaProxima,
      nomeUsuario,
      role,
      curso,
      disciplina,
      turno,
      professorNome,
    } = await req.json();

    const papel = String(role ?? "aluno").toLowerCase();
    const publico =
      papel === "professor" || papel === "adm" || papel === "admin"
        ? papel === "professor"
          ? "professor"
          : "admin"
        : "aluno";

    const nome =
      String(nomeUsuario ?? "").trim() ||
      (publico === "professor" ? "Professor(a)" : "Estudante");
    const sala = String(salaProxima ?? "nenhuma definida").trim();
    const andarLabel = String(andar ?? "andar não informado").trim();

    const tarefa =
      publico === "professor"
        ? `Oriente o(a) professor(a) ${nome} em uma única frase prática sobre deslocamento, uso de laboratório livre ou logística entre aulas — citando o ambiente "${sala}" no ${andarLabel} quando fizer sentido.`
        : publico === "admin"
          ? `Oriente a gestão em uma única frase prática sobre ocupação e realocação no ${andarLabel}, mencionando "${sala}" se útil.`
          : `Oriente o(a) estudante ${nome} em uma única frase prática sobre como aproveitar um laboratório livre para estudar antes/depois da aula em "${sala}" (${andarLabel}).`;

    const prompt = buildPrompt(
      `Tarefa: dica contextual do Mapa de Salas.
Uma frase só, completa (começo, meio e fim), sem markdown.
Retorne: { "dica": "sua frase aqui", "insight": "mesma frase aqui" }`,
      tarefa,
      {
        publico,
        professorNome:
          String(professorNome ?? (publico === "professor" ? nome : "")).trim() ||
          undefined,
        alunoNome: publico === "aluno" ? nome : undefined,
        disciplina: String(disciplina ?? "").trim() || undefined,
        curso: String(curso ?? "").trim() || undefined,
        turno: String(turno ?? "").trim() || undefined,
        dadosEspecificos: `Andar visualizado: ${andarLabel}. Próximo ambiente/sala: ${sala}. Papel: ${publico}.`,
      }
    );

    const data = await generateJsonWithFallback(genAI, prompt);
    const dica =
      (typeof data.dica === "string" && data.dica.trim()) ||
      (typeof data.insight === "string" && data.insight.trim()) ||
      FALLBACK_DICA;

    return NextResponse.json({ dica, insight: dica });
  } catch (error) {
    console.error("Erro crítico na API do mapa de salas:", error);
    return NextResponse.json(
      { dica: FALLBACK_DICA, insight: FALLBACK_DICA },
      { status: 200 }
    );
  }
}
