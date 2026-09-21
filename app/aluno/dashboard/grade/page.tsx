"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  ClipboardList,
  CalendarCheck,
  CalendarDays,
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
import { AlunoAvatar } from "@/components/aluno/aluno-avatar";
import { ModalFeedback } from "@/components/ModalFeedback";
import {
  limparSessaoAluno,
  useAlunoSession,
} from "@/lib/aluno-session";
import {
  nomeProfessorDoJoin,
  SELECT_TURMA_COM_PROFESSOR,
} from "@/lib/professor-relacao";

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral", href: "/aluno/dashboard", active: false },
  { icon: ClipboardList, label: "Boletim e Notas", href: "/aluno/dashboard/notas", active: false },
  { icon: CalendarDays, label: "Meu Calendário", href: "/aluno/dashboard/calendario", active: false },
  { icon: CalendarCheck, label: "Frequência", href: "/aluno/dashboard/frequencia", active: false },
  { icon: BookOpen, label: "Grade e Matérias", href: "/aluno/dashboard/grade", active: true },
  { icon: MapIcon, label: "Mapa de Salas e Labs", href: "/aluno/dashboard/mapa", active: false },
  { icon: MessageSquare, label: "Contato", href: "/aluno/dashboard/contato", active: false },
];

const CARGA_TOTAL_PADRAO = 2400;
const CARGA_HORARIA_DISCIPLINA_PADRAO = 80;
const SEMESTRE_PADRAO = 1;
const SEMESTRE_LIMITE_CURSO = 8;

type AlunoInfo = {
  nome: string;
  ra: string;
  curso: string;
  turmaCodigo: string;
  semestreAtual: number;
  cargaHorariaTotal: number;
};

type DisciplinaGrade = {
  id: string;
  nome: string;
  professor: string | null;
  cargaHoraria: number;
  semestre: number;
  status: string | null;
};

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

function toCargaHoraria(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return CARGA_HORARIA_DISCIPLINA_PADRAO;
  return n;
}

function nomeDisciplina(row: Record<string, unknown>): string {
  return String(
    row.nome ?? row.disciplina ?? row.curso ?? row.codigo ?? "Disciplina sem nome"
  ).trim();
}

function isStatusConcluido(status: string | null | undefined): boolean {
  if (!status) return false;
  const s = status.trim().toLowerCase();
  return (
    s === "aprovado" ||
    s === "concluido" ||
    s === "concluído" ||
    s === "aprovada"
  );
}

function isStatusEmAndamento(status: string | null | undefined): boolean {
  if (!status) return false;
  const s = status.trim().toLowerCase();
  return (
    s === "cursando" ||
    s === "pendente" ||
    s === "exame final" ||
    s === "em andamento" ||
    s === "matriculado"
  );
}

function mapTurmaParaDisciplina(
  row: Record<string, unknown>,
  status: string | null = null,
  semestreFallback?: number
): DisciplinaGrade {
  return {
    id: String(row.id ?? row.codigo ?? nomeDisciplina(row)),
    nome: nomeDisciplina(row),
    professor: nomeProfessorDoJoin(row) || null,
    cargaHoraria: toCargaHoraria(row.carga_horaria),
    semestre: extrairNumeroSemestre(
      row.semestre ?? row.semestre_atual ?? semestreFallback
    ),
    status,
  };
}

function deduplicarDisciplinas(lista: DisciplinaGrade[]): DisciplinaGrade[] {
  const mapa = new Map<string, DisciplinaGrade>();
  for (const d of lista) {
    const chave = d.id || d.nome.toLowerCase();
    if (!mapa.has(chave)) {
      mapa.set(chave, d);
      continue;
    }
    const atual = mapa.get(chave)!;
    mapa.set(chave, {
      ...atual,
      status: atual.status || d.status,
      professor: atual.professor || d.professor,
      cargaHoraria:
        atual.cargaHoraria > 0 ? atual.cargaHoraria : d.cargaHoraria,
    });
  }
  return [...mapa.values()];
}

