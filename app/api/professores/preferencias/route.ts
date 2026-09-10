import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  PREFERENCIAS_PADRAO,
  normalizarPreferencias,
  type PreferenciasProfessor,
} from "@/lib/professor-preferencias";

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
  const { data: buckets } = await supabase.storage.listBuckets();
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
  try {
    const { searchParams } = new URL(request.url);
    const professorId = searchParams.get("professorId")?.trim();
    if (!professorId) {
      return NextResponse.json(
        { error: "professorId obrigatório" },
        { status: 400 }
      );
    }

    const supabase = adminClient();

    const { data: professor, error: profError } = await supabase
      .from("professores")
      .select("id, nome, titulacao, area_atuacao, preferencias")
      .eq("id", professorId)
      .single();

    if (profError) {
      if (!colunaPreferenciasAusente(profError.message)) {
        return NextResponse.json(
          { error: profError.message || "Professor não encontrado" },
          { status: 404 }
        );
      }

      const fallback = await supabase
        .from("professores")
        .select("id, nome, titulacao, area_atuacao")
        .eq("id", professorId)
        .single();

      if (fallback.error || !fallback.data) {
        return NextResponse.json(
          { error: fallback.error?.message || "Professor não encontrado" },
          { status: 404 }
        );
      }

      const prefsStorage = await lerDoStorage(supabase, professorId);
      return NextResponse.json({
        nome: fallback.data.nome,
        titulacao: fallback.data.titulacao,
        area_atuacao: fallback.data.area_atuacao,
        preferencias: prefsStorage ?? PREFERENCIAS_PADRAO,
        origem: prefsStorage ? "storage" : "padrao",
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
      preferencias: prefs,
      origem: prefsColuna ? "coluna" : "storage_ou_padrao",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as {
      professorId?: string;
      nome?: string;
      titulacao?: string;
      area_atuacao?: string;
      preferencias?: unknown;
    };

    const professorId = body.professorId?.trim();
    const nome = body.nome?.trim();
    const titulacao = body.titulacao?.trim();
    const area_atuacao = body.area_atuacao?.trim();

    if (!professorId || !nome || !titulacao || !area_atuacao) {
      return NextResponse.json(
        { error: "professorId, nome, titulacao e area_atuacao são obrigatórios" },
        { status: 400 }
      );
    }

    const preferencias = normalizarPreferencias(body.preferencias);

    const supabase = adminClient();

    const perfil = { nome, titulacao, area_atuacao };
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

    // Se as colunas de atendimento ainda não existem, persiste só preferencias
    if (updateError && colunaAtendimentoAusente(updateError.message)) {
      ({ error: updateError } = await supabase
        .from("professores")
        .update({ ...perfil, preferencias })
        .eq("id", professorId));
    }

    if (updateError && colunaPreferenciasAusente(updateError.message)) {
      const { error: perfilError } = await supabase
        .from("professores")
        .update(perfil)
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
        ...perfil,
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
      ...perfil,
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
