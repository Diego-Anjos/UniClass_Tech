import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { applySessionCookies } from "@/lib/api-auth";

/** Senha de demonstração do README quando o env não está definido. */
const SENHA_PADRAO_ALUNO = "aluno123";

function senhaAlunoValida(
  senhaInformada: string,
  senhaBanco: string | null | undefined
): boolean {
  const senhaEsperada =
    process.env.ALUNO_DEFAULT_PASSWORD?.trim() || SENHA_PADRAO_ALUNO;
  const armazenada =
    typeof senhaBanco === "string" ? senhaBanco.trim() : "";

  // Banco sem senha / sem hash → aceita a senha padrão de testes
  if (!armazenada) {
    return senhaInformada === senhaEsperada;
  }

  // Comparação em texto puro (ambiente de demo sem hash)
  if (senhaInformada === armazenada) {
    return true;
  }

  // Fallback explícito da senha padrão de testes
  return senhaInformada === senhaEsperada;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const ra = String(body.ra ?? "").trim();
    const senha = String(body.senha ?? "");

    if (!ra || !senha) {
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

    // RA sempre como string (evita divergência número/texto no PostgREST)
    const { data: aluno, error } = await supabase
      .from("alunos")
      .select("ra, nome, curso, semestre_atual, semestre, foto_url")
      .eq("ra", ra)
      .maybeSingle();

    if (error || !aluno) {
      return NextResponse.json(
        { error: "RA não encontrado no sistema." },
        { status: 404 }
      );
    }

    // Tabela alunos não possui coluna senha no schema atual —
    // aceita senha padrão (env ou aluno123) quando o banco não guarda hash.
    if (!senhaAlunoValida(senha, undefined)) {
      return NextResponse.json(
        { error: "Credenciais inválidas." },
        { status: 401 }
      );
    }

    const fotoRaw =
      typeof aluno.foto_url === "string" && aluno.foto_url.trim()
        ? aluno.foto_url.trim()
        : "";

    const raSessao = String(aluno.ra ?? ra).trim();
    const response = NextResponse.json({
      aluno: {
        ra: raSessao,
        nome: String(aluno.nome ?? "Estudante"),
        curso: String(aluno.curso ?? ""),
        semestreAtual: aluno.semestre_atual ?? aluno.semestre ?? "",
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
