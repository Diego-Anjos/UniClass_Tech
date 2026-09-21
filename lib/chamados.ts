/**
 * Roteamento de chamados: admin (secretaria) vs professor.
 * Coluna canônica de escopo: `destinatario_tipo` (legado: Secretaria/Professor).
 * Coluna de vínculo: `professor_id` → professores(id).
 */

export const DESTINATARIO_ADMIN = "admin" as const;
export const DESTINATARIO_PROFESSOR = "professor" as const;

export type DestinatarioChamadoTipo =
  | typeof DESTINATARIO_ADMIN
  | typeof DESTINATARIO_PROFESSOR;

/** Valores legados ainda presentes no banco. */
const TIPOS_ADMIN = new Set(["admin", "secretaria", "suporte"]);
const TIPOS_PROFESSOR = new Set(["professor"]);

export function normalizarTipoDestinatario(
  raw: unknown
): DestinatarioChamadoTipo | null {
  const v = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!v) return null;
  if (TIPOS_ADMIN.has(v)) return DESTINATARIO_ADMIN;
  if (TIPOS_PROFESSOR.has(v)) return DESTINATARIO_PROFESSOR;
  return null;
}

export function ehChamadoAdmin(row: {
  destinatario_tipo?: unknown;
  tipo_destinatario?: unknown;
  professor_id?: unknown;
}): boolean {
  const tipo =
    normalizarTipoDestinatario(row.tipo_destinatario) ??
    normalizarTipoDestinatario(row.destinatario_tipo);

  if (tipo === DESTINATARIO_PROFESSOR) return false;
  if (tipo === DESTINATARIO_ADMIN) return true;

  // Sem tipo explícito: trata como admin se não houver professor_id
  const pid = String(row.professor_id ?? "").trim();
  return !pid;
}

export function ehChamadoDoProfessor(
  row: {
    destinatario_tipo?: unknown;
    tipo_destinatario?: unknown;
    professor_id?: unknown;
    destinatario_nome?: unknown;
  },
  professorId: string,
  nomeProfessor?: string | null
): boolean {
  const pid = String(row.professor_id ?? "").trim();
  if (pid && professorId && pid === String(professorId)) return true;

  const tipo =
    normalizarTipoDestinatario(row.tipo_destinatario) ??
    normalizarTipoDestinatario(row.destinatario_tipo);

  if (tipo === DESTINATARIO_ADMIN) return false;
  if (tipo !== DESTINATARIO_PROFESSOR && !pid) return false;

  // Legado: match por nome quando professor_id ainda não existia
  if (!pid && nomeProfessor) {
    const nomeTicket = String(row.destinatario_nome ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const nomeSessao = nomeProfessor
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return Boolean(nomeTicket && nomeSessao && nomeTicket.includes(nomeSessao));
  }

  return false;
}

export type PayloadChamadoAdmin = {
  ra_aluno: string;
  nome_aluno: string;
  assunto: string;
  mensagem: string;
  destinatario_tipo: typeof DESTINATARIO_ADMIN;
  destinatario_nome: string;
  professor_id: null;
};

export type PayloadChamadoProfessor = {
  ra_aluno: string;
  nome_aluno: string;
  assunto: string;
  mensagem: string;
  destinatario_tipo: typeof DESTINATARIO_PROFESSOR;
  destinatario_nome: string;
  professor_id: string;
};
