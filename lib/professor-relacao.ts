/**
 * Helpers para vínculo relacional turma ↔ professor via `professor_id`.
 * O nome do docente nunca deve ser usado como chave de busca/vínculo.
 */

/** Select padrão: todas as colunas da turma + nome/titulação via FK. */
export const SELECT_TURMA_COM_PROFESSOR =
  "*, professores!professor_id(id, nome, titulacao)";

export const SELECT_TURMA_MAPA_COM_PROFESSOR =
  "id, curso, sala, andar, dias_aula, turno, professor_id, professores!professor_id(nome)";

/** Extrai o objeto aninhado `professores` de um select com join do Supabase. */
export function professorDoJoin(
  row: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!row) return null;
  const nested = row.professores;
  if (!nested) return null;
  if (Array.isArray(nested)) {
    const first = nested[0];
    return first && typeof first === "object"
      ? (first as Record<string, unknown>)
      : null;
  }
  if (typeof nested === "object") {
    return nested as Record<string, unknown>;
  }
  return null;
}

/** Nome de exibição a partir do join (com fallback legado ao texto denormalizado). */
export function nomeProfessorDoJoin(
  row: Record<string, unknown> | null | undefined
): string {
  const prof = professorDoJoin(row);
  const doJoin = prof?.nome != null ? String(prof.nome).trim() : "";
  if (doJoin) return doJoin;
  const legado = row?.professor != null ? String(row.professor).trim() : "";
  return legado;
}

export function professorIdDoRow(
  row: Record<string, unknown> | null | undefined
): string | null {
  if (!row) return null;
  if (row.professor_id != null && String(row.professor_id).trim()) {
    return String(row.professor_id).trim();
  }
  const prof = professorDoJoin(row);
  if (prof?.id != null && String(prof.id).trim()) {
    return String(prof.id).trim();
  }
  return null;
}
