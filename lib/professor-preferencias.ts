import {
  EVENTO_SESSAO_PROFESSOR,
  type ProfessorSession,
} from "@/lib/professor-session";

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

export type AtendimentoPreferencias = {
  dias: string[];
  inicio: string;
  fim: string;
};

export type PreferenciasProfessor = {
  tom_ia: TomIa;
  regua_evasao: number;
  travar_edicao_notas: boolean;
  dias_atendimento: DiaAtendimento[];
  atendimento_de: string;
  atendimento_ate: string;
  /** Bloco canônico persistido em `preferencias.atendimento` */
  atendimento: AtendimentoPreferencias;
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
  atendimento: {
    dias: ["Seg", "Ter", "Qua", "Qui", "Sex"],
    inicio: "08:00",
    fim: "18:00",
  },
  notificar_mensagens: true,
  notificar_alertas: true,
};

const TOM_LABEL: Record<TomIa, string> = {
  direto: "direto e executivo (objetivo, acionável, sem rodeios)",
  pedagogico: "pedagógico (orientação formativa, foco em aprendizagem)",
  motivacional: "motivador (encorajador, positivo, sem minimizar riscos)",
};

/** Bloco para injetar no system prompt das rotas Gemini. */
export function blocoPreferenciasIa(
  prefs: PreferenciasProfessor = PREFERENCIAS_PADRAO
): string {
  const tom = TOM_LABEL[prefs.tom_ia] ?? TOM_LABEL.direto;
  return [
    `PREFERÊNCIAS DO DOCENTE (obrigatório respeitar):`,
    `- Responda utilizando um tom ${tom}.`,
    `- Régua de alerta de evasão: sinalize risco quando a taxa de faltas for ≥ ${prefs.regua_evasao}% (equivalente a frequência < ${100 - prefs.regua_evasao}% de presença).`,
    `- Abaixo desse limiar de faltas (acima do mínimo de frequência), trate ausências como acompanhamento preventivo, não como alerta crítico.`,
  ].join("\n");
}

function labelDoDia(dia: string): string {
  const found = DIAS_ATENDIMENTO_OPCOES.find(
    (d) => d.valor === dia || d.label === dia
  );
  return found?.label ?? dia;
}

function valorDoDia(dia: string): DiaAtendimento | null {
  const found = DIAS_ATENDIMENTO_OPCOES.find(
    (d) => d.valor === dia || d.label === dia
  );
  return found?.valor ?? null;
}

function montarBlocoAtendimento(
  dias: DiaAtendimento[],
  inicio: string,
  fim: string
): AtendimentoPreferencias {
  return {
    dias: dias.map((d) => labelDoDia(d)),
    inicio,
    fim,
  };
}

function parseDiasAtendimento(raw: unknown): DiaAtendimento[] {
  if (!Array.isArray(raw)) return [];
  const dias: DiaAtendimento[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const valor = valorDoDia(item.trim());
    if (valor && !dias.includes(valor)) dias.push(valor);
  }
  return dias;
}

