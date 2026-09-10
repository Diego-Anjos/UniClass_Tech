"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  ClipboardList,
  CalendarCheck,
  BookOpen,
  Map,
  LogOut,
  Camera,
  Download,
  Sparkles,
  GraduationCap,
  MessageSquare,
  Settings,
  ChevronDown,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ModalFeedback } from "@/components/ModalFeedback";
import {
  limparSessaoAluno,
  useAlunoSession,
} from "@/lib/aluno-session";

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral",         href: "/aluno/dashboard",        active: false },
  { icon: ClipboardList,   label: "Boletim e Notas",     href: "/aluno/dashboard/notas",  active: true  },
  { icon: CalendarCheck,   label: "Frequência",           href: "/aluno/dashboard/frequencia",                       active: false },
  { icon: BookOpen,        label: "Grade e Matérias",     href: "/aluno/dashboard/grade",                       active: false },
  { icon: Map,             label: "Mapa de Salas e Labs", href: "/aluno/dashboard/mapa",                       active: false },
  { icon: MessageSquare,   label: "Contato",              href: "/aluno/dashboard/contato",    active: false },
];

type AlunoInfo = {
  nome: string;
  ra: string;
  curso: string;
  professor?: string;
};

type Criterios = {
  ativ1: number;
  ativ2: number;
  ativ3: number;
  ativ4: number;
  prova: number;
};

type DatasAvaliacoes = {
  ativ1: string;
  ativ2: string;
  ativ3: string;
  ativ4: string;
  prova: string;
};

type BoletimItem = {
  id: string;
  turmaId: string;
  disciplina: string;
  professor: string;
  mediaParcial: number | null;
  faltasPct: number;
  status: string;
  ativ1: number | null;
  ativ2: number | null;
  ativ3: number | null;
  ativ4: number | null;
  prova: number | null;
  criterios: Criterios;
  datas: DatasAvaliacoes;
};

const CRITERIOS_PADRAO: Criterios = {
  ativ1: 1,
  ativ2: 1,
  ativ3: 1,
  ativ4: 1,
  prova: 6,
};

const DATAS_PADRAO: DatasAvaliacoes = {
  ativ1: "",
  ativ2: "",
  ativ3: "",
  ativ4: "",
  prova: "",
};

const COMPOSICAO = [
  { key: "ativ1" as const, label: "Atividade 1", criterioKey: "ativ1" as const },
  { key: "ativ2" as const, label: "Atividade 2", criterioKey: "ativ2" as const },
  { key: "ativ3" as const, label: "Atividade 3", criterioKey: "ativ3" as const },
  { key: "ativ4" as const, label: "Atividade 4", criterioKey: "ativ4" as const },
  { key: "prova" as const, label: "Prova Semestral", criterioKey: "prova" as const },
];

function statusBadgeClasses(status: string) {
  const s = status.toLowerCase();
  if (s === "aprovado") return "bg-emerald-900 text-emerald-300";
  if (s === "reprovado") return "bg-red-900 text-red-300";
  return "bg-gray-800 text-gray-300";
}

function statusLabel(status: string) {
  const s = status.trim();
  if (!s || s.toLowerCase() === "pendente") return "Pendente";
  if (s.toLowerCase() === "exame final") return "Cursando";
  return s;
}

function fmtNota(val: number | null) {
  if (val === null || Number.isNaN(val)) {
    return <span className="text-zinc-600">—</span>;
  }
  return val.toFixed(1);
}

function formatarData(iso: string) {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.split("-");
  if (!mes || !dia) return iso;
  return `${dia}/${mes}${ano ? `/${ano}` : ""}`;
}

function toNum(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  const n = Number(val);
  return Number.isNaN(n) ? null : n;
}

function normalizarCriterios(raw: unknown): Criterios {
  if (!raw || typeof raw !== "object") return { ...CRITERIOS_PADRAO };
  const c = raw as Partial<Record<keyof Criterios, unknown>>;
  const ativ1 = Number(c.ativ1);
  const ativ2 = Number(c.ativ2);
  const ativ3 = Number(c.ativ3);
  const ativ4 = Number(c.ativ4);
  const prova = Number(c.prova);
  const temAlgum = [ativ1, ativ2, ativ3, ativ4, prova].some((v) => !Number.isNaN(v));
  if (!temAlgum) return { ...CRITERIOS_PADRAO };
  return {
    ativ1: Number.isNaN(ativ1) ? CRITERIOS_PADRAO.ativ1 : ativ1,
    ativ2: Number.isNaN(ativ2) ? CRITERIOS_PADRAO.ativ2 : ativ2,
    ativ3: Number.isNaN(ativ3) ? CRITERIOS_PADRAO.ativ3 : ativ3,
    ativ4: Number.isNaN(ativ4) ? CRITERIOS_PADRAO.ativ4 : ativ4,
    prova: Number.isNaN(prova) ? CRITERIOS_PADRAO.prova : prova,
  };
}

