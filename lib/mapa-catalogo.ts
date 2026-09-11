export const ANDARES = [
  "Térreo",
  "1º Andar",
  "2º Andar",
  "3º Andar",
  "4º Andar",
] as const;

export type AndarLabel = (typeof ANDARES)[number];

export const SALAS_LABS = [
  "Sala 101",
  "Sala 102",
  "Lab 1",
  "Lab 2",
  "Lab 3",
  "Auditório",
] as const;

export type SalaLabCodigo = (typeof SALAS_LABS)[number];

export const DIAS_SEMANA = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
] as const;

export type TurmaMapa = {
  id?: string | null;
  curso?: string | null;
  professor?: string | null;
  sala?: string | null;
  andar?: string | null;
  dias_aula?: string[] | string | null;
  turno?: string | null;
};

export type AmbienteBase = {
  id: string;
  codigo: string;
  nome: string;
  tipo: "sala" | "lab";
  posicao: "norte" | "sul";
  estacoes: number;
  sistema: string;
  softwares: string[];
  professor?: string;
  disciplina?: string;
  isProximaAula?: boolean;
  isOcupada?: boolean;
  diasLabel?: string;
};

/** Plantas por andar — códigos alinhados ao formulário admin (sala/andar). */
export const catalogo: Record<AndarLabel, AmbienteBase[]> = {
  Térreo: [
    {
      id: "terreo-aud",
      codigo: "Auditório",
      nome: "Auditório Central",
      tipo: "sala",
      posicao: "norte",
      estacoes: 120,
      sistema: "Windows 11 PRO",
      softwares: ["Projetor Multimídia", "Lousa Branca", "Som Integrado"],
    },
    {
      id: "terreo-lab1",
      codigo: "Lab 1",
      nome: "Laboratório de Informática",
      tipo: "lab",
      posicao: "norte",
      estacoes: 25,
      sistema: "Windows 11 PRO",
      softwares: ["VS Code", "Docker", "Android Studio"],
    },
    {
      id: "terreo-s101",
      codigo: "Sala 101",
      nome: "Sala de Aula",
      tipo: "sala",
      posicao: "sul",
      estacoes: 40,
      sistema: "Windows 11 PRO",
      softwares: ["Projetor Multimídia", "Lousa Branca", "Som Integrado"],
    },
    {
      id: "terreo-lab2",
      codigo: "Lab 2",
      nome: "Laboratório Multiuso",
      tipo: "lab",
      posicao: "sul",
      estacoes: 20,
      sistema: "Windows 11 PRO",
      softwares: ["VS Code", "Office 365", "Git"],
    },
  ],
  "1º Andar": [
    {
      id: "a1-s101",
      codigo: "Sala 101",
      nome: "Sala de Aula",
      tipo: "sala",
      posicao: "norte",
      estacoes: 45,
      sistema: "Windows 11 PRO",
      softwares: ["Projetor Multimídia", "Lousa Branca", "Som Integrado"],
    },
    {
      id: "a1-s102",
      codigo: "Sala 102",
      nome: "Sala de Aula",
      tipo: "sala",
      posicao: "norte",
      estacoes: 40,
      sistema: "Windows 11 PRO",
      softwares: ["Projetor Multimídia", "Lousa Branca", "Som Integrado"],
    },
    {
      id: "a1-lab2",
      codigo: "Lab 2",
      nome: "Laboratório de Redes",
      tipo: "lab",
      posicao: "sul",
      estacoes: 20,
      sistema: "Windows 11 PRO",
      softwares: ["Cisco Packet Tracer", "Wireshark", "GNS3"],
    },
    {
      id: "a1-lab3",
      codigo: "Lab 3",
      nome: "Laboratório de Banco de Dados",
      tipo: "lab",
      posicao: "sul",
      estacoes: 30,
      sistema: "Windows 11 PRO",
      softwares: ["SQL Server", "PgAdmin", "Visual Studio"],
    },
  ],
  "2º Andar": [
    {
      id: "a2-s101",
      codigo: "Sala 101",
      nome: "Sala de Aula",
      tipo: "sala",
      posicao: "norte",
      estacoes: 40,
      sistema: "Windows 11 PRO",
      softwares: ["Projetor Multimídia", "Lousa Branca", "Som Integrado"],
    },
    {
      id: "a2-s102",
      codigo: "Sala 102",
      nome: "Sala de Aula",
      tipo: "sala",
      posicao: "norte",
      estacoes: 40,
      sistema: "Windows 11 PRO",
      softwares: ["Projetor Multimídia", "Lousa Branca", "Som Integrado"],
    },
    {
      id: "a2-lab1",
      codigo: "Lab 1",
      nome: "Laboratório de Software",
      tipo: "lab",
      posicao: "sul",
      estacoes: 24,
      sistema: "Windows 11 PRO",
      softwares: ["VS Code", "Docker", "Android Studio"],
    },
    {
      id: "a2-lab3",
      codigo: "Lab 3",
      nome: "Laboratório Avançado",
      tipo: "lab",
      posicao: "sul",
      estacoes: 28,
      sistema: "Windows 11 PRO",
      softwares: ["Visual Studio", "Azure CLI", "Git"],
    },
  ],
  "3º Andar": [
    {
      id: "a3-s102",
      codigo: "Sala 102",
      nome: "Sala de Aula",
      tipo: "sala",
      posicao: "norte",
      estacoes: 35,
      sistema: "Windows 11 PRO",
      softwares: ["Projetor Multimídia", "Lousa Branca", "Som Integrado"],
    },
    {
      id: "a3-lab2",
      codigo: "Lab 2",
      nome: "Laboratório de IA",
      tipo: "lab",
      posicao: "norte",
      estacoes: 24,
      sistema: "Windows 11 PRO",
      softwares: ["Python", "TensorFlow", "Jupyter Lab"],
    },
    {
      id: "a3-aud",
      codigo: "Auditório",
      nome: "Auditório Secundário",
      tipo: "sala",
      posicao: "sul",
      estacoes: 80,
      sistema: "Windows 11 PRO",
      softwares: ["Projetor Multimídia", "Lousa Branca", "Som Integrado"],
    },
    {
      id: "a3-lab3",
      codigo: "Lab 3",
      nome: "Lab Maker",
      tipo: "lab",
      posicao: "sul",
      estacoes: 16,
      sistema: "Windows 11 PRO",
      softwares: ["AutoCAD", "Blender", "Arduino IDE"],
    },
  ],
  "4º Andar": [
    {
      id: "a4-s101",
      codigo: "Sala 101",
      nome: "Sala de Estudos",
      tipo: "sala",
      posicao: "norte",
      estacoes: 30,
      sistema: "Windows 11 PRO",
      softwares: ["Projetor Multimídia", "Lousa Branca", "Som Integrado"],
    },
    {
      id: "a4-s102",
      codigo: "Sala 102",
      nome: "Sala de Aula",
      tipo: "sala",
      posicao: "norte",
      estacoes: 40,
      sistema: "Windows 11 PRO",
      softwares: ["Projetor Multimídia", "Lousa Branca", "Som Integrado"],
    },
    {
      id: "a4-lab1",
      codigo: "Lab 1",
      nome: "Laboratório de Projetos",
      tipo: "lab",
      posicao: "sul",
      estacoes: 22,
      sistema: "Windows 11 PRO",
      softwares: ["VS Code", "Docker", "Git"],
    },
    {
      id: "a4-lab2",
      codigo: "Lab 2",
      nome: "Laboratório de Redes",
      tipo: "lab",
      posicao: "sul",
      estacoes: 18,
      sistema: "Windows 11 PRO",
      softwares: ["SQL Server", "PgAdmin", "Wireshark"],
    },
  ],
};

