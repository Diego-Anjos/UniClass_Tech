import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
      .select("*")
      .eq("ra", ra)
      .single();

    if (error || !aluno) {
      return NextResponse.json(
        { error: "RA não encontrado no sistema." },
        { status: 404 }
      );
    }

    const response = NextResponse.json({
      aluno: {
        ra: String(aluno.ra ?? ra),
        nome: String(aluno.nome ?? "Estudante"),
        curso: String(aluno.curso ?? ""),
        semestreAtual:
          aluno.semestre_atual ?? aluno.semestre ?? aluno.SemestreAtual ?? "",
      },
    });

    response.cookies.set("uniclass_role", "aluno", {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: true,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Não foi possível autenticar. Tente novamente." },
      { status: 500 }
    );
  }
}
