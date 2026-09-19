import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { applySessionCookies } from "@/lib/api-auth";

function parseTurmas(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return [
      ...new Set(
        raw
          .map(String)
          .map((t) => t.trim())
          .filter((t) => Boolean(t) && t !== "—")
      ),
    ];
  }
  if (typeof raw !== "string") return [];
  const texto = raw.trim();
  if (!texto || texto === "—") return [];
  try {
    const parsed = JSON.parse(texto);
    if (Array.isArray(parsed)) return parseTurmas(parsed);
  } catch {
    // CSV / texto simples
  }
  return [
    ...new Set(
      texto
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    ),
  ];
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
      .select(
        "id, nome, titulacao, area_atuacao, foto_url, turno_aula, dias_aula, turmas, disciplina, pesos"
      )
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

    const professorId = String(data.id);
    const response = NextResponse.json({
      professor: {
        id: professorId,
        nome: data.nome,
        titulacao: data.titulacao,
        area_atuacao: data.area_atuacao,
        nomeCompletoTitulo: `${data.titulacao} ${data.nome}`,
        foto_url:
          typeof data.foto_url === "string" && data.foto_url.trim()
            ? data.foto_url.trim()
            : null,
        turno_aula: data.turno_aula ?? "Noite",
        dias_aula: Array.isArray(data.dias_aula) ? data.dias_aula : [],
        // Preferir coluna turmas; area_atuacao só entra se parecer código (ex: CDIA-4A-N)
        turmas: (() => {
          const daColuna = parseTurmas(data.turmas);
          if (daColuna.length > 0) return daColuna;
          return parseTurmas(data.area_atuacao).filter(
            (t) => /[A-Za-z].*-.*\d|\d.*-.*[A-Za-z]/.test(t)
          );
        })(),
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

    applySessionCookies(response, "professor", professorId);

    return response;
  } catch {
    return NextResponse.json(
      { error: "Credenciais inválidas. Verifique seu e-mail e senha." },
      { status: 500 }
    );
  }
}
