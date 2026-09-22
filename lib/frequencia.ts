/**
 * Taxa de presença (%): começa em 100% e cai com as faltas.
 * Frequência = ((aulas - faltas) / aulas) * 100
 * Sem aulas registradas ou sem faltas → exatamente 100%.
 */
export function calcularTaxaPresenca(
  totalAulasRegistradas: number,
  totalFaltas: number
): number {
  const aulas = Math.max(0, Math.floor(totalAulasRegistradas));
  const faltas = Math.max(0, Math.floor(totalFaltas));

  if (aulas <= 0 || faltas <= 0) return 100;

  const faltasLimitadas = Math.min(faltas, aulas);
  return Math.round(((aulas - faltasLimitadas) / aulas) * 100);
}

/** Limite mínimo de frequência aceitável a partir da régua de faltas do docente. */
export function limiteFrequenciaMinima(reguaEvasaoPct: number): number {
  const regua = Number.isFinite(reguaEvasaoPct) ? reguaEvasaoPct : 25;
  return Math.max(50, Math.min(95, 100 - regua));
}

export function frequenciaEstaRegular(
  taxaPresenca: number,
  reguaEvasaoPct: number
): boolean {
  return taxaPresenca >= limiteFrequenciaMinima(reguaEvasaoPct);
}

/** Classes Tailwind para a coluna de frequência na Chamada Rápida. */
export function classeCorFrequencia(
  taxaPresenca: number,
  reguaEvasaoPct: number
): string {
  const limiar = limiteFrequenciaMinima(reguaEvasaoPct);
  if (taxaPresenca >= limiar) return "text-emerald-400";
  // Logo abaixo do limiar: âmbar; bem abaixo: rose
  if (taxaPresenca >= limiar - 10) return "text-amber-400";
  return "text-rose-400";
}

/** Hex para templates de e-mail (mesma lógica visual das classes). */
export function corHexFrequencia(
  taxaPresenca: number,
  reguaEvasaoPct: number
): string {
  const limiar = limiteFrequenciaMinima(reguaEvasaoPct);
  if (taxaPresenca >= limiar) return "#34d399"; // emerald-400
  if (taxaPresenca >= limiar - 10) return "#fbbf24"; // amber-400
  return "#fb7185"; // rose-400
}

export function mensagemStatusFrequencia(
  taxaPresenca: number,
  reguaEvasaoPct: number
): { html: string; texto: string } {
  const limiar = limiteFrequenciaMinima(reguaEvasaoPct);

  if (taxaPresenca >= limiar) {
    return {
      html: `✅ Sua frequência está regular (${taxaPresenca}%). Continue participando das aulas!`,
      texto: `Sua frequência está regular (${taxaPresenca}%). Continue participando das aulas!`,
    };
  }

  return {
    html: `⚠️ <strong>Alerta:</strong> Sua frequência atingiu ${taxaPresenca}%, abaixo do limite de tolerância estabelecido pelo docente (${limiar}%).`,
    texto: `Alerta: Sua frequência atingiu ${taxaPresenca}%, abaixo do limite de tolerância estabelecido pelo docente (${limiar}%).`,
  };
}

export type ResumoFrequenciaAluno = {
  totalAulas: number;
  faltas: number;
  taxaPresenca: number;
};

export function resumirFrequenciaDeHistorico(
  historico: { aluno_ra: string; status: string; data_aula: string }[],
  alunoRa: string
): ResumoFrequenciaAluno {
  const totalAulas = new Set(
    historico.map((c) => c.data_aula).filter(Boolean)
  ).size;
  const faltas = historico.filter(
    (c) =>
      c.aluno_ra === alunoRa && c.status.toLowerCase() === "falta"
  ).length;

  return {
    totalAulas,
    faltas,
    taxaPresenca: calcularTaxaPresenca(totalAulas, faltas),
  };
}
