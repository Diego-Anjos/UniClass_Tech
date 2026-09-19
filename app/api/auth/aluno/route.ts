import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { applySessionCookies } from "@/lib/api-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const ra = String(body.ra ?? "").trim();
    const senha = String(body.senha ?? "");

    const senhaEsperada = process.env.ALUNO_DEFAULT_PASSWORD;
    if (!senhaEsperada) {
      return NextResponse.json(
        { error: "Autenticação de aluno não configurada no servidor." },
        { status: 503 }
      );
    }

    if (!ra || senha !== senhaEsperada) {
      return NextResponse.json(
        { error: "Credenciais inválidas." },
        { status: 401 }
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      return NextResponse.json(
        { error: "Supabase não configurado." },
        { status: 503 }
      );
    }

    const supabase = createClient(url, key);
    const { data: aluno, error } = await supabase
      .from("alunos")
      .select(
        "ra, nome, curso, semestre_atual, semestre, foto_url, avatar_url"
      )
      .eq("ra", ra)
      .single();

    if (error || !aluno) {
      return NextResponse.json(
        { error: "RA não encontrado no sistema." },
        { status: 404 }
      );
    }

    const fotoRaw =
      (typeof aluno.foto_url === "string" && aluno.foto_url.trim()) ||
      (typeof aluno.avatar_url === "string" && aluno.avatar_url.trim()) ||
      "";

    const raSessao = String(aluno.ra ?? ra);
    const response = NextResponse.json({
      aluno: {
        ra: raSessao,
        nome: String(aluno.nome ?? "Estudante"),
        curso: String(aluno.curso ?? ""),
        semestreAtual:
          aluno.semestre_atual ?? aluno.semestre ?? "",
        foto_url: fotoRaw || null,
      },
    });

    applySessionCookies(response, "aluno", raSessao);

    return response;
  } catch {
    return NextResponse.json(
      { error: "Não foi possível autenticar. Tente novamente." },
      { status: 500 }
    );
  }
}
