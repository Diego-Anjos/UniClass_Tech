import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function parseTurmas(areaAtuacao: unknown): string[] {
  if (Array.isArray(areaAtuacao)) {
    return areaAtuacao.map((t) => String(t).trim()).filter(Boolean);
  }
  if (typeof areaAtuacao === "string") {
    return areaAtuacao
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const usuario = String(body.usuario ?? "").trim();
    const senha = String(body.senha ?? "");

    if (!usuario || !senha) {
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

    const emailCompleto = `${usuario}@uniclasstech.edu.br`;
    const supabase = createClient(url, key);
    const { data, error } = await supabase
      .from("professores")
      .select("*")
      .eq("email_institucional", emailCompleto)
      .eq("senha", senha)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Credenciais inválidas. Verifique seu e-mail e senha." },
        { status: 401 }
      );
    }

    const pesosPadrao = { atv1: 2, atv2: 1, atv3: 1, atv4: 1, prova: 5 };
    const pesosRaw =
      data.pesos && typeof data.pesos === "object" && !Array.isArray(data.pesos)
        ? (data.pesos as Record<string, unknown>)
        : {};
    const lerPeso = (chave: string, fallback: number) => {
      const n = Number(pesosRaw[chave]);
      return Number.isFinite(n) && n >= 0 ? n : fallback;
    };

    const response = NextResponse.json({
      professor: {
        id: data.id,
        nome: data.nome,
        titulacao: data.titulacao,
        area_atuacao: data.area_atuacao,
        nomeCompletoTitulo: `${data.titulacao} ${data.nome}`,
        turno_aula: data.turno_aula ?? "Noite",
        dias_aula: Array.isArray(data.dias_aula) ? data.dias_aula : [],
        turmas: parseTurmas(data.area_atuacao),
        disciplina: data.disciplina ?? "",
        pesos: {
          atv1: lerPeso("atv1", pesosPadrao.atv1),
          atv2: lerPeso("atv2", pesosPadrao.atv2),
          atv3: lerPeso("atv3", pesosPadrao.atv3),
          atv4: lerPeso("atv4", pesosPadrao.atv4),
          prova: lerPeso("prova", pesosPadrao.prova),
        },
      },
    });

    response.cookies.set("uniclass_role", "professor", {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: true,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Credenciais inválidas. Verifique seu e-mail e senha." },
      { status: 500 }
    );
  }
}
