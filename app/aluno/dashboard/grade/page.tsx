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
  Download,
  CheckCircle,
  Lock,
  Settings,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ModalFeedback } from "@/components/ModalFeedback";
import {
  limparSessaoAluno,
  useAlunoSession,
} from "@/lib/aluno-session";

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral", href: "/aluno/dashboard", active: false },
  { icon: ClipboardList, label: "Boletim e Notas", href: "/aluno/dashboard/notas", active: false },
  { icon: CalendarCheck, label: "Frequência", href: "/aluno/dashboard/frequencia", active: false },
  { icon: BookOpen, label: "Grade e Matérias", href: "/aluno/dashboard/grade", active: true },
  { icon: MapIcon, label: "Mapa de Salas e Labs", href: "/aluno/dashboard/mapa", active: false },
  { icon: MessageSquare, label: "Contato", href: "/aluno/dashboard/contato", active: false },
];

const CARGA_TOTAL_PADRAO = 2400;
const CARGA_HORARIA_DISCIPLINA_PADRAO = 80;
const SEMESTRE_PADRAO = 4;
const SEMESTRE_LIMITE_CURSO = 8;
const HORAS_POR_SEMESTRE_SIMULADO = 300;

type AlunoInfo = {
  nome: string;
  ra: string;
  curso: string;
  semestreAtual: number;
  cargaHorariaTotal: number;
};

type TurmaVinculo = {
  id?: string;
  curso?: string | null;
  professor?: string | null;
  carga_horaria?: number | null;
};

type HistoricoDisciplina = {
  id: string;
  status: string;
  turmas: TurmaVinculo | null;
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

function extrairNumeroSemestre(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return Math.min(Math.floor(raw), SEMESTRE_LIMITE_CURSO);
  }
  if (typeof raw === "string") {
    const match = raw.match(/(\d+)/);
    if (match) {
      const n = Number(match[1]);
      if (Number.isFinite(n) && n > 0) {
        return Math.min(n, SEMESTRE_LIMITE_CURSO);
      }
    }
  }
  return SEMESTRE_PADRAO;
}

function cargaDe(turma: TurmaVinculo | null): number {
  const n = Number(turma?.carga_horaria);
  if (!Number.isFinite(n) || n <= 0) return CARGA_HORARIA_DISCIPLINA_PADRAO;
  return n;
}

function normalizarTurma(raw: unknown): TurmaVinculo | null {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    return raw[0] ? normalizarTurma(raw[0]) : null;
  }
  if (typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  return {
    id: t.id != null ? String(t.id) : undefined,
    curso: t.curso != null ? String(t.curso) : null,
    professor: t.professor != null ? String(t.professor) : null,
    carga_horaria:
      t.carga_horaria != null && !Number.isNaN(Number(t.carga_horaria))
        ? Number(t.carga_horaria)
        : null,
  };
}

function isConcluida(status: string) {
  return status.trim().toLowerCase() === "aprovado";
}

function isEmAndamento(status: string) {
  const s = status.trim().toLowerCase();
  return s === "cursando" || s === "pendente" || s === "exame final";
}

