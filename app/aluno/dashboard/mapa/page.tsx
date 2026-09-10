"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  ClipboardList,
  CalendarCheck,
  BookOpen,
  Map as MapIcon,
  LogOut,
  Camera,
  Sparkles,
  GraduationCap,
  MessageSquare,
  Monitor,
  Laptop,
  Cpu,
  Clock,
  MapPin,
  Coffee,
  Settings,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  limparSessaoAluno,
  useAlunoSession,
} from "@/lib/aluno-session";

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral", href: "/aluno/dashboard", active: false },
  { icon: ClipboardList, label: "Boletim e Notas", href: "/aluno/dashboard/notas", active: false },
  { icon: CalendarCheck, label: "Frequência", href: "/aluno/dashboard/frequencia", active: false },
  { icon: BookOpen, label: "Grade e Matérias", href: "/aluno/dashboard/grade", active: false },
  { icon: MapIcon, label: "Mapa de Salas e Labs", href: "/aluno/dashboard/mapa", active: true },
  { icon: MessageSquare, label: "Contato", href: "/aluno/dashboard/contato", active: false },
];

const andares = [
  "Térreo",
  "1º Andar",
  "2º Andar",
  "3º Andar",
  "4º Andar",
] as const;

type AndarLabel = (typeof andares)[number];

const DIAS_SEMANA = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
] as const;

type TurmaMapa = {
  curso?: string | null;
  professor?: string | null;
  sala?: string | null;
  andar?: string | null;
  dias_aula?: string[] | string | null;
  turno?: string | null;
};

type ProximaAula = {
  turmas: TurmaMapa;
};

type AmbienteBase = {
  id: string;
  codigo: string;
  nome: string;
  tipo: "sala" | "lab";
  posicao: "norte" | "sul";
  statusBase: "livre" | "ocupado";
  estacoes: number;
  sistema: string;
  softwares: string[];
};

type ItinerarioItem = {
  hora: string;
  label: string;
  local: string;
  tipo: "aula" | "intervalo";
};

type AlunoInfo = {
  nome: string;
  ra: string;
};

