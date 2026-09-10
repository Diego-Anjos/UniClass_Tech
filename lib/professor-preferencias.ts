import type { ProfessorSession } from "@/lib/professor-session";

export type TomIa = "direto" | "pedagogico" | "motivacional";

export type DiaAtendimento =
  | "Segunda"
  | "Terça"
  | "Quarta"
  | "Quinta"
  | "Sexta";

export const DIAS_ATENDIMENTO_OPCOES: {
  valor: DiaAtendimento;
  label: string;
}[] = [
  { valor: "Segunda", label: "Seg" },
  { valor: "Terça", label: "Ter" },
  { valor: "Quarta", label: "Qua" },
  { valor: "Quinta", label: "Qui" },
  { valor: "Sexta", label: "Sex" },
];

export type PreferenciasProfessor = {
  tom_ia: TomIa;
  regua_evasao: number;
  travar_edicao_notas: boolean;
  dias_atendimento: DiaAtendimento[];
  atendimento_de: string;
  atendimento_ate: string;
  notificar_mensagens: boolean;
  notificar_alertas: boolean;
};

export const PREFERENCIAS_PADRAO: PreferenciasProfessor = {
  tom_ia: "direto",
  regua_evasao: 25,
  travar_edicao_notas: false,
  dias_atendimento: ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"],
  atendimento_de: "08:00",
  atendimento_ate: "18:00",
  notificar_mensagens: true,
  notificar_alertas: true,
};

export function normalizarPreferencias(
  raw: unknown
): PreferenciasProfessor {
  const base =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const tom = base.tom_ia;
  const tomIa: TomIa =
    tom === "direto" || tom === "pedagogico" || tom === "motivacional"
      ? tom
      : PREFERENCIAS_PADRAO.tom_ia;

  const num = (value: unknown, fallback: number) => {
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : fallback;
  };

  const bool = (value: unknown, fallback: boolean) =>
    typeof value === "boolean" ? value : fallback;

  const str = (value: unknown, fallback: string) =>
    typeof value === "string" && value.trim() ? value : fallback;

  const diasValidos = new Set(
    DIAS_ATENDIMENTO_OPCOES.map((d) => d.valor)
  );
  const diasRaw = base.dias_atendimento;
  const dias_atendimento: DiaAtendimento[] = Array.isArray(diasRaw)
    ? diasRaw.filter(
        (d): d is DiaAtendimento =>
          typeof d === "string" && diasValidos.has(d as DiaAtendimento)
      )
    : [...PREFERENCIAS_PADRAO.dias_atendimento];

  return {
    tom_ia: tomIa,
    regua_evasao: Math.min(
      50,
      Math.max(5, num(base.regua_evasao, PREFERENCIAS_PADRAO.regua_evasao))
    ),
    travar_edicao_notas: bool(
      base.travar_edicao_notas,
      PREFERENCIAS_PADRAO.travar_edicao_notas
    ),
    dias_atendimento:
      dias_atendimento.length > 0
        ? dias_atendimento
        : [...PREFERENCIAS_PADRAO.dias_atendimento],
    atendimento_de: str(
      base.atendimento_de,
      PREFERENCIAS_PADRAO.atendimento_de
    ),
    atendimento_ate: str(
      base.atendimento_ate,
      PREFERENCIAS_PADRAO.atendimento_ate
    ),
    notificar_mensagens: bool(
      base.notificar_mensagens,
      PREFERENCIAS_PADRAO.notificar_mensagens
    ),
    notificar_alertas: bool(
      base.notificar_alertas,
      PREFERENCIAS_PADRAO.notificar_alertas
    ),
  };
}

export function atualizarSessaoProfessorLocal(
  session: ProfessorSession,
  patch: Partial<Pick<ProfessorSession, "nome" | "titulacao" | "area_atuacao">>
): ProfessorSession {
  const nome = patch.nome?.trim() || session.nome;
  const titulacao = patch.titulacao?.trim() || session.titulacao;
  const area_atuacao = patch.area_atuacao?.trim() || session.area_atuacao;
  const atualizada: ProfessorSession = {
    ...session,
    nome,
    titulacao,
    area_atuacao,
    nomeCompletoTitulo: `${titulacao} ${nome}`.trim(),
  };
  localStorage.setItem("uniclass_prof_session", JSON.stringify(atualizada));
  return atualizada;
}
