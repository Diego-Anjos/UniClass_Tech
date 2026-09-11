"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export type PesosAvaliacao = {
  atv1: number;
  atv2: number;
  atv3: number;
  atv4: number;
  prova: number;
};

export const PESOS_AVALIACAO_PADRAO: PesosAvaliacao = {
  atv1: 2,
  atv2: 1,
  atv3: 1,
  atv4: 1,
  prova: 5,
};

export function normalizarPesosAvaliacao(raw: unknown): PesosAvaliacao {
  const base =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const ler = (chave: keyof PesosAvaliacao, fallback: number) => {
    const n = Number(base[chave]);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  };

  return {
    atv1: ler("atv1", PESOS_AVALIACAO_PADRAO.atv1),
    atv2: ler("atv2", PESOS_AVALIACAO_PADRAO.atv2),
    atv3: ler("atv3", PESOS_AVALIACAO_PADRAO.atv3),
    atv4: ler("atv4", PESOS_AVALIACAO_PADRAO.atv4),
    prova: ler("prova", PESOS_AVALIACAO_PADRAO.prova),
  };
}

export type ProfessorSession = {
  id: string;
  nome: string;
  titulacao: string;
  area_atuacao: string;
  nomeCompletoTitulo: string;
  turno_aula?: string;
  dias_aula?: string[];
  /** Códigos das turmas (array, JSON string ou CSV). */
  turmas?: string[] | string;
  disciplina?: string;
  /** Distribuição de pontos N1 (atividades + prova). */
  pesos?: PesosAvaliacao;
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

/** Lê a sessão do professor no localStorage (sem redirecionar). */
export function lerSessaoProfessor(): ProfessorSession | null {
  if (typeof window === "undefined") return null;
  try {
    const session = localStorage.getItem("uniclass_prof_session");
    if (!session) return null;
    const parsed = JSON.parse(session) as ProfessorSession;
    if (!parsed?.id && !parsed?.nome && !parsed?.nomeCompletoTitulo) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Lê a sessão do professor; redireciona para o login se inválida/ausente. */
export function useProfessorSession() {
  const router = useRouter();
  const [professorLogado, setProfessorLogado] = useState<ProfessorSession | null>(
    null
  );
  const [carregandoSessao, setCarregandoSessao] = useState(true);

  useEffect(() => {
    const parsed = lerSessaoProfessor();

    if (!parsed) {
      limparSessaoProfessor();
      setCarregandoSessao(false);
      router.push("/");
      return;
    }

    if (!parsed.nome && !parsed.nomeCompletoTitulo) {
      limparSessaoProfessor();
      setCarregandoSessao(false);
      router.push("/");
      return;
    }

    setProfessorLogado(parsed);
    setCarregandoSessao(false);
  }, [router]);

  return { professorLogado, carregandoSessao };
}
