"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export const ALUNO_SESSION_KEY = "alunoLogado";

/** Disparado quando a sessão em localStorage é atualizada (ex.: foto de perfil). */
export const EVENTO_SESSAO_ALUNO = "uniclass-aluno-session-updated";

export type AlunoSession = {
  ra: string;
  nome: string;
  curso: string;
  semestreAtual: string | number;
  /** URL pública da foto no bucket `avatares`. */
  foto_url?: string | null;
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

/** Limpa localStorage e remove o cookie httpOnly de papel. */
export function encerrarSessaoAluno() {
  limparSessaoAluno();
  if (typeof window !== "undefined") {
    void fetch("/api/auth/logout", { method: "POST" });
  }
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

/** Atualiza campos da sessão do aluno e notifica listeners (sidebar, etc.). */
export function atualizarSessaoAlunoLocal(
  session: AlunoSession,
  patch: Partial<Pick<AlunoSession, "nome" | "curso" | "semestreAtual" | "foto_url">>
): AlunoSession {
  const atualizada: AlunoSession = {
    ...session,
    nome: patch.nome?.trim() || session.nome,
    curso: patch.curso?.trim() || session.curso,
    semestreAtual:
      patch.semestreAtual !== undefined
        ? patch.semestreAtual
        : session.semestreAtual,
    foto_url:
      patch.foto_url !== undefined ? patch.foto_url : session.foto_url,
  };

  salvarSessaoAluno(atualizada);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(EVENTO_SESSAO_ALUNO, { detail: atualizada })
    );
  }

  return atualizada;
}

/** Lê a sessão do aluno; redireciona para o login se inválida/ausente. */
export function useAlunoSession() {
  const router = useRouter();
  const [alunoLogado, setAlunoLogado] = useState<AlunoSession | null>(null);
  const [carregandoSessao, setCarregandoSessao] = useState(true);

  useEffect(() => {
    function aplicarSessao(session: AlunoSession | null) {
      if (!session?.ra) {
        encerrarSessaoAluno();
        setAlunoLogado(null);
        setCarregandoSessao(false);
        router.push("/");
        return;
      }
      setAlunoLogado(session);
      setCarregandoSessao(false);
    }

    aplicarSessao(lerSessaoAluno());

    function onSessaoAtualizada(event: Event) {
      const detail = (event as CustomEvent<AlunoSession>).detail;
      if (detail?.ra) {
        setAlunoLogado(detail);
        return;
      }
      aplicarSessao(lerSessaoAluno());
    }

    function onStorage(event: StorageEvent) {
      if (event.key === ALUNO_SESSION_KEY) {
        aplicarSessao(lerSessaoAluno());
      }
    }

    window.addEventListener(EVENTO_SESSAO_ALUNO, onSessaoAtualizada);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVENTO_SESSAO_ALUNO, onSessaoAtualizada);
      window.removeEventListener("storage", onStorage);
    };
  }, [router]);

  return { alunoLogado, carregandoSessao };
}
