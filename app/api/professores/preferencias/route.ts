import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  PREFERENCIAS_PADRAO,
  normalizarPreferencias,
  type PreferenciasProfessor,
} from "@/lib/professor-preferencias";
import { requireRole, requireProfessorOwnership } from "@/lib/api-auth";

export const runtime = "nodejs";

const BUCKET = "professor-preferencias";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase admin env ausente");
  }
  return createClient(url, key);
}

async function garantirBucket(supabase: SupabaseClient) {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    throw listError;
  }
  const existe = buckets?.some((b) => b.name === BUCKET);
  if (!existe) {
    const { error } = await supabase.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: 64_000,
    });
    if (error && !error.message.toLowerCase().includes("already")) {
      throw error;
    }
  }
}

function pathDoProfessor(id: string) {
  return `${id}.json`;
}

async function lerDoStorage(
  supabase: SupabaseClient,
  professorId: string
): Promise<PreferenciasProfessor | null> {
  await garantirBucket(supabase);
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(pathDoProfessor(professorId));

  if (error || !data) return null;

  try {
    const texto = await data.text();
    return normalizarPreferencias(JSON.parse(texto));
  } catch {
    return null;
  }
}

async function salvarNoStorage(
  supabase: SupabaseClient,
  professorId: string,
  prefs: PreferenciasProfessor
) {
  await garantirBucket(supabase);
  const blob = new Blob([JSON.stringify(prefs)], {
    type: "application/json",
  });
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(pathDoProfessor(professorId), blob, {
      upsert: true,
      contentType: "application/json",
    });
  if (error) throw error;
}