function normalizarDatas(raw: unknown): DatasAvaliacoes {
  if (!raw || typeof raw !== "object") return { ...DATAS_PADRAO };
  const d = raw as Partial<Record<keyof DatasAvaliacoes, unknown>>;
  return {
    ativ1: typeof d.ativ1 === "string" ? d.ativ1 : "",
    ativ2: typeof d.ativ2 === "string" ? d.ativ2 : "",
    ativ3: typeof d.ativ3 === "string" ? d.ativ3 : "",
    ativ4: typeof d.ativ4 === "string" ? d.ativ4 : "",
    prova: typeof d.prova === "string" ? d.prova : "",
  };
}

function calcularFaltasPct(
  registros: { turma: string; status: string }[],
  turmaId: string
) {
  const daTurma = registros.filter((r) => r.turma === turmaId);
  if (daTurma.length === 0) return 0;
  const faltas = daTurma.filter((r) => {
    const s = r.status.toLowerCase();
    return s === "falta" || s === "ausente" || s === "absent";
  }).length;
  return Math.round((faltas / daTurma.length) * 100);
}

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

export default function AlunoNotasPage() {
  const { alunoLogado, carregandoSessao } = useAlunoSession();
  const [aluno, setAluno] = useState<AlunoInfo | null>(null);
  const [boletim, setBoletim] = useState<BoletimItem[]>([]);
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [semestreSelecionado, setSemestreSelecionado] = useState(
    "4º Semestre (Atual)"
  );
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

  async function fetchAiBoletimInsight(
    alunoNome: string,
    lista: BoletimItem[]
  ) {
    setIsLoadingAi(true);
    try {
      const pendentes = lista
        .filter((d) => {
          const s = d.status.toLowerCase();
          return (
            s === "cursando" ||
            s === "pendente" ||
            s === "exame final" ||
            d.mediaParcial === null
          );
        })
        .map((d) => d.disciplina)
        .join(", ");

      const response = await fetch("/api/insights/boletim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alunoNome: alunoNome || "Estudante",
          totalDisciplinas: lista.length,
          disciplinasPendentes:
            pendentes ||
            (lista.length > 0
              ? lista.map((d) => d.disciplina).join(", ")
              : "nenhuma disciplina cadastrada"),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha na análise do boletim");
      setAiInsight((data.insight as string) ?? "");
    } catch (err) {
      console.error("Erro ao gerar insight do boletim:", err);
      setAiInsight(
        "Mantenha uma rotina diária de revisão para as disciplinas em andamento. Foque nas matérias com entregas práticas pendentes."
      );
    } finally {
      setIsLoadingAi(false);
    }
  }

  useEffect(() => {
    if (carregandoSessao || !alunoLogado) return;

    async function carregarBoletim() {
      setCarregando(true);

      try {
        // 1) Aluno logado (RA)
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
          });
          setBoletim([]);
          setIsLoadingAi(false);
          return;
        }

        const alunoSessao: AlunoInfo = {
          nome: String(alunoData.nome ?? alunoLogado!.nome ?? "Estudante"),
          ra: String(alunoData.ra || alunoData.matricula || alunoLogado!.ra),
          curso: String(
            alunoData.curso || alunoLogado!.curso || "Tecnologia da Informação"
          ),
          professor: alunoData.professor
            ? String(alunoData.professor)
            : undefined,
        };
        setAluno(alunoSessao);

        if (!alunoSessao.ra) {
          setBoletim([]);
          setIsLoadingAi(false);
          return;
        }

        // 2) Notas + detalhes da turma
        let notasRows: Record<string, unknown>[] = [];

        const { data: notasComJoin, error: notasJoinError } = await supabase
          .from("notas")
          .select(
            "*, turmas(curso, professor, criterios_notas, datas_avaliacoes)"
          )
          .eq("ra_aluno", alunoSessao.ra);

        if (notasJoinError) {
          console.warn(
            "Join notas→turmas falhou, buscando em separado:",
            notasJoinError.message
          );

          const { data: notasSimples, error: notasError } = await supabase
            .from("notas")
            .select("*")
            .eq("ra_aluno", alunoSessao.ra);

          if (notasError) {
            console.error("Erro ao buscar notas:", notasError.message);
            setBoletim([]);
            await fetchAiBoletimInsight(alunoSessao.nome, []);
            return;
          }

          notasRows = (notasSimples ?? []) as Record<string, unknown>[];

          const turmaIds = [
            ...new Set(
              notasRows
                .map((n) => String(n.turma ?? ""))
                .filter(Boolean)
            ),
          ];

          if (turmaIds.length > 0) {
            const { data: turmasData } = await supabase
              .from("turmas")
              .select(
                "id, curso, professor, criterios_notas, datas_avaliacoes"
              )
              .in("id", turmaIds);

            const mapaTurmas = new Map(
              (turmasData ?? []).map((t) => [String(t.id), t])
            );

            notasRows = notasRows.map((n) => ({
              ...n,
              turmas: mapaTurmas.get(String(n.turma ?? "")) ?? null,
            }));
          }
        } else {
          notasRows = (notasComJoin ?? []) as Record<string, unknown>[];
        }

        // 3) Faltas (schema real: registro_chamada)
        const { data: faltasData, error: faltasError } = await supabase
          .from("registro_chamada")
          .select("turma_curso, status")
          .eq("aluno_ra", alunoSessao.ra);

        if (faltasError) {
          console.error("Erro ao buscar faltas:", faltasError.message);
        }

        const registrosFaltas = (faltasData ?? []).map((r) => ({
          turma: String(r.turma_curso ?? ""),
          status: String(r.status ?? ""),
        }));

        // 4) Combinar em boletim
        const lista: BoletimItem[] = notasRows.map((row, idx) => {
          const turmasRaw = row.turmas;
          const turmaObj =
            turmasRaw && typeof turmasRaw === "object" && !Array.isArray(turmasRaw)
              ? (turmasRaw as Record<string, unknown>)
              : Array.isArray(turmasRaw) && turmasRaw[0]
                ? (turmasRaw[0] as Record<string, unknown>)
                : null;

          const turmaId = String(row.turma ?? "");
          const disciplina =
            (typeof turmaObj?.curso === "string" && turmaObj.curso.trim()
              ? turmaObj.curso
              : null) || "Disciplina sem nome";
          const professor =
            (typeof turmaObj?.professor === "string" &&
            turmaObj.professor.trim()
              ? turmaObj.professor
              : null) || "Professor não atribuído";

          const mediaParcial =
            toNum(row.media_final) ??
            (() => {
              const vals = [
                toNum(row.ativ1),
                toNum(row.ativ2),
                toNum(row.ativ3),
                toNum(row.ativ4),
                toNum(row.prova),
              ].filter((v): v is number => v !== null);
              if (vals.length === 0) return null;
              return Number(
                vals.reduce((a, b) => a + b, 0).toFixed(1)
              );
            })();

          const statusRaw = String(row.status ?? "Pendente");

          return {
            id: String(row.id ?? `${turmaId}-${idx}`),
            turmaId,
            disciplina,
            professor,
            mediaParcial,
            faltasPct: calcularFaltasPct(registrosFaltas, turmaId),
            status: statusRaw,
            ativ1: toNum(row.ativ1),
            ativ2: toNum(row.ativ2),
            ativ3: toNum(row.ativ3),
            ativ4: toNum(row.ativ4),
            prova: toNum(row.prova),
            criterios: normalizarCriterios(turmaObj?.criterios_notas),
            datas: normalizarDatas(turmaObj?.datas_avaliacoes),
          };
        });

        setBoletim(lista);
        await fetchAiBoletimInsight(alunoSessao.nome, lista);
      } finally {
        setCarregando(false);
      }
    }

    void carregarBoletim();
  }, [alunoLogado, carregandoSessao]);

  function handleBaixarPdf() {
    setModalFeedback({
      aberto: true,
      tipo: "sucesso",
      titulo: "Solicitação Recebida",
      mensagem:
        "O download do seu Histórico Escolar oficial (PDF) será iniciado em instantes.",
    });
  }

  function fecharFeedback() {
    setModalFeedback((prev) => ({ ...prev, aberto: false }));
  }

  function toggleExpandido(id: string) {
    setExpandidoId((prev) => (prev === id ? null : id));
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
            <Link href="/aluno/dashboard/perfil" className="text-zinc-500 hover:text-white transition-colors shrink-0">
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
              <h1 className="text-2xl font-semibold tracking-tight">Boletim e Notas</h1>
              <p className="text-sm text-zinc-400 mt-1">
                Curso: {aluno?.curso || "Matrícula Pendente"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={semestreSelecionado}
                onChange={(e) => setSemestreSelecionado(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-zinc-600 transition-colors cursor-pointer"
              >
                <option>4º Semestre (Atual)</option>
                <option>3º Semestre</option>
                <option>2º Semestre</option>
                <option>1º Semestre</option>
              </select>
              <button
                type="button"
                onClick={handleBaixarPdf}
                className="flex items-center gap-2 border border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors text-sm rounded-lg px-4 py-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Baixar Histórico PDF
              </button>
            </div>
          </div>

          {/* ── AI Insight Card ── */}
          <div className="flex items-start gap-4 p-5 rounded-xl bg-zinc-900/50 border border-zinc-800 mb-8">
            <div className="shrink-0 mt-0.5 w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/50 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-zinc-300" />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">
                Insight da IA
              </p>
              <p
                className={`text-sm text-zinc-300 leading-relaxed ${
                  isLoadingAi ? "animate-pulse" : ""
                }`}
              >
                {isLoadingAi
                  ? "Avaliando desempenho acadêmico..."
                  : aiInsight}
              </p>
            </div>
          </div>

          {/* ── Tabela de Notas (linhas expansíveis) ── */}
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Notas do Semestre</h2>
              <span className="text-xs text-zinc-600">
                {carregando ? "…" : `${boletim.length} disciplinas`}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-zinc-500 uppercase bg-zinc-950 border-b border-zinc-800">
                    <th className="px-6 py-3 text-left font-medium tracking-wider w-8" />
                    <th className="px-4 py-3 text-left font-medium tracking-wider">Disciplina</th>
                    <th className="px-4 py-3 text-left font-medium tracking-wider">Professor</th>
                    <th className="px-4 py-3 text-center font-medium tracking-wider">Média Parcial</th>
                    <th className="px-4 py-3 text-center font-medium tracking-wider">Faltas (%)</th>
                    <th className="px-6 py-3 text-left font-medium tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {carregando ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-10 text-center text-sm text-zinc-500"
                      >
                        Carregando boletim...
                      </td>
                    </tr>
                  ) : boletim.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-10 text-center text-sm text-zinc-500"
                      >
                        Nenhuma disciplina ou nota lançada para este semestre.
                      </td>
                    </tr>
                  ) : (
                    boletim.map((item) => {
                      const aberto = expandidoId === item.id;
                      const label = statusLabel(item.status);
                      return (
                        <Fragment key={item.id}>
                          <tr
                            onClick={() => toggleExpandido(item.id)}
                            className={`cursor-pointer transition-colors border-b border-zinc-800/80 ${
                              aberto
                                ? "bg-zinc-900/60"
                                : "hover:bg-zinc-900/40"
                            }`}
                          >
                            <td className="pl-6 pr-2 py-4">
                              <ChevronDown
                                className={`w-4 h-4 text-zinc-500 transition-transform duration-200 ${
                                  aberto ? "rotate-180" : ""
                                }`}
                              />
                            </td>
                            <td className="px-4 py-4 font-medium text-white">
                              {item.disciplina}
                            </td>
                            <td className="px-4 py-4 text-zinc-400">
                              {item.professor}
                            </td>
                            <td className="px-4 py-4 text-center font-semibold text-white">
                              {fmtNota(item.mediaParcial)}
                            </td>
                            <td className="px-4 py-4 text-center text-zinc-400">
                              {item.faltasPct}%
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${statusBadgeClasses(
                                  label
                                )}`}
                              >
                                {label}
                              </span>
                            </td>
                          </tr>
                          {aberto && (
                            <tr className="border-b border-zinc-800">
                              <td colSpan={6} className="p-0">
                                <div className="bg-[#13151a] p-4 rounded-b-lg mx-2 mb-2">
                                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                                    Composição da nota
                                  </p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                                    {COMPOSICAO.map(
                                      ({ key, label: itemLabel, criterioKey }) => {
                                        const tirada = item[key];
                                        const maximo =
                                          item.criterios[criterioKey];
                                        const data =
                                          item.datas[criterioKey];
                                        return (
                                          <div
                                            key={key}
                                            className="rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-3 py-3"
                                          >
                                            <p className="text-xs text-zinc-500 mb-1.5">
                                              {itemLabel}
                                            </p>
                                            <p className="text-sm font-medium text-white">
                                              {tirada !== null
                                                ? tirada.toFixed(1)
                                                : "—"}
                                              <span className="text-zinc-600 font-normal">
                                                {" "}
                                                / {maximo}
                                              </span>
                                            </p>
                                            <p className="text-[11px] text-zinc-600 mt-1.5">
                                              Data: {formatarData(data)}
                                            </p>
                                          </div>
                                        );
                                      }
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
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