export function normalizarPreferencias(
  raw: unknown
): PreferenciasProfessor {
  const base =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const atendimentoRaw =
    base.atendimento &&
    typeof base.atendimento === "object" &&
    !Array.isArray(base.atendimento)
      ? (base.atendimento as Record<string, unknown>)
      : null;

  // Aceita chaves canônicas e aliases do spec (ia_tom / alerta_evasao)
  const tomRaw = base.tom_ia ?? base.ia_tom;
  let tomIa: TomIa = PREFERENCIAS_PADRAO.tom_ia;
  if (tomRaw === "direto" || tomRaw === "pedagogico" || tomRaw === "motivacional") {
    tomIa = tomRaw;
  } else if (tomRaw === "motivador") {
    tomIa = "motivacional";
  }

  const num = (value: unknown, fallback: number) => {
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : fallback;
  };

  const bool = (value: unknown, fallback: boolean) =>
    typeof value === "boolean" ? value : fallback;

  const str = (value: unknown, fallback: string) =>
    typeof value === "string" && value.trim() ? value : fallback;

  const diasFromFlat = parseDiasAtendimento(base.dias_atendimento);
  const diasFromNested = parseDiasAtendimento(atendimentoRaw?.dias);
  const dias_atendimento =
    diasFromFlat.length > 0
      ? diasFromFlat
      : diasFromNested.length > 0
        ? diasFromNested
        : [...PREFERENCIAS_PADRAO.dias_atendimento];

  const atendimento_de = str(
    base.atendimento_de ?? atendimentoRaw?.inicio,
    PREFERENCIAS_PADRAO.atendimento_de
  );
  const atendimento_ate = str(
    base.atendimento_ate ?? atendimentoRaw?.fim,
    PREFERENCIAS_PADRAO.atendimento_ate
  );

  const reguaRaw = base.regua_evasao ?? base.alerta_evasao;

  return {
    tom_ia: tomIa,
    regua_evasao: Math.min(
      50,
      Math.max(5, num(reguaRaw, PREFERENCIAS_PADRAO.regua_evasao))
    ),
    travar_edicao_notas: bool(
      base.travar_edicao_notas ?? base.travar_notas,
      PREFERENCIAS_PADRAO.travar_edicao_notas
    ),
    dias_atendimento,
    atendimento_de,
    atendimento_ate,
    atendimento: montarBlocoAtendimento(
      dias_atendimento,
      atendimento_de,
      atendimento_ate
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

/**
 * Extrai horário de atendimento apenas se houver configuração salva
 * (objeto `atendimento` ou chaves flat explícitas). Sem defaults.
 */
export function extrairAtendimentoSalvo(
  raw: unknown
): AtendimentoPreferencias | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const base = raw as Record<string, unknown>;

  if (
    base.atendimento &&
    typeof base.atendimento === "object" &&
    !Array.isArray(base.atendimento)
  ) {
    const at = base.atendimento as Record<string, unknown>;
    const dias = Array.isArray(at.dias)
      ? at.dias
          .filter((d): d is string => typeof d === "string" && Boolean(d.trim()))
          .map((d) => labelDoDia(d.trim()))
      : [];
    const inicio =
      typeof at.inicio === "string" && at.inicio.trim() ? at.inicio.trim() : "";
    const fim =
      typeof at.fim === "string" && at.fim.trim() ? at.fim.trim() : "";
    if (dias.length > 0 && inicio && fim) {
      return { dias, inicio, fim };
    }
  }

  // Legado: chaves flat gravadas sem o bloco aninhado
  if (
    "dias_atendimento" in base ||
    "atendimento_de" in base ||
    "atendimento_ate" in base
  ) {
    const dias = parseDiasAtendimento(base.dias_atendimento).map(labelDoDia);
    const inicio =
      typeof base.atendimento_de === "string" && base.atendimento_de.trim()
        ? base.atendimento_de.trim()
        : "";
    const fim =
      typeof base.atendimento_ate === "string" && base.atendimento_ate.trim()
        ? base.atendimento_ate.trim()
        : "";
    if (dias.length > 0 && inicio && fim) {
      return { dias, inicio, fim };
    }
  }

  return null;
}

export function formatarAtendimentoBanner(
  atendimento: AtendimentoPreferencias
): string {
  return `Atendimento: ${atendimento.dias.join(", ")} das ${atendimento.inicio} às ${atendimento.fim}`;
}

export function atualizarSessaoProfessorLocal(
  session: ProfessorSession,
  patch: Partial<
    Pick<ProfessorSession, "nome" | "titulacao" | "area_atuacao" | "foto_url">
  >
): ProfessorSession {
  const nome = patch.nome?.trim() || session.nome;
  const titulacao = patch.titulacao?.trim() || session.titulacao;
  const area_atuacao = patch.area_atuacao?.trim() || session.area_atuacao;
  const foto_url =
    patch.foto_url !== undefined ? patch.foto_url : session.foto_url;
  const atualizada: ProfessorSession = {
    ...session,
    nome,
    titulacao,
    area_atuacao,
    foto_url: foto_url || null,
    nomeCompletoTitulo: `${titulacao} ${nome}`.trim(),
  };
  localStorage.setItem("uniclass_prof_session", JSON.stringify(atualizada));
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(EVENTO_SESSAO_PROFESSOR, { detail: atualizada })
    );
  }
  return atualizada;
}

export const EVENTO_PREFS_ATUALIZADAS = "uniclass-prefs-updated";

export function prefsStorageKey(professorId: string) {
  return `uniclass_prof_prefs_${professorId}`;
}

export function lerPreferenciasLocal(
  professorId: string
): PreferenciasProfessor | null {
  try {
    const raw = localStorage.getItem(prefsStorageKey(professorId));
    if (!raw) return null;
    return normalizarPreferencias(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function salvarPreferenciasLocal(
  professorId: string,
  prefs: PreferenciasProfessor
) {
  localStorage.setItem(prefsStorageKey(professorId), JSON.stringify(prefs));
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(EVENTO_PREFS_ATUALIZADAS, { detail: prefs })
    );
  }
}
