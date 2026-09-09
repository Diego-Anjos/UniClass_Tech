"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export type ProfessorSession = {
  id: string;
  nome: string;
  titulacao: string;
  area_atuacao: string;
  nomeCompletoTitulo: string;
};

export function iniciaisDoProfessor(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .join("");
}

export function limparSessaoProfessor() {
  localStorage.removeItem("uniclass_prof_session");
}

/** Lê a sessão do professor; redireciona para o login se inválida/ausente. */
export function useProfessorSession() {
  const router = useRouter();
  const [professorLogado, setProfessorLogado] = useState<ProfessorSession | null>(
    null
  );
  const [carregandoSessao, setCarregandoSessao] = useState(true);

  useEffect(() => {
    const session = localStorage.getItem("uniclass_prof_session");

    if (!session) {
      setCarregandoSessao(false);
      router.push("/professor");
      return;
    }

    try {
      const parsed = JSON.parse(session) as ProfessorSession;
      if (!parsed?.nome && !parsed?.nomeCompletoTitulo) {
        limparSessaoProfessor();
        setCarregandoSessao(false);
        router.push("/professor");
        return;
      }
      setProfessorLogado(parsed);
    } catch {
      limparSessaoProfessor();
      router.push("/professor");
    } finally {
      setCarregandoSessao(false);
    }
  }, [router]);

  return { professorLogado, carregandoSessao };
}
