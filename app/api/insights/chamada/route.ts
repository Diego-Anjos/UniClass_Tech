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

const FALLBACK_CHAMADA = {
  tipoAlerta: "ALERTA DE FREQUÊNCIA",
  mensagem:
    "Não foi possível gerar a análise da IA no momento. Tente novamente mais tarde.",
};

function toNonNegInt(value: unknown, fallback = 0): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.round(n);
}

type AlunoDestaque = {
  nome: string;
  percPresenca: number;
  totalAulas: number;
};

function parseAlunosDestaque(raw: unknown): AlunoDestaque[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const nome = String(row.nome ?? "").trim();
      const percPresencaRaw = Number(
        row.percPresenca ?? row.percentualPresenca
      );
      const percFaltasRaw = Number(row.percFaltas ?? row.percentualFaltas);
      const percPresenca = Number.isFinite(percPresencaRaw)
        ? Math.round(percPresencaRaw)
        : Number.isFinite(percFaltasRaw)
          ? Math.round(100 - percFaltasRaw)
          : NaN;
      const totalAulas = Number(row.totalAulas ?? 0);
      if (!nome || !Number.isFinite(percPresenca)) return null;
      return {
        nome,
        percPresenca: Math.max(0, Math.min(100, percPresenca)),
        totalAulas: Number.isFinite(totalAulas)
          ? Math.max(0, Math.round(totalAulas))
          : 0,
      };
    })
    .filter((a): a is AlunoDestaque => a !== null)
    .slice(0, 6);
}

export async function POST(req: NextRequest) {
  const denied = requireRole(req, ["professor", "admin"]);
  if (denied) return denied;

  try {
    const body = await req.json();
    const prefs = await buscarPreferenciasProfessor(body.professorId);

    const turma = String(body.turma ?? "Turma não informada").trim();
    const professorNome = String(
      body.professorNome ?? body.professor ?? ""
    ).trim();
    const disciplina = String(body.disciplina ?? body.curso ?? "").trim();
    const turno = String(body.turno ?? "").trim();
    let total = toNonNegInt(body.total);
    let presentes = toNonNegInt(body.presentes);
    let faltas = toNonNegInt(body.faltas);
    const alunosDestaque = parseAlunosDestaque(body.alunosDestaque);

    // Normaliza inconsistências do cliente: presentes + faltas deve bater com total
    if (total <= 0 && presentes + faltas > 0) {
      total = presentes + faltas;
    }
    if (presentes + faltas !== total && total > 0) {
      if (presentes + faltas > 0) {
        total = presentes + faltas;
      } else {
        presentes = total;
        faltas = 0;
      }
    }

    const taxaPresenca =
      total > 0 ? Math.round((presentes / total) * 100) : 0;
    const taxaFalta = total > 0 ? Math.round((faltas / total) * 100) : 0;
    const limiarEvasao = prefs.regua_evasao;
    const limiarFrequenciaMinima = Math.max(50, Math.min(95, 100 - limiarEvasao));

    const tipoAlerta =
      faltas === 0 && total > 0
        ? "ENGAJAMENTO ALTO"
        : taxaFalta >= limiarEvasao
          ? "ALERTA DE FREQUÊNCIA"
          : taxaPresenca >= 90
            ? "ENGAJAMENTO ALTO"
            : "ALERTA DE FREQUÊNCIA";

    const destaqueTexto =
      alunosDestaque.length > 0
        ? alunosDestaque
            .map((a) =>
              a.totalAulas > 0
                ? `${a.nome} está com ${a.percPresenca}% de presença em ${a.totalAulas} aula(s) registradas`
                : `${a.nome} está com ${a.percPresenca}% de presença`
            )
            .join("; ")
        : `Nenhum aluno abaixo do limiar de ${limiarFrequenciaMinima}% de presença neste recorte.`;

    const prompt = buildPrompt(
      `Tarefa: insight do Diário de Chamada de HOJE.
${blocoPreferenciasIa(prefs)}

REGRAS OBRIGATÓRIAS:
- Use EXATAMENTE os números fornecidos. NÃO invente totais, presenças, faltas ou porcentagens.
- Se faltas > 0, NÃO diga que houve 100% de presença.
- Mencione total de alunos, presentes e faltas (valores literais).
- Frequência do aluno = taxa de PRESENÇA (100% menos faltas proporcionais). Limite mínimo aceitável: ${limiarFrequenciaMinima}% (régua de faltas do docente: ${limiarEvasao}%).
- Se houver alunos em destaque, cite pelo menos um nome e o % de presença real.
- tipoAlerta deve ser exatamente: "${tipoAlerta}"
- Máximo 2 frases, humanas e acionáveis.
- Retorne APENAS JSON: { "tipoAlerta": "${tipoAlerta}", "mensagem": "texto aqui" }`,
      `Chamada de hoje na turma "${turma}": ${total} alunos, ${presentes} presentes, ${faltas} faltas (presença ${taxaPresenca}%, ausência ${taxaFalta}%). Limiar mínimo de frequência do docente: ${limiarFrequenciaMinima}%. Alunos em atenção: ${destaqueTexto}.`,
      {
        publico: "professor",
        professorNome: professorNome || undefined,
        disciplina: disciplina || undefined,
        turno: turno || undefined,
        turmaNome: turma,
        tamanhoTurma: total,
        dadosEspecificos: `Presentes: ${presentes}. Faltas: ${faltas}. ${destaqueTexto}`,
      }
    );

    const data = await generateJsonWithFallback(genAI, prompt);

    const mensagem =
      typeof data.mensagem === "string" && data.mensagem.trim()
        ? data.mensagem.trim()
        : FALLBACK_CHAMADA.mensagem;

    return NextResponse.json({
      tipoAlerta,
      mensagem,
    });
  } catch (error) {
    console.error("Erro crítico na API de chamada:", error);
    return NextResponse.json(FALLBACK_CHAMADA, { status: 200 });
  }
}
