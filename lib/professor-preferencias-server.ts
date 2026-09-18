import { createClient } from "@supabase/supabase-js";
import {
  PREFERENCIAS_PADRAO,
  normalizarPreferencias,
  type PreferenciasProfessor,
} from "@/lib/professor-preferencias";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * Lê preferências do professor (coluna JSONB `preferencias`).
 * Em falha ou sem id, devolve os defaults — nunca quebra a rota de IA.
 */
export async function buscarPreferenciasProfessor(
  professorId?: string | null
): Promise<PreferenciasProfessor> {
  const id = typeof professorId === "string" ? professorId.trim() : "";
  if (!id) return PREFERENCIAS_PADRAO;

  try {
    const supabase = adminClient();
    if (!supabase) return PREFERENCIAS_PADRAO;

    const { data, error } = await supabase
      .from("professores")
      .select("preferencias")
      .eq("id", id)
      .maybeSingle();

    if (error || !data?.preferencias) return PREFERENCIAS_PADRAO;
    return normalizarPreferencias(data.preferencias);
  } catch {
    return PREFERENCIAS_PADRAO;
  }
}
