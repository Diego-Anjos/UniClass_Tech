import { supabase } from "@/lib/supabase";

export type TipoAcaoAuditoria = "LANCAMENTO_NOTA" | "REGISTRO_CHAMADA";

export const TIPOS_ACAO_LOGS_RECENTES: TipoAcaoAuditoria[] = [
  "LANCAMENTO_NOTA",
  "REGISTRO_CHAMADA",
];

type RegistrarLogAuditoriaParams = {
  usuario: string;
  acao: string;
  tipo_acao: TipoAcaoAuditoria;
  ip?: string;
};

/**
 * Registra ação sensível na tabela `logs_auditoria`.
 * Falhas são apenas logadas no console para não bloquear o fluxo principal.
 */
export async function registrarLogAuditoria({
  usuario,
  acao,
  tipo_acao,
  ip = "127.0.0.1",
}: RegistrarLogAuditoriaParams): Promise<void> {
  const { error } = await supabase.from("logs_auditoria").insert({
    usuario,
    acao,
    tipo_acao,
    ip,
  });

  if (error) {
    console.error("Erro ao registrar log de auditoria:", error.message);
  }
}
