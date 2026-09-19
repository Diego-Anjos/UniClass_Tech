import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { applySessionCookies } from "@/lib/api-auth";

/** Senha mestra de demonstração (README) quando o hash/senha do banco não bate. */
const SENHA_MESTRA_PROFESSOR = "Uniclass@2026";

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

/** Normaliza "roberto.lima" ou e-mail completo → e-mail institucional. */
function emailInstitucional(usuarioRaw: string): string {
  const entrada = usuarioRaw.trim().toLowerCase();
  if (!entrada) return "";
  if (entrada.includes("@")) return entrada;
  return `${entrada}@uniclasstech.edu.br`;
}

function senhaProfessorValida(
  senhaInformada: string,
  senhaBanco: string | null | undefined
): boolean {
  const senhaMestra =
    process.env.PROFESSOR_DEFAULT_PASSWORD?.trim() || SENHA_MESTRA_PROFESSOR;
  const armazenada =
    typeof senhaBanco === "string" ? senhaBanco.trim() : "";

  // Coluna ausente/nula/vazia → aceita senha mestra de testes
  if (!armazenada) {
    return senhaInformada === senhaMestra;
  }

  // Match em texto puro (demo sem bcrypt)
  if (senhaInformada === armazenada) {
    return true;
  }

  // Hash ou senha diferente no banco: ainda aceita a senha mestra de demonstração
  return senhaInformada === senhaMestra;
}

type ProfessorRow = {
  id: string | number;
  nome: string;
  titulacao: string;
  area_atuacao: string;
  foto_url?: string | null;
  turno_aula?: string | null;
  dias_aula?: unknown;
  disciplina?: string | null;
  pesos?: unknown;
  senha?: string | null;
};

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

    const emailCompleto = emailInstitucional(usuario);
    const supabase = createClient(url, key);

    // Sem coluna `turmas` no schema atual — códigos vêm de area_atuacao.
    // Senha validada em memória (permite senha mestra de demo).
    const { data, error } = await supabase
      .from("professores")
      .select(
        "id, nome, titulacao, area_atuacao, foto_url, turno_aula, dias_aula, disciplina, pesos, senha"
      )
      .eq("email_institucional", emailCompleto)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(
        { error: "Credenciais inválidas. Verifique seu e-mail e senha." },
        { status: 401 }
      );
    }

    const professor = data as ProfessorRow;

    if (!senhaProfessorValida(senha, professor.senha)) {
      return NextResponse.json(
        { error: "Credenciais inválidas. Verifique seu e-mail e senha." },
        { status: 401 }
      );
    }

    const pesosPadrao = { atv1: 2, atv2: 1, atv3: 1, atv4: 1, prova: 5 };
    const pesosRaw =
      professor.pesos &&
      typeof professor.pesos === "object" &&
      !Array.isArray(professor.pesos)
        ? (professor.pesos as Record<string, unknown>)
        : {};
    const lerPeso = (chave: string, fallback: number) => {
      const n = Number(pesosRaw[chave]);
      return Number.isFinite(n) && n >= 0 ? n : fallback;
    };

    const turmas = parseTurmas(professor.area_atuacao).filter(
      (t) => /[A-Za-z].*-.*\d|\d.*-.*[A-Za-z]/.test(t)
    );

    const professorId = String(professor.id);
    const response = NextResponse.json({
      professor: {
        id: professorId,
        nome: professor.nome,
        titulacao: professor.titulacao,
        area_atuacao: professor.area_atuacao,
        nomeCompletoTitulo: `${professor.titulacao} ${professor.nome}`,
        foto_url:
          typeof professor.foto_url === "string" && professor.foto_url.trim()
            ? professor.foto_url.trim()
            : null,
        turno_aula: professor.turno_aula ?? "Noite",
        dias_aula: Array.isArray(professor.dias_aula)
          ? professor.dias_aula
          : [],
        turmas,
        disciplina: professor.disciplina ?? "",
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