export function diaHoje(): string {
  return DIAS_SEMANA[new Date().getDay()];
}

export function normalizarTurma(raw: unknown): TurmaMapa | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw[0] ? normalizarTurma(raw[0]) : null;
  if (typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  // Aliases: formulário/mapa usam sala+professor+curso; alguns schemas usam sala_nome/nome/disciplina
  const sala =
    t.sala != null
      ? String(t.sala)
      : t.sala_nome != null
        ? String(t.sala_nome)
        : null;
  const professor =
    t.professor != null
      ? String(t.professor)
      : t.nome != null
        ? String(t.nome)
        : null;
  const curso =
    t.curso != null
      ? String(t.curso)
      : t.disciplina != null
        ? String(t.disciplina)
        : null;
  return {
    id: t.id != null ? String(t.id) : null,
    curso,
    professor,
    sala,
    andar: t.andar != null ? String(t.andar) : null,
    dias_aula: (t.dias_aula as string[] | string | null) ?? null,
    turno: t.turno != null ? String(t.turno) : null,
  };
}

export function normalizarDiasAula(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
}

export function ocorreHoje(turma: TurmaMapa, hoje: string): boolean {
  const dias = normalizarDiasAula(turma.dias_aula);
  if (dias.length === 0) return true;
  return dias.some((d) => {
    const lower = d.toLowerCase();
    return (
      lower === hoje.toLowerCase() ||
      lower.startsWith(hoje.toLowerCase().slice(0, 3)) ||
      hoje.toLowerCase().startsWith(lower.slice(0, 3))
    );
  });
}

export function horarioDoTurno(turno?: string | null): string {
  const t = (turno ?? "").toLowerCase();
  if (t.includes("manhã") || t.includes("manha")) return "08:00";
  if (t.includes("tarde")) return "14:00";
  if (t.includes("noite")) return "19:00";
  return "08:00";
}

export function matchSala(
  codigoAmbiente: string,
  salaAula?: string | null
): boolean {
  if (!salaAula) return false;
  const a = codigoAmbiente.trim().toLowerCase();
  const b = salaAula.trim().toLowerCase();
  return a === b || a.includes(b) || b.includes(a);
}

export function matchAndar(
  label: string,
  andarAula?: string | null
): boolean {
  if (!andarAula) return false;
  return label.trim().toLowerCase() === andarAula.trim().toLowerCase();
}

export function isAndarValido(
  valor: string | null | undefined
): valor is AndarLabel {
  return !!valor && (ANDARES as readonly string[]).includes(valor);
}

/** Códigos de sala/lab do mapa para o andar informado (cascata do formulário ADM). */
export function salasDoAndar(andar: string | null | undefined): string[] {
  if (!isAndarValido(andar)) return [];
  return catalogo[andar].map((ambiente) => ambiente.codigo);
}

export function chaveAlocacao(andar?: string | null, sala?: string | null) {
  return `${String(andar ?? "").trim().toLowerCase()}::${String(sala ?? "")
    .trim()
    .toLowerCase()}`;
}

/** Salas ocupadas hoje: combinações andar+sala com professor vinculado. */
export function salasOcupadasHoje(turmas: TurmaMapa[]): Set<string> {
  const hoje = diaHoje();
  const ocupadas = new Set<string>();
  for (const t of turmas) {
    if (!t.professor?.trim() || !t.sala?.trim()) continue;
    if (!ocorreHoje(t, hoje)) continue;
    ocupadas.add(chaveAlocacao(t.andar, t.sala));
  }
  return ocupadas;
}

export function salaEstaOcupada(
  ocupadas: Set<string>,
  andar: string,
  sala: string
) {
  return ocupadas.has(chaveAlocacao(andar, sala));
}