/** Plantas por andar — códigos alinhados ao formulário admin (sala/andar). */
const catalogo: Record<AndarLabel, AmbienteBase[]> = {
  Térreo: [
    {
      id: "terreo-aud",
      codigo: "Auditório",
      nome: "Auditório Central",
      tipo: "sala",
      posicao: "norte",
      statusBase: "livre",
      estacoes: 120,
      sistema: "—",
      softwares: ["Projetor 4K", "Sistema de som"],
    },
    {
      id: "terreo-lab1",
      codigo: "Lab 1",
      nome: "Laboratório de Informática",
      tipo: "lab",
      posicao: "norte",
      statusBase: "livre",
      estacoes: 25,
      sistema: "Linux Ubuntu",
      softwares: ["Python", "VS Code", "Git"],
    },
    {
      id: "terreo-s101",
      codigo: "Sala 101",
      nome: "Sala de Aula",
      tipo: "sala",
      posicao: "sul",
      statusBase: "ocupado",
      estacoes: 40,
      sistema: "—",
      softwares: [],
    },
    {
      id: "terreo-lab2",
      codigo: "Lab 2",
      nome: "Laboratório Multiuso",
      tipo: "lab",
      posicao: "sul",
      statusBase: "livre",
      estacoes: 20,
      sistema: "Windows 11",
      softwares: ["Office", "VS Code"],
    },
  ],
  "1º Andar": [
    {
      id: "a1-s101",
      codigo: "Sala 101",
      nome: "Sala de Aula",
      tipo: "sala",
      posicao: "norte",
      statusBase: "ocupado",
      estacoes: 45,
      sistema: "—",
      softwares: [],
    },
    {
      id: "a1-s102",
      codigo: "Sala 102",
      nome: "Sala de Aula",
      tipo: "sala",
      posicao: "norte",
      statusBase: "livre",
      estacoes: 40,
      sistema: "—",
      softwares: [],
    },
    {
      id: "a1-lab2",
      codigo: "Lab 2",
      nome: "Laboratório de Redes",
      tipo: "lab",
      posicao: "sul",
      statusBase: "livre",
      estacoes: 20,
      sistema: "Linux",
      softwares: ["Cisco Packet Tracer", "Wireshark"],
    },
    {
      id: "a1-lab3",
      codigo: "Lab 3",
      nome: "Laboratório de Banco de Dados",
      tipo: "lab",
      posicao: "sul",
      statusBase: "ocupado",
      estacoes: 30,
      sistema: "Windows 11",
      softwares: ["SQL Server", "Visual Studio"],
    },
  ],
  "2º Andar": [
    {
      id: "a2-s101",
      codigo: "Sala 101",
      nome: "Sala de Aula",
      tipo: "sala",
      posicao: "norte",
      statusBase: "livre",
      estacoes: 40,
      sistema: "—",
      softwares: [],
    },
    {
      id: "a2-s102",
      codigo: "Sala 102",
      nome: "Sala de Aula",
      tipo: "sala",
      posicao: "norte",
      statusBase: "ocupado",
      estacoes: 40,
      sistema: "—",
      softwares: [],
    },
    {
      id: "a2-lab1",
      codigo: "Lab 1",
      nome: "Laboratório de Software",
      tipo: "lab",
      posicao: "sul",
      statusBase: "livre",
      estacoes: 24,
      sistema: "Linux",
      softwares: ["Python", "Docker"],
    },
    {
      id: "a2-lab3",
      codigo: "Lab 3",
      nome: "Laboratório Avançado",
      tipo: "lab",
      posicao: "sul",
      statusBase: "livre",
      estacoes: 28,
      sistema: "Windows 11",
      softwares: ["Visual Studio", "Azure"],
    },
  ],
  "3º Andar": [
    {
      id: "a3-s102",
      codigo: "Sala 102",
      nome: "Sala de Aula",
      tipo: "sala",
      posicao: "norte",
      statusBase: "livre",
      estacoes: 35,
      sistema: "—",
      softwares: [],
    },
    {
      id: "a3-lab2",
      codigo: "Lab 2",
      nome: "Laboratório de IA",
      tipo: "lab",
      posicao: "norte",
      statusBase: "ocupado",
      estacoes: 24,
      sistema: "Linux",
      softwares: ["Python", "TensorFlow"],
    },
    {
      id: "a3-aud",
      codigo: "Auditório",
      nome: "Auditório Secundário",
      tipo: "sala",
      posicao: "sul",
      statusBase: "livre",
      estacoes: 80,
      sistema: "—",
      softwares: ["Projetor"],
    },
    {
      id: "a3-lab3",
      codigo: "Lab 3",
      nome: "Lab Maker",
      tipo: "lab",
      posicao: "sul",
      statusBase: "livre",
      estacoes: 16,
      sistema: "Windows 11",
      softwares: ["Arduino IDE", "Fusion 360"],
    },
  ],
  "4º Andar": [
    {
      id: "a4-s101",
      codigo: "Sala 101",
      nome: "Sala de Estudos",
      tipo: "sala",
      posicao: "norte",
      statusBase: "livre",
      estacoes: 30,
      sistema: "—",
      softwares: ["Wi-Fi"],
    },
    {
      id: "a4-s102",
      codigo: "Sala 102",
      nome: "Sala de Aula",
      tipo: "sala",
      posicao: "norte",
      statusBase: "ocupado",
      estacoes: 40,
      sistema: "—",
      softwares: [],
    },
    {
      id: "a4-lab1",
      codigo: "Lab 1",
      nome: "Laboratório de Projetos",
      tipo: "lab",
      posicao: "sul",
      statusBase: "livre",
      estacoes: 22,
      sistema: "Linux",
      softwares: ["Git", "VS Code"],
    },
    {
      id: "a4-lab2",
      codigo: "Lab 2",
      nome: "Laboratório de Redes",
      tipo: "lab",
      posicao: "sul",
      statusBase: "livre",
      estacoes: 18,
      sistema: "Linux",
      softwares: ["Wireshark", "GNS3"],
    },
  ],
};

function iniciaisDe(nome: string) {
  return (
    nome
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "—"
  );
}