export async function GET(request: Request) {
  const denied = requireRole(request, ["professor", "admin"]);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const professorId = searchParams.get("professorId")?.trim();
    if (!professorId) {
      return NextResponse.json(
        { error: "professorId obrigatório" },
        { status: 400 }
      );
    }

    const ownershipDenied = requireProfessorOwnership(request, professorId);
    if (ownershipDenied) return ownershipDenied;

    const supabase = adminClient();

    const { data: professor, error: profError } = await supabase
      .from("professores")
      .select("id, nome, titulacao, area_atuacao, foto_url, preferencias")
      .eq("id", professorId)
      .single();

    if (profError) {
      // Coluna foto_url ou preferencias pode ainda não existir
      if (
        !colunaPreferenciasAusente(profError.message) &&
        !colunaFotoUrlAusente(profError.message)
      ) {
        return NextResponse.json(
          { error: profError.message || "Professor não encontrado" },
          { status: 404 }
        );
      }

      const selectSemExtras = colunaFotoUrlAusente(profError.message)
        ? "id, nome, titulacao, area_atuacao, preferencias"
        : "id, nome, titulacao, area_atuacao, foto_url";

      let fallback = await supabase
        .from("professores")
        .select(selectSemExtras)
        .eq("id", professorId)
        .single();

      if (
        fallback.error &&
        (colunaPreferenciasAusente(fallback.error.message) ||
          colunaFotoUrlAusente(fallback.error.message))
      ) {
        fallback = await supabase
          .from("professores")
          .select("id, nome, titulacao, area_atuacao")
          .eq("id", professorId)
          .single();
      }

      if (fallback.error || !fallback.data) {
        return NextResponse.json(
          { error: fallback.error?.message || "Professor não encontrado" },
          { status: 404 }
        );
      }

      const row = fallback.data as {
        nome?: string;
        titulacao?: string;
        area_atuacao?: string;
        foto_url?: string | null;
        preferencias?: unknown;
      };

      const prefsColunaFallback =
        row.preferencias &&
        typeof row.preferencias === "object" &&
        Object.keys(row.preferencias as object).length > 0
          ? normalizarPreferencias(row.preferencias)
          : null;

      const prefsStorage = prefsColunaFallback
        ? null
        : await lerDoStorage(supabase, professorId);

      return NextResponse.json({
        nome: row.nome,
        titulacao: row.titulacao,
        area_atuacao: row.area_atuacao,
        foto_url:
          typeof row.foto_url === "string" && row.foto_url.trim()
            ? row.foto_url.trim()
            : null,
        preferencias: prefsColunaFallback ?? prefsStorage ?? PREFERENCIAS_PADRAO,
        origem: prefsColunaFallback
          ? "coluna"
          : prefsStorage
            ? "storage"
            : "padrao",
      });
    }

    if (!professor) {
      return NextResponse.json(
        { error: "Professor não encontrado" },
        { status: 404 }
      );
    }

    const prefsColuna =
      professor.preferencias &&
      typeof professor.preferencias === "object" &&
      Object.keys(professor.preferencias as object).length > 0
        ? normalizarPreferencias(professor.preferencias)
        : null;

    const prefs =
      prefsColuna ??
      (await lerDoStorage(supabase, professorId)) ??
      PREFERENCIAS_PADRAO;

    return NextResponse.json({
      nome: professor.nome,
      titulacao: professor.titulacao,
      area_atuacao: professor.area_atuacao,
      foto_url:
        typeof professor.foto_url === "string" && professor.foto_url.trim()
          ? professor.foto_url.trim()
          : null,
      preferencias: prefs,
      origem: prefsColuna ? "coluna" : "storage_ou_padrao",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const denied = requireRole(request, ["professor", "admin"]);
  if (denied) return denied;

  try {
    const body = (await request.json()) as {
      professorId?: string;
      nome?: string;
      titulacao?: string;
      area_atuacao?: string;
      foto_url?: string | null;
      preferencias?: unknown;
    };

    const professorId = body.professorId?.trim();
    const nome = body.nome?.trim();
    const titulacao = body.titulacao?.trim();
    const area_atuacao = body.area_atuacao?.trim();
    const fotoUrlInformada = "foto_url" in body;
    const foto_url =
      typeof body.foto_url === "string" && body.foto_url.trim()
        ? body.foto_url.trim()
        : body.foto_url === null
          ? null
          : undefined;

    if (!professorId || !nome || !titulacao || !area_atuacao) {
      return NextResponse.json(
        { error: "professorId, nome, titulacao e area_atuacao são obrigatórios" },
        { status: 400 }
      );
    }

    const ownershipDenied = requireProfessorOwnership(request, professorId);
    if (ownershipDenied) return ownershipDenied;

    const preferencias = normalizarPreferencias(body.preferencias);

    const supabase = adminClient();

    const perfilBase = { nome, titulacao, area_atuacao };
    const perfil =
      fotoUrlInformada && foto_url !== undefined
        ? { ...perfilBase, foto_url }
        : perfilBase;
    const atendimentoCols = {
      dias_atendimento: preferencias.dias_atendimento,
      atendimento_de: preferencias.atendimento_de,
      atendimento_ate: preferencias.atendimento_ate,
    };
    const comPrefs = { ...perfil, preferencias, ...atendimentoCols };

    let { error: updateError } = await supabase
      .from("professores")
      .update(comPrefs)
      .eq("id", professorId);

    // Se foto_url ainda não existe, tenta sem ela
    if (updateError && colunaFotoUrlAusente(updateError.message)) {
      const semFoto = { ...perfilBase, preferencias, ...atendimentoCols };
      ({ error: updateError } = await supabase
        .from("professores")
        .update(semFoto)
        .eq("id", professorId));
    }

    // Se as colunas de atendimento ainda não existem, persiste só preferencias (+ foto se houver)
    if (updateError && colunaAtendimentoAusente(updateError.message)) {
      ({ error: updateError } = await supabase
        .from("professores")
        .update({ ...perfil, preferencias })
        .eq("id", professorId));

      if (updateError && colunaFotoUrlAusente(updateError.message)) {
        ({ error: updateError } = await supabase
          .from("professores")
          .update({ ...perfilBase, preferencias })
          .eq("id", professorId));
      }
    }

    if (updateError && colunaPreferenciasAusente(updateError.message)) {
      const { error: perfilError } = await supabase
        .from("professores")
        .update(perfilBase)
        .eq("id", professorId);

      if (perfilError) {
        return NextResponse.json(
          { error: perfilError.message },
          { status: 500 }
        );
      }

      await salvarNoStorage(supabase, professorId, preferencias);

      return NextResponse.json({
        ok: true,
        origem: "storage",
        preferencias,
        ...perfilBase,
        foto_url: foto_url ?? null,
      });
    }

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Espelha no Storage para resiliência
    try {
      await salvarNoStorage(supabase, professorId, preferencias);
    } catch {
      // coluna já persistiu; storage é opcional
    }

    return NextResponse.json({
      ok: true,
      origem: "coluna",
      preferencias,
      ...perfilBase,
      foto_url: foto_url ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function colunaPreferenciasAusente(message: string) {
  const m = message.toLowerCase();
  return (
    m.includes("preferencias") &&
    (m.includes("column") ||
      m.includes("schema cache") ||
      m.includes("could not find") ||
      m.includes("does not exist"))
  );
}

function colunaAtendimentoAusente(message: string) {
  const m = message.toLowerCase();
  const col =
    m.includes("dias_atendimento") ||
    m.includes("atendimento_de") ||
    m.includes("atendimento_ate");
  return (
    col &&
    (m.includes("column") ||
      m.includes("schema cache") ||
      m.includes("could not find") ||
      m.includes("does not exist"))
  );
}

function colunaFotoUrlAusente(message: string) {
  const m = message.toLowerCase();
  return (
    m.includes("foto_url") &&
    (m.includes("column") ||
      m.includes("schema cache") ||
      m.includes("could not find") ||
      m.includes("does not exist"))
  );
}