export default function AlunoGradePage() {
  const { alunoLogado, carregandoSessao } = useAlunoSession();
  const [aluno, setAluno] = useState<AlunoInfo | null>(null);
  const [historicoDisciplinas, setHistoricoDisciplinas] = useState<
    HistoricoDisciplina[]
  >([]);
  const [carregando, setCarregando] = useState(true);
  const [aiInsight, setAiInsight] = useState("");
  const [isLoadingAi, setIsLoadingAi] = useState(true);
  const [modalFeedback, setModalFeedback] = useState<{
    aberto: boolean;
    tipo: "sucesso" | "erro" | "atencao";
    titulo: string;
    mensagem: string;
  }>({
    aberto: false,
    tipo: "sucesso",
    titulo: "",
    mensagem: "",
  });

  const semestreAtual = aluno?.semestreAtual ?? SEMESTRE_PADRAO;
  const cargaHorariaTotalCurso =
    aluno?.cargaHorariaTotal ?? CARGA_TOTAL_PADRAO;

  const concluidas = useMemo(
    () => historicoDisciplinas.filter((d) => isConcluida(d.status)),
    [historicoDisciplinas]
  );

  const emAndamento = useMemo(
    () => historicoDisciplinas.filter((d) => isEmAndamento(d.status)),
    [historicoDisciplinas]
  );

  const { horasCursadas, horasRestantes, progresso, horasEmAndamento } =
    useMemo(() => {
      const horasConcluidasReais = concluidas.reduce(
        (acc, d) => acc + cargaDe(d.turmas),
        0
      );
      const horasAndamento = emAndamento.reduce(
        (acc, d) => acc + cargaDe(d.turmas),
        0
      );

      const horasBaseSimuladas = (semestreAtual - 1) * HORAS_POR_SEMESTRE_SIMULADO;
      // Simulação inteligente quando o histórico real ainda é baixo para o protótipo
      const horasSimuladas =
        horasConcluidasReais < horasBaseSimuladas
          ? horasBaseSimuladas + horasConcluidasReais
          : Math.max(horasConcluidasReais, horasBaseSimuladas);

      const cursadas = Math.min(horasSimuladas, cargaHorariaTotalCurso);
      const restantes = Math.max(cargaHorariaTotalCurso - cursadas, 0);
      const pct = Math.round((cursadas / cargaHorariaTotalCurso) * 100);

      return {
        horasCursadas: cursadas,
        horasRestantes: restantes,
        progresso: pct,
        horasEmAndamento: horasAndamento,
      };
    }, [
      concluidas,
      emAndamento,
      semestreAtual,
      cargaHorariaTotalCurso,
    ]);

  const labelSemestresConcluidos =
    semestreAtual <= 1
      ? "Nenhum semestre concluído"
      : semestreAtual === 2
        ? "1º Semestre"
        : `1º ao ${semestreAtual - 1}º Semestre`;

  const labelSemestresPendentes =
    semestreAtual >= SEMESTRE_LIMITE_CURSO
      ? "Curso em fase final"
      : semestreAtual + 1 === SEMESTRE_LIMITE_CURSO
        ? `${SEMESTRE_LIMITE_CURSO}º Semestre`
        : `${semestreAtual + 1}º ao ${SEMESTRE_LIMITE_CURSO}º Semestre`;

  async function fetchAiGrade(cursoNome: string, nomes: string[]) {
    setIsLoadingAi(true);
    try {
      const response = await fetch("/api/insights/grade-curricular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cursoNome: cursoNome || "Tecnologia da Informação",
          disciplinasAtuais: nomes,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Falha na análise de grade curricular");
      }
      setAiInsight((data.insight as string) ?? "");
    } catch (err) {
      console.error("Erro ao gerar insight da grade:", err);
      setAiInsight(
        "Aprofunde-se nos fundamentos práticos das disciplinas atuais. Praticar projetos pessoais fortalece sua evolução para os próximos semestres."
      );
    } finally {
      setIsLoadingAi(false);
    }
  }

  useEffect(() => {
    if (carregandoSessao || !alunoLogado) return;

    async function carregarGrade() {
      setCarregando(true);

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
            curso: alunoLogado!.curso || "Tecnologia da Informação",
            semestreAtual: extrairNumeroSemestre(alunoLogado!.semestreAtual),
            cargaHorariaTotal: CARGA_TOTAL_PADRAO,
          });
          setHistoricoDisciplinas([]);
          setIsLoadingAi(false);
          return;
        }

        const alunoSessao: AlunoInfo = {
          nome: String(alunoData.nome ?? alunoLogado!.nome ?? "Estudante"),
          ra: String(alunoData.ra || alunoData.matricula || alunoLogado!.ra),
          curso: String(
            alunoData.curso || alunoLogado!.curso || "Tecnologia da Informação"
          ),
          semestreAtual: extrairNumeroSemestre(
            alunoData.semestre_atual ??
              alunoData.semestre ??
              alunoLogado!.semestreAtual
          ),
          cargaHorariaTotal: (() => {
            const n = Number(
              alunoData.carga_horaria_total ??
                alunoData.carga_horaria_curso ??
                alunoData.carga_horaria
            );
            return Number.isFinite(n) && n > 0 ? n : CARGA_TOTAL_PADRAO;
          })(),
        };
        setAluno(alunoSessao);

        if (!alunoSessao.ra) {
          setHistoricoDisciplinas([]);
          setIsLoadingAi(false);
          return;
        }

        let historico: HistoricoDisciplina[] = [];

        const { data: notasJoin, error: notasJoinError } = await supabase
          .from("notas")
          .select("id, status, turmas(id, curso, professor, carga_horaria)")
          .eq("ra_aluno", alunoSessao.ra);

        if (notasJoinError) {
          console.warn(
            "Join notas→turmas falhou, buscando em separado:",
            notasJoinError.message
          );

          const { data: notasSimples, error: notasError } = await supabase
            .from("notas")
            .select("id, status, turma")
            .eq("ra_aluno", alunoSessao.ra);

          if (notasError) {
            console.error("Erro ao buscar histórico:", notasError.message);
            setHistoricoDisciplinas([]);
            await fetchAiGrade(alunoSessao.curso, []);
            return;
          }

          const turmaIds = [
            ...new Set(
              (notasSimples ?? [])
                .map((n) => String(n.turma ?? ""))
                .filter(Boolean)
            ),
          ];

          const mapaTurmas = new Map<string, TurmaVinculo>();
          if (turmaIds.length > 0) {
            const { data: turmasData } = await supabase
              .from("turmas")
              .select("id, curso, professor, carga_horaria")
              .in("id", turmaIds);

            for (const t of turmasData ?? []) {
              mapaTurmas.set(String(t.id), {
                id: String(t.id),
                curso: t.curso != null ? String(t.curso) : null,
                professor: t.professor != null ? String(t.professor) : null,
                carga_horaria:
                  t.carga_horaria != null
                    ? Number(t.carga_horaria)
                    : null,
              });
            }
          }

          historico = (notasSimples ?? []).map((n, idx) => ({
            id: String(n.id ?? `nota-${idx}`),
            status: String(n.status ?? "Pendente"),
            turmas: mapaTurmas.get(String(n.turma ?? "")) ?? null,
          }));
        } else {
          historico = (notasJoin ?? []).map((n, idx) => ({
            id: String(n.id ?? `nota-${idx}`),
            status: String(n.status ?? "Pendente"),
            turmas: normalizarTurma(n.turmas),
          }));
        }

        setHistoricoDisciplinas(historico);

        const nomesEmAndamento = historico
          .filter((d) => isEmAndamento(d.status))
          .map((d) => d.turmas?.curso || "Disciplina sem nome");

        await fetchAiGrade(alunoSessao.curso, nomesEmAndamento);
      } finally {
        setCarregando(false);
      }
    }

    void carregarGrade();
  }, [alunoLogado, carregandoSessao]);

  function handleBaixarEmenta() {
    setModalFeedback({
      aberto: true,
      tipo: "sucesso",
      titulo: "Ementa Curricular",
      mensagem:
        "O download da ementa completa do curso em PDF será iniciado em instantes.",
    });
  }

  function fecharFeedback() {
    setModalFeedback((prev) => ({ ...prev, aberto: false }));
  }

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      {/* ══════════════════════════════
          SIDEBAR
      ══════════════════════════════ */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-zinc-950 border-r border-zinc-800">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-zinc-800">
          <div className="w-8 h-8 bg-gradient-to-br from-zinc-800 to-zinc-950 border border-zinc-700/50 shadow-[0_0_15px_rgba(255,255,255,0.05)] flex items-center justify-center rounded-lg shrink-0">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="text-sm tracking-tight">
            <span className="text-white font-bold">UniClass</span>
            <span className="text-zinc-400 font-light">Tech</span>
          </span>
        </div>

        {/* Perfil */}
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

        {/* Nav */}
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

        {/* Logout */}
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

      {/* ══════════════════════════════
          MAIN CONTENT
      ══════════════════════════════ */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 py-10">
          {/* ── Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Grade Curricular
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                Acompanhe seu progresso e o mapa de disciplinas do seu curso.
              </p>
            </div>
            <button
              type="button"
              onClick={handleBaixarEmenta}
              className="flex items-center gap-2 border border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors text-sm rounded-lg px-4 py-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Baixar Ementa (PDF)
            </button>
          </div>

          {/* ── AI Insight Card ── */}
          <div className="flex items-start gap-4 p-5 rounded-xl bg-zinc-900/50 border border-zinc-800 mb-8">
            <div className="shrink-0 mt-0.5 w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/50 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-zinc-300" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">
                Insight da IA
              </p>
              <p
                className={`text-sm text-zinc-300 leading-relaxed break-words whitespace-normal ${
                  isLoadingAi ? "animate-pulse" : ""
                }`}
              >
                {isLoadingAi
                  ? "Mapeando projeções da grade curricular..."
                  : aiInsight}
              </p>
            </div>
          </div>

          {/* ── Progresso do Curso ── */}
          <div className="p-6 rounded-xl bg-zinc-950 border border-zinc-800 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">Progresso Geral do Curso</h2>
              <span className="text-3xl font-semibold tracking-tight">
                {carregando ? "…" : `${progresso}%`}
              </span>
            </div>
            <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${carregando ? 0 : progresso}%` }}
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-widest">
                  Horas Cursadas
                </p>
                <p className="text-lg font-semibold mt-1">
                  {carregando
                    ? "…"
                    : `${horasCursadas.toLocaleString("pt-BR")}h`}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-widest">
                  Horas Restantes
                </p>
                <p className="text-lg font-semibold mt-1">
                  {carregando
                    ? "…"
                    : `${horasRestantes.toLocaleString("pt-BR")}h`}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-widest">
                  Em Andamento
                </p>
                <p className="text-lg font-semibold mt-1">
                  {carregando
                    ? "…"
                    : `${horasEmAndamento.toLocaleString("pt-BR")}h`}
                </p>
              </div>
            </div>
          </div>

          {/* ── Layout de Colunas: Semestre Atual + Histórico ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Coluna Esquerda (2/3) — Semestre Atual */}
            <div className="lg:col-span-2 rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="text-sm font-semibold">
                  Semestre Atual ({semestreAtual}º Semestre)
                </h2>
                <span className="text-xs text-zinc-600">
                  {carregando ? "…" : `${emAndamento.length} disciplinas`}
                </span>
              </div>
              <div className="flex flex-col divide-y divide-zinc-800">
                {carregando ? (
                  <p className="px-6 py-10 text-sm text-zinc-500 text-center animate-pulse">
                    Carregando disciplinas...
                  </p>
                ) : emAndamento.length === 0 ? (
                  <p className="px-6 py-10 text-sm text-zinc-500 text-center">
                    Nenhuma disciplina em andamento neste semestre.
                  </p>
                ) : (
                  emAndamento.map((disciplina) => {
                    const carga = cargaDe(disciplina.turmas);
                    const creditos = Math.round(carga / 20);
                    return (
                      <div
                        key={disciplina.id}
                        className="px-6 py-4 hover:bg-zinc-900/50 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <p className="text-sm font-medium text-white">
                            {disciplina.turmas?.curso || "Disciplina sem nome"}
                          </p>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-950/60 text-blue-400 border border-blue-800 whitespace-nowrap">
                            Em andamento
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500">
                          Carga Horária: {carga}h | Créditos: {creditos}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Coluna Direita (1/3) — Histórico e Futuro */}
            <div className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-800">
                <h2 className="text-sm font-semibold">Histórico e Futuro</h2>
              </div>
              <div className="flex flex-col divide-y divide-zinc-800">
                <div className="px-5 py-4 hover:bg-zinc-900/50 transition-colors">
                  <div className="flex items-center gap-3 mb-1.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-900 flex items-center justify-center shrink-0">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white">
                        {labelSemestresConcluidos}
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-900 whitespace-nowrap">
                      Concluído
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 ml-10">
                    {concluidas.length}{" "}
                    {concluidas.length === 1
                      ? "disciplina concluída"
                      : "disciplinas concluídas"}
                  </p>
                </div>

                {semestreAtual < SEMESTRE_LIMITE_CURSO && (
                  <div className="px-5 py-4 hover:bg-zinc-900/50 transition-colors">
                    <div className="flex items-center gap-3 mb-1.5">
                      <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                        <Lock className="w-3.5 h-3.5 text-zinc-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white">
                          {labelSemestresPendentes}
                        </p>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-800 whitespace-nowrap">
                        Pendente
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 ml-10">
                      {horasRestantes.toLocaleString("pt-BR")}h restantes no
                      curso
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <ModalFeedback
        aberto={modalFeedback.aberto}
        onClose={fecharFeedback}
        tipo={modalFeedback.tipo}
        titulo={modalFeedback.titulo}
        mensagem={modalFeedback.mensagem}
      />
    </div>
  );
}