function diaHoje(): string {
  return DIAS_SEMANA[new Date().getDay()];
}

function normalizarTurma(raw: unknown): TurmaMapa | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw[0] ? normalizarTurma(raw[0]) : null;
  if (typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  return {
    curso: t.curso != null ? String(t.curso) : null,
    professor: t.professor != null ? String(t.professor) : null,
    sala: t.sala != null ? String(t.sala) : null,
    andar: t.andar != null ? String(t.andar) : null,
    dias_aula: (t.dias_aula as string[] | string | null) ?? null,
    turno: t.turno != null ? String(t.turno) : null,
  };
}

function normalizarDiasAula(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return raw.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
}

function ocorreHoje(turma: TurmaMapa, hoje: string): boolean {
  const dias = normalizarDiasAula(turma.dias_aula);
  if (dias.length === 0) return true; // sem calendário → considera disponível hoje (protótipo)
  return dias.some((d) => {
    const lower = d.toLowerCase();
    return (
      lower === hoje.toLowerCase() ||
      lower.startsWith(hoje.toLowerCase().slice(0, 3)) ||
      hoje.toLowerCase().startsWith(lower.slice(0, 3))
    );
  });
}

function horarioDoTurno(turno?: string | null): string {
  const t = (turno ?? "").toLowerCase();
  if (t.includes("manhã") || t.includes("manha")) return "08:00";
  if (t.includes("tarde")) return "14:00";
  if (t.includes("noite")) return "19:00";
  return "08:00";
}

function matchSala(codigoAmbiente: string, salaAula?: string | null): boolean {
  if (!salaAula) return false;
  const a = codigoAmbiente.trim().toLowerCase();
  const b = salaAula.trim().toLowerCase();
  return a === b || a.includes(b) || b.includes(a);
}

function matchAndar(label: string, andarAula?: string | null): boolean {
  if (!andarAula) return false;
  return label.trim().toLowerCase() === andarAula.trim().toLowerCase();
}

function iconForAmbiente(ambiente: AmbienteBase) {
  if (ambiente.tipo === "lab") {
    if (
      ambiente.nome.toLowerCase().includes("ia") ||
      ambiente.nome.toLowerCase().includes("inteligência")
    ) {
      return Cpu;
    }
    return Laptop;
  }
  return Monitor;
}

function isAndarValido(valor: string | null | undefined): valor is AndarLabel {
  return !!valor && (andares as readonly string[]).includes(valor);
}