export default function AlunoGradePage() {
  const { alunoLogado, carregandoSessao } = useAlunoSession();
  const [aluno, setAluno] = useState<AlunoInfo | null>(null);
  const [disciplinas, setDisciplinas] = useState<DisciplinaGrade[]>([]);
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

  const { concluidas, emAndamento, futuras } = useMemo(() => {
    const concluidasList: DisciplinaGrade[] = [];
    const andamentoList: DisciplinaGrade[] = [];
    const futurasList: DisciplinaGrade[] = [];

    for (const d of disciplinas) {
      if (isStatusConcluido(d.status) || d.semestre < semestreAtual) {
        concluidasList.push(d);
      } else if (
        isStatusEmAndamento(d.status) ||
        d.semestre === semestreAtual
      ) {
        andamentoList.push(d);
      } else {
        futurasList.push(d);
      }
    }

    return {
      concluidas: concluidasList,
      emAndamento: andamentoList,
      futuras: futurasList,
    };
  }, [disciplinas, semestreAtual]);

  const {
    horasCursadas,
    horasRestantes,
    progresso,
    horasEmAndamento,
    horasTotais,
  } = useMemo(() => {
    const somaCarga = (lista: DisciplinaGrade[]) =>
      lista.reduce((acc, d) => acc + d.cargaHoraria, 0);

    const horasAndamento = somaCarga(emAndamento);
    const horasConcluidas = somaCarga(concluidas);
    const horasGrade = somaCarga(disciplinas);

    const total =
      aluno?.cargaHorariaTotal && aluno.cargaHorariaTotal > 0
        ? aluno.cargaHorariaTotal
        : horasGrade > 0
          ? horasGrade
          : CARGA_TOTAL_PADRAO;

    const cursadas = Math.min(horasConcluidas, total);
    const emCurso = Math.min(horasAndamento, Math.max(total - cursadas, 0));
    const restantes = Math.max(total - cursadas - emCurso, 0);

    // Progresso otimista: inclui horas em andamento do semestre atual
    const pct = total > 0
      ? Math.min(100, Math.round(((cursadas + emCurso) / total) * 100))
      : 0;

    return {
      horasCursadas: cursadas,
      horasRestantes: restantes,
      progresso: pct,
      horasEmAndamento: emCurso,
      horasTotais: total,
    };
  }, [concluidas, emAndamento, disciplinas, aluno?.cargaHorariaTotal]);

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
          alunoNome: alunoLogado?.nome,
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
        // 1) Perfil do aluno (pode haver várias linhas por RA no boletim)
        const { data: alunosRows, error: alunoError } = await supabase
          .from("alunos")
          .select("*")
          .eq("ra", alunoLogado!.ra);

        if (alunoError) {
          console.error("Erro ao buscar aluno:", alunoError.message);
        }

        const rows = (alunosRows ?? []) as Record<string, unknown>[];
        const alunoData = rows[0] ?? null;

        const semestreAtualAluno = extrairNumeroSemestre(
          alunoData?.semestre_atual ??
            alunoData?.semestre ??
            alunoLogado!.semestreAtual
        );

        const cargaTotalAluno = (() => {
          const n = Number(
            alunoData?.carga_horaria_total ??
              alunoData?.carga_horaria_curso ??
              alunoData?.carga_horaria
          );
          return Number.isFinite(n) && n > 0 ? n : 0;
        })();

        const alunoSessao: AlunoInfo = {
          nome: String(
            alunoData?.nome ?? alunoLogado!.nome ?? "Estudante"
          ),
          ra: String(
            alunoData?.ra ?? alunoData?.matricula ?? alunoLogado!.ra
          ),
          curso: String(
            alunoData?.curso ??
              alunoLogado!.curso ??
              "Tecnologia da Informação"
          ),
          turmaCodigo: String(
            alunoData?.turma ??
              alunoData?.turma_id ??
              alunoData?.turma_codigo ??
              ""
          ).trim(),
          semestreAtual: semestreAtualAluno,
          cargaHorariaTotal: cargaTotalAluno || CARGA_TOTAL_PADRAO,
        };
        setAluno(alunoSessao);

        if (!alunoSessao.ra) {
          setDisciplinas([]);
          setIsLoadingAi(false);
          return;
        }

        const disciplinasColetadas: DisciplinaGrade[] = [];
        const statusPorTurmaId = new Map<string, string>();

        // 2) Matrículas via notas → turmas (id)
        const { data: notasData, error: notasError } = await supabase
          .from("notas")
          .select("id, status, turma")
          .eq("ra_aluno", alunoSessao.ra);

        if (notasError) {
          console.warn("Erro ao buscar notas:", notasError.message);
        }

        const turmaIds = [
          ...new Set(
            (notasData ?? [])
              .map((n) => String(n.turma ?? "").trim())
              .filter(Boolean)
          ),
        ];

        for (const n of notasData ?? []) {
          const tid = String(n.turma ?? "").trim();
          if (tid) {
            statusPorTurmaId.set(tid, String(n.status ?? ""));
          }
        }

        if (turmaIds.length > 0) {
          const { data: turmasPorId, error: turmasIdError } = await supabase
            .from("turmas")
            .select(SELECT_TURMA_COM_PROFESSOR)
            .in("id", turmaIds);

          if (turmasIdError) {
            console.warn(
              "Erro ao buscar turmas por id:",
              turmasIdError.message
            );
          } else {
            for (const t of turmasPorId ?? []) {
              const row = t as Record<string, unknown>;
              const id = String(row.id ?? "");
              disciplinasColetadas.push(
                mapTurmaParaDisciplina(
                  row,
                  statusPorTurmaId.get(id) ?? null,
                  semestreAtualAluno
                )
              );
            }
          }
        }

        // 3) Vínculo por codigo da turma do aluno (alunos.turma / turma_id)
        if (alunoSessao.turmaCodigo) {
          let turmaEncontrada: Record<string, unknown>[] = [];

          const { data: porCodigo, error: errCodigo } = await supabase
            .from("turmas")
            .select(SELECT_TURMA_COM_PROFESSOR)
            .eq("codigo", alunoSessao.turmaCodigo);

          if (errCodigo) {
            console.warn(
              "Erro ao buscar turma por codigo:",
              errCodigo.message
            );
          } else {
            turmaEncontrada = (porCodigo ?? []) as Record<string, unknown>[];
          }

          if (turmaEncontrada.length === 0) {
            const { data: porId, error: errId } = await supabase
              .from("turmas")
              .select(SELECT_TURMA_COM_PROFESSOR)
              .eq("id", alunoSessao.turmaCodigo);

            if (errId) {
              console.warn("Erro ao buscar turma por id:", errId.message);
            } else {
              turmaEncontrada = (porId ?? []) as Record<string, unknown>[];
            }
          }

          if (turmaEncontrada.length > 0) {
            for (const row of turmaEncontrada) {
              const id = String(row.id ?? "");
              disciplinasColetadas.push(
                mapTurmaParaDisciplina(
                  row,
                  statusPorTurmaId.get(id) ?? "cursando",
                  semestreAtualAluno
                )
              );
            }
          } else {
            // Fallback: o campo turma no aluno pode ser o nome da disciplina
            disciplinasColetadas.push({
              id: `aluno-turma-${alunoSessao.turmaCodigo}`,
              nome: alunoSessao.turmaCodigo,
              professor: alunoData?.professor
                ? String(alunoData.professor)
                : null,
              cargaHoraria: toCargaHoraria(alunoData?.carga_horaria),
              semestre: semestreAtualAluno,
              status: "cursando",
            });
          }
        }

        // 4) Grade do curso (todas as matérias com semestre e carga)
        if (alunoSessao.curso) {
          const { data: turmasCurso, error: turmasCursoError } = await supabase
            .from("turmas")
            .select(SELECT_TURMA_COM_PROFESSOR)
            .ilike("curso", `%${alunoSessao.curso}%`);

          if (turmasCursoError) {
            console.warn(
              "Erro ao buscar turmas do curso:",
              turmasCursoError.message
            );
          } else {
            const jaTemMatriculas = disciplinasColetadas.length > 0;
            for (const t of turmasCurso ?? []) {
              const row = t as Record<string, unknown>;
              const id = String(row.id ?? "");
              const temSemestre =
                row.semestre != null ||
                row.semestre_atual != null ||
                row.Semestre != null;

              // Sem semestre no catálogo: só inclui se ainda não há matrículas
              if (!temSemestre && jaTemMatriculas) continue;

              disciplinasColetadas.push(
                mapTurmaParaDisciplina(
                  row,
                  statusPorTurmaId.get(id) ?? null,
                  temSemestre ? undefined : semestreAtualAluno
                )
              );
            }
          }
        }

        // 5) Linhas extras do boletim (mesmo RA, turma = disciplina)
        if (rows.length > 1) {
          for (const row of rows) {
            const nomeTurma = String(row.turma ?? "").trim();
            if (!nomeTurma) continue;
            disciplinasColetadas.push({
              id: String(row.id ?? `boletim-${nomeTurma}`),
              nome: nomeTurma,
              professor: row.professor != null ? String(row.professor) : null,
              cargaHoraria: toCargaHoraria(row.carga_horaria),
              semestre: extrairNumeroSemestre(
                row.semestre_atual ?? row.semestre ?? semestreAtualAluno
              ),
              status: "cursando",
            });
          }
        }

        const grade = deduplicarDisciplinas(disciplinasColetadas);
        setDisciplinas(grade);

        // Atualiza carga total dinâmica se o aluno não tiver valor cadastrado
        if (!cargaTotalAluno && grade.length > 0) {
          const totalGrade = grade.reduce((acc, d) => acc + d.cargaHoraria, 0);
          if (totalGrade > 0) {
            setAluno((prev) =>
              prev
                ? { ...prev, cargaHorariaTotal: totalGrade }
                : prev
            );
          }
        }

        const nomesEmAndamento = grade
          .filter(
            (d) =>
              isStatusEmAndamento(d.status) ||
              d.semestre === semestreAtualAluno
          )
          .map((d) => d.nome);

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
                <AlunoAvatar
                  nome={aluno?.nome || alunoLogado?.nome || "Estudante"}
                  fotoUrl={alunoLogado?.foto_url}
                  className="w-10 h-10 text-base"
                  fallback="—"
                />
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
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
                  Em Andamento
                </p>
                <p className="text-lg font-semibold mt-1">
                  {carregando
                    ? "…"
                    : `${horasEmAndamento.toLocaleString("pt-BR")}h`}
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
                  Carga Total
                </p>
                <p className="text-lg font-semibold mt-1">
                  {carregando
                    ? "…"
                    : `${horasTotais.toLocaleString("pt-BR")}h`}
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
                    const carga = disciplina.cargaHoraria;
                    const creditos = Math.round(carga / 20);
                    return (
                      <div
                        key={disciplina.id}
                        className="px-6 py-4 hover:bg-zinc-900/50 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <p className="text-sm font-medium text-white">
                            {disciplina.nome}
                          </p>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-950/60 text-blue-400 border border-blue-800 whitespace-nowrap">
                            Em andamento
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500">
                          Carga Horária: {carga}h | Créditos: {creditos}
                          {disciplina.professor
                            ? ` | Prof. ${disciplina.professor}`
                            : ""}
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
                    {horasCursadas > 0
                      ? ` · ${horasCursadas.toLocaleString("pt-BR")}h`
                      : ""}
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
                      {futuras.length > 0
                        ? `${futuras.length} disciplinas · `
                        : ""}
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
