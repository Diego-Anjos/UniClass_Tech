"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export const ALUNO_SESSION_KEY = "alunoLogado";

export type AlunoSession = {
  ra: string;
  nome: string;
  curso: string;
  semestreAtual: string | number;
};

export function iniciaisDoAluno(nome: string) {
  return (
    nome
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte[0]?.toUpperCase() ?? "")
      .join("") || "—"
  );
}

export function limparSessaoAluno() {
  localStorage.removeItem(ALUNO_SESSION_KEY);
}

export function salvarSessaoAluno(aluno: AlunoSession) {
  localStorage.setItem(ALUNO_SESSION_KEY, JSON.stringify(aluno));
}

export function lerSessaoAluno(): AlunoSession | null {
  const raw = localStorage.getItem(ALUNO_SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AlunoSession;
    if (!parsed?.ra) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Lê a sessão do aluno; redireciona para o login se inválida/ausente. */
export function useAlunoSession() {
  const router = useRouter();
  const [alunoLogado, setAlunoLogado] = useState<AlunoSession | null>(null);
  const [carregandoSessao, setCarregandoSessao] = useState(true);

  useEffect(() => {
    const session = lerSessaoAluno();

    if (!session) {
      limparSessaoAluno();
      setCarregandoSessao(false);
      router.push("/");
      return;
    }

    setAlunoLogado(session);
    setCarregandoSessao(false);
  }, [router]);

  return { alunoLogado, carregandoSessao };
}