export default function AlunoMapaPage() {
  const { alunoLogado, carregandoSessao } = useAlunoSession();
  const [aluno, setAluno] = useState<AlunoInfo | null>(null);
  const [andarSelecionado, setAndarSelecionado] = useState<AndarLabel>("Térreo");
  const [ambienteSelecionadoId, setAmbienteSelecionadoId] = useState<string>("");
  const [proximaAula, setProximaAula] = useState<ProximaAula | null>(null);
  const [aulasHoje, setAulasHoje] = useState<ProximaAula[]>([]);
  const [aiInsight, setAiInsight] = useState("");
  const [isLoadingAi, setIsLoadingAi] = useState(true);
  const [carregando, setCarregando] = useState(true);

  const ambientesDoAndar = catalogo[andarSelecionado];
  const salaProxima = proximaAula?.turmas?.sala ?? null;
  const andarProxima = proximaAula?.turmas?.andar ?? null;

  const ambienteAtivo = useMemo(() => {
    const noAndar = ambientesDoAndar.find((a) => a.id === ambienteSelecionadoId);
    if (noAndar) return noAndar;
    return ambientesDoAndar[0] ?? null;
  }, [ambientesDoAndar, ambienteSelecionadoId]);

  const alaNorte = ambientesDoAndar.filter((a) => a.posicao === "norte");
  const alaSul = ambientesDoAndar.filter((a) => a.posicao === "sul");

  const itinerario = useMemo((): ItinerarioItem[] => {
    if (aulasHoje.length === 0) return [];

    const itens: ItinerarioItem[] = aulasHoje.map((aula) => {
      const t = aula.turmas;
      const sala = t.sala || "Sala a definir";
      const andar = t.andar || "Andar a definir";
      return {
        hora: horarioDoTurno(t.turno),
        label: t.curso || "Disciplina",
        local: `${sala} – ${andar}`,
        tipo: "aula" as const,
      };
    });

    // Ordena por horário e insere intervalo se houver 2+ aulas
    itens.sort((a, b) => a.hora.localeCompare(b.hora));
    if (itens.length >= 2) {
      const comIntervalo: ItinerarioItem[] = [];
      itens.forEach((item, idx) => {
        comIntervalo.push(item);
        if (idx === 0) {
          comIntervalo.push({
            hora: "10:00",
            label: "Intervalo",
            local: "",
            tipo: "intervalo",
          });
        }
      });
      return comIntervalo;
    }
    return itens;
  }, [aulasHoje]);

  async function fetchAiMapa(andar: string, sala: string) {
    setIsLoadingAi(true);
    try {
      const response = await fetch("/api/insights/mapa-salas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          andar,
          salaProxima: sala || "nenhuma definida",
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha na dica do mapa");
      const dica =
        (typeof data.dica === "string" && data.dica.trim()) ||
        (typeof data.insight === "string" && data.insight.trim()) ||
        "";
      setAiInsight(dica);
    } catch (err) {
      console.error("Erro ao gerar dica do mapa:", err);
      setAiInsight(
        "Consulte os laboratórios com status Livre para estudo prático individual durante seus horários vagos."
      );
    } finally {
      setIsLoadingAi(false);
    }
  }

  useEffect(() => {
    if (carregandoSessao || !alunoLogado) return;

    async function carregarMapa() {
      setCarregando(true);
      const hoje = diaHoje();

      try {
        const { data: alunoData, error: alunoError } = await supabase
          .from("alunos")
          .select("*")
          .eq("ra", alunoLogado!.ra)
          .single();

        if (alunoError || !alunoData) {
          if (alunoError) {
            console.error("Erro ao buscar aluno:", alunoError.message);
          }
          setAluno({
            nome: alunoLogado!.nome,
            ra: alunoLogado!.ra,
          });
          setIsLoadingAi(false);
          return;
        }

        const alunoSessao: AlunoInfo = {
          nome: String(alunoData.nome ?? alunoLogado!.nome ?? "Estudante"),
          ra: String(alunoData.ra || alunoData.matricula || alunoLogado!.ra),
        };
        setAluno(alunoSessao);

        if (!alunoSessao.ra) {
          setIsLoadingAi(false);
          return;
        }

        let turmasList: TurmaMapa[] = [];

        const { data: notasJoin, error: joinError } = await supabase
          .from("notas")
          .select("turmas(curso, professor, sala, andar, dias_aula, turno)")
          .eq("ra_aluno", alunoSessao.ra);

        if (joinError) {
          console.warn(
            "Join notas→turmas (mapa) falhou, buscando em separado:",
            joinError.message
          );

          const { data: notasSimples } = await supabase
            .from("notas")
            .select("turma")
            .eq("ra_aluno", alunoSessao.ra);

          const ids = [
            ...new Set(
              (notasSimples ?? [])
                .map((n) => String(n.turma ?? ""))
                .filter(Boolean)
            ),
          ];

          if (ids.length > 0) {
            const { data: turmasData } = await supabase
              .from("turmas")
              .select("curso, professor, sala, andar, dias_aula, turno")
              .in("id", ids);

            turmasList = (turmasData ?? []).map((t) => ({
              curso: t.curso != null ? String(t.curso) : null,
              professor: t.professor != null ? String(t.professor) : null,
              sala: t.sala != null ? String(t.sala) : null,
              andar: t.andar != null ? String(t.andar) : null,
              dias_aula: t.dias_aula as string[] | string | null,
              turno: t.turno != null ? String(t.turno) : null,
            }));
          }
        } else {
          turmasList = (notasJoin ?? [])
            .map((n) => normalizarTurma(n.turmas))
            .filter((t): t is TurmaMapa => t !== null);
        }

        const deHoje = turmasList
          .filter((t) => ocorreHoje(t, hoje))
          .map((t) => ({ turmas: t }));

        setAulasHoje(deHoje);

        const primeira = deHoje[0] ?? null;
        setProximaAula(primeira);

        // Aba padrão = andar da próxima aula
        if (primeira?.turmas?.andar && isAndarValido(primeira.turmas.andar)) {
          setAndarSelecionado(primeira.turmas.andar);
          const ambientes = catalogo[primeira.turmas.andar];
          const match = ambientes.find((a) =>
            matchSala(a.codigo, primeira.turmas.sala)
          );
          setAmbienteSelecionadoId(match?.id ?? ambientes[0]?.id ?? "");
        } else {
          setAndarSelecionado("Térreo");
          setAmbienteSelecionadoId(catalogo["Térreo"][0]?.id ?? "");
        }

        await fetchAiMapa(
          primeira?.turmas?.andar || "Térreo",
          primeira?.turmas?.sala || ""
        );
      } finally {
        setCarregando(false);
      }
    }

    void carregarMapa();
  }, [alunoLogado, carregandoSessao]);

  function handleTrocarAndar(andar: AndarLabel) {
    setAndarSelecionado(andar);
    const ambientes = catalogo[andar];
    const match = ambientes.find((a) => matchSala(a.codigo, salaProxima));
    setAmbienteSelecionadoId(match?.id ?? ambientes[0]?.id ?? "");
    void fetchAiMapa(andar, salaProxima || "");
  }

  function renderAmbienteCard(ambiente: AmbienteBase) {
    const isProxima =
      matchAndar(andarSelecionado, andarProxima) &&
      matchSala(ambiente.codigo, salaProxima);
    const selecionado = ambiente.id === ambienteSelecionadoId;
    const Icon = iconForAmbiente(ambiente);

    const cursoNome =
      isProxima && proximaAula?.turmas?.curso
        ? proximaAula.turmas.curso
        : ambiente.nome;
    const professorNome =
      isProxima && proximaAula?.turmas?.professor
        ? proximaAula.turmas.professor
        : null;

    return (
      <button
        key={ambiente.id}
        type="button"
        onClick={() => setAmbienteSelecionadoId(ambiente.id)}
        className={`relative text-left rounded-lg border p-4 flex flex-col gap-1.5 min-h-[110px] transition-all cursor-pointer overflow-hidden ${
          isProxima
            ? "border-blue-500 bg-blue-900/30 shadow-[0_0_24px_rgba(59,130,246,0.18)] hover:border-blue-400"
            : selecionado
              ? "border-zinc-600 bg-zinc-900"
              : ambiente.statusBase === "livre"
                ? "border-emerald-500/40 bg-zinc-900 hover:border-emerald-400/70"
                : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"
        }`}
      >
        {isProxima && (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-transparent pointer-events-none" />
        )}
        <div className="relative flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <p
                className={`text-xs font-semibold uppercase tracking-wider ${
                  isProxima
                    ? "text-blue-300"
                    : ambiente.statusBase === "livre"
                      ? "text-emerald-400"
                      : "text-zinc-400"
                }`}
              >
                {ambiente.codigo}
              </p>
              {isProxima && (
                <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-900 text-blue-300 border border-blue-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse inline-block" />
                  Próxima aula
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-white truncate">
              {cursoNome}
            </p>
            {professorNome && (
              <p className="text-xs mt-0.5 text-blue-200">
                Prof. {professorNome}
              </p>
            )}
            {!isProxima && ambiente.tipo === "lab" && (
              <p className="text-xs text-zinc-500 mt-0.5">
                {ambiente.estacoes} máquinas
              </p>
            )}
          </div>
          <Icon
            className={`w-4 h-4 shrink-0 mt-0.5 ${
              isProxima ? "text-blue-400" : "text-zinc-600"
            }`}
          />
        </div>
        {!isProxima && (
          <span
            className={`relative self-start mt-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
              ambiente.statusBase === "livre"
                ? "bg-emerald-950 text-emerald-400 border border-emerald-900"
                : "bg-zinc-800 text-zinc-400 border border-zinc-700"
            }`}
          >
            {ambiente.statusBase === "livre" ? "Livre" : "Ocupada"}
          </span>
        )}
      </button>
    );
  }

  const IconAtivo = ambienteAtivo ? iconForAmbiente(ambienteAtivo) : Monitor;
  const ambienteAtivoEhProxima =
    !!ambienteAtivo &&
    matchAndar(andarSelecionado, andarProxima) &&
    matchSala(ambienteAtivo.codigo, salaProxima);

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-zinc-950 border-r border-zinc-800">
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-zinc-800">
          <div className="w-8 h-8 bg-gradient-to-br from-zinc-800 to-zinc-950 border border-zinc-700/50 shadow-[0_0_15px_rgba(255,255,255,0.05)] flex items-center justify-center rounded-lg shrink-0">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="text-sm tracking-tight">
            <span className="text-white font-bold">UniClass</span>
            <span className="text-zinc-400 font-light">Tech</span>
          </span>
        </div>

        <div className="px-4 py-5 border-b border-zinc-800">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-base font-semibold text-white">
                  {aluno ? iniciaisDe(aluno.nome) : "—"}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-zinc-700 border border-zinc-900 rounded-full flex items-center justify-center cursor-pointer hover:bg-zinc-600 transition-colors">
                  <Camera className="w-2.5 h-2.5 text-zinc-300" />
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {aluno?.nome || "Estudante"}
                </p>
                <p className="text-xs text-zinc-500">RA: {aluno?.ra || "—"}</p>
              </div>
            </div>
            <Link
              href="/aluno/dashboard/perfil"
              className="text-zinc-500 hover:text-white transition-colors shrink-0"
            >
              <Settings className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <nav className="flex flex-col gap-0.5 px-2 py-4 flex-1">
          {navItems.map(({ icon: Icon, label, href, active }) => (
            <Link
              key={label}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-zinc-800 text-white font-medium"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="px-2 py-4 border-t border-zinc-800">
          <a
            href="/"
            onClick={() => limparSessaoAluno()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-500 hover:bg-zinc-900 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sair
          </a>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-10">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">
              Mapa de Salas e Laboratórios
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Localize suas aulas e laboratórios disponíveis para estudo.
            </p>
            <div className="flex items-center gap-1 mt-4 p-1 bg-zinc-950 border border-zinc-800 rounded-lg w-fit flex-wrap">
              {andares.map((andar) => {
                const ehAndarAula = matchAndar(andar, andarProxima);
                const selecionado = andarSelecionado === andar;
                return (
                  <button
                    key={andar}
                    type="button"
                    onClick={() => handleTrocarAndar(andar)}
                    className={`px-4 py-1.5 rounded-md text-sm transition-colors ${
                      ehAndarAula
                        ? "text-emerald-400 border-b-2 border-emerald-500 font-bold"
                        : selecionado
                          ? "bg-zinc-800 text-white font-medium"
                          : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {andar}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-start gap-4 p-5 rounded-xl bg-zinc-900/50 border border-zinc-800 mb-6">
            <div className="shrink-0 mt-0.5 w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/50 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-zinc-300" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">
                Dica da IA
              </p>
              <p
                className={`text-sm text-zinc-300 leading-relaxed break-words whitespace-normal ${
                  isLoadingAi ? "animate-pulse" : ""
                }`}
              >
                {isLoadingAi
                  ? "Consultando disponibilidade de salas com IA..."
                  : aiInsight ||
                    "Consulte os laboratórios com status Livre para estudar nos horários vagos."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3 rounded-2xl bg-[#0c0e14] border border-gray-800/80 overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="text-sm font-semibold">
                  Planta Baixa — {andarSelecionado}
                </h2>
                <span className="text-xs text-zinc-600">
                  {carregando
                    ? "…"
                    : `${ambientesDoAndar.length} ambientes`}
                </span>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-2 gap-3">
                  {alaNorte.map(renderAmbienteCard)}
                </div>

                <div className="border-t border-b border-gray-800 bg-[#12151f]/60 text-[11px] text-gray-500 uppercase tracking-widest py-1 px-4 text-center rounded-md my-4">
                  Corredor Principal
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {alaSul.map(renderAmbienteCard)}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
                <div className="px-5 py-4 border-b border-zinc-800">
                  <h2 className="text-sm font-semibold">Local Selecionado</h2>
                </div>
                {ambienteAtivo && (
                  <div className="px-5 py-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-2xl font-semibold tracking-tight">
                          {ambienteAtivo.codigo}
                        </p>
                        <p className="text-sm text-zinc-400 mt-0.5">
                          {ambienteAtivoEhProxima && proximaAula?.turmas?.curso
                            ? proximaAula.turmas.curso
                            : ambienteAtivo.nome}
                        </p>
                        {ambienteAtivoEhProxima &&
                          proximaAula?.turmas?.professor && (
                            <p className="text-xs text-blue-300 mt-1">
                              Prof. {proximaAula.turmas.professor}
                            </p>
                          )}
                      </div>
                      <MapPin className="w-5 h-5 text-zinc-600 shrink-0 mt-1" />
                    </div>
                    <span
                      className={`inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        ambienteAtivoEhProxima
                          ? "bg-blue-950 text-blue-400 border border-blue-900"
                          : ambienteAtivo.statusBase === "livre"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-900"
                            : "bg-rose-950/50 text-rose-400 border border-rose-900"
                      }`}
                    >
                      {ambienteAtivoEhProxima
                        ? "Sua próxima aula"
                        : ambienteAtivo.statusBase === "livre"
                          ? "Livre"
                          : "Ocupada"}
                    </span>

                    <div className="mt-5 flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                          <IconAtivo className="w-3.5 h-3.5 text-zinc-400" />
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500">Estações</p>
                          <p className="text-sm font-medium text-white">
                            {ambienteAtivo.estacoes > 0
                              ? `${ambienteAtivo.estacoes} Máquinas`
                              : "Não aplicável"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                          <Cpu className="w-3.5 h-3.5 text-zinc-400" />
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500">Sistema</p>
                          <p className="text-sm font-medium text-white">
                            {ambienteAtivo.sistema}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                          <Laptop className="w-3.5 h-3.5 text-zinc-400" />
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500">Software</p>
                          <p className="text-sm font-medium text-white">
                            {ambienteAtivo.softwares.length > 0
                              ? ambienteAtivo.softwares.join(", ")
                              : "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
                <div className="px-5 py-4 border-b border-zinc-800">
                  <h2 className="text-sm font-semibold">Itinerário de Hoje</h2>
                  <p className="text-[11px] text-zinc-600 mt-0.5">
                    {diaHoje()}
                  </p>
                </div>
                <div className="px-5 py-4 flex flex-col gap-0">
                  {carregando ? (
                    <p className="text-sm text-zinc-500 animate-pulse">
                      Carregando itinerário...
                    </p>
                  ) : itinerario.length === 0 ? (
                    <p className="text-sm text-zinc-500">
                      Nenhuma aula com sala alocada para hoje.
                    </p>
                  ) : (
                    itinerario.map((item, i) => (
                      <div key={`${item.label}-${i}`} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${
                              item.tipo === "intervalo"
                                ? "bg-zinc-900 border-zinc-700"
                                : "bg-zinc-800 border-zinc-600"
                            }`}
                          >
                            {item.tipo === "intervalo" ? (
                              <Coffee className="w-3 h-3 text-zinc-500" />
                            ) : (
                              <Clock className="w-3 h-3 text-zinc-400" />
                            )}
                          </div>
                          {i < itinerario.length - 1 && (
                            <div className="w-px flex-1 bg-zinc-800 my-1" />
                          )}
                        </div>

                        <div className="pb-4 min-w-0">
                          <p className="text-xs text-zinc-500 mb-0.5">
                            {item.hora}
                          </p>
                          <p
                            className={`text-sm font-medium ${
                              item.tipo === "intervalo"
                                ? "text-zinc-500"
                                : "text-white"
                            }`}
                          >
                            {item.label}
                          </p>
                          {item.local && (
                            <p className="text-xs text-zinc-500 mt-0.5">
                              {item.local}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
