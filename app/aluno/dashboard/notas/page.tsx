"use client";

import { Fragment, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  LayoutDashboard,
  ClipboardList,
  CalendarCheck,
  CalendarDays,
  BookOpen,
  Map,
  LogOut,
  Camera,
  Sparkles,
  GraduationCap,
  MessageSquare,
  Settings,
  ChevronDown,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { AlunoAvatar } from "@/components/aluno/aluno-avatar";
import {
  limparSessaoAluno,
  useAlunoSession,
} from "@/lib/aluno-session";
import { PESOS_AVALIACAO_PADRAO } from "@/lib/professor-session";
import { nomeProfessorDoJoin } from "@/lib/professor-relacao";

const BoletimDownloadButton = dynamic(
  () =>
    import("@/components/pdf/BoletimDownloadButton").then(
      (mod) => mod.BoletimDownloadButton
    ),
  {
    ssr: false,
    loading: () => <Button disabled>Carregando gerador...</Button>,
  }
);

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral",         href: "/aluno/dashboard",        active: false },
  { icon: ClipboardList,   label: "Boletim e Notas",     href: "/aluno/dashboard/notas",  active: true  },
  { icon: CalendarDays,    label: "Meu Calendário",       href: "/aluno/dashboard/calendario",                      active: false },
  { icon: CalendarCheck,   label: "Frequência",           href: "/aluno/dashboard/frequencia",                       active: false },
  { icon: BookOpen,        label: "Grade e Matérias",     href: "/aluno/dashboard/grade",                       active: false },
  { icon: Map,             label: "Mapa de Salas e Labs", href: "/aluno/dashboard/mapa",                       active: false },
  { icon: MessageSquare,   label: "Contato",              href: "/aluno/dashboard/contato",    active: false },
];

type AlunoInfo = {
  nome: string;
  ra: string;
  curso: string;
  turma?: string;
  professor?: string;
};

type NotaBoletim = {
  disciplina: string;
  professor: string;
  n1: number;
  /** Ausente no schema atual de `alunos` — null até existir lançamento. */
  n2: number | null;
  n3: number | null;
  faltas: number;
  atv1: number;
  atv2: number;
  atv3: number;
  atv4: number;
  prova: number;
};

function toNotaNum(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Lê nota opcional: null se a coluna não veio no payload. */
function lerNotaOpcional(
  row: Record<string, unknown>,
  campo: string
): number | null {
  if (!(campo in row) || row[campo] == null || row[campo] === "") {
    return null;
  }
  const n = Number(row[campo]);
  return Number.isFinite(n) ? n : null;
}

function mapLinhaNotas(row: Record<string, unknown>): NotaBoletim {
  const atv1 = toNotaNum(row.atv1);
  const atv2 = toNotaNum(row.atv2);
  const atv3 = toNotaNum(row.atv3);
  const atv4 = toNotaNum(row.atv4);
  const prova = toNotaNum(row.prova);

  const n1Db = lerNotaOpcional(row, "n1");
  const n1 =
    n1Db != null && n1Db > 0
      ? n1Db
      : atv1 + atv2 + atv3 + atv4 + prova || n1Db || 0;

  return {
    disciplina: String(
      row.disciplina ?? row.turma ?? row.curso ?? "Disciplina"
    ).trim() || "Disciplina",
    professor: String(row.professor ?? "—"),
    n1,
    n2: lerNotaOpcional(row, "n2"),
    n3: lerNotaOpcional(row, "n3"),
    faltas: toNotaNum(row.faltas),
    atv1,
    atv2,
    atv3,
    atv4,
    prova,
  };
}

function statusBadgeClasses(status: string) {
  const s = status.toLowerCase();
  if (s === "aprovado") return "bg-emerald-900 text-emerald-300";
  if (s === "reprovado" || s === "em risco") return "bg-red-900 text-red-300";
  return "bg-gray-800 text-gray-300";
}

/** Média parcial só com notas já lançadas (N1 obrigatória; N2/N3 se existirem). */
function mediaParcial(n1: number, n2: number | null, n3: number | null): number {
  const vals = [n1, n2, n3].filter(
    (v): v is number => v != null && Number.isFinite(v)
  );
  if (vals.length === 0) return 0;
  return vals.reduce((acc, v) => acc + v, 0) / vals.length;
}

function statusPorMedia(media: number) {
  if (media >= 7) return "Cursando";
  if (media >= 6) return "Pendente";
  return "Em risco";
}

function fmtNota(val: number | null) {
  if (val === null || Number.isNaN(val)) {
    return <span className="text-zinc-600">—</span>;
  }
  return val.toFixed(1);
}

function formatarSemestreLabel(valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") {
    return "Semestre atual";
  }
  const texto = String(valor).trim();
  if (/semestre/i.test(texto)) return texto;
  return `${texto}º Semestre (Atual)`;
}

function composicaoN1De(item: NotaBoletim) {
  const pesos = PESOS_AVALIACAO_PADRAO;
  return [
    { label: "Atividade 1", peso: pesos.atv1, nota: item.atv1 },
    { label: "Atividade 2", peso: pesos.atv2, nota: item.atv2 },
    { label: "Atividade 3", peso: pesos.atv3, nota: item.atv3 },
    { label: "Atividade 4", peso: pesos.atv4, nota: item.atv4 },
    { label: "Prova Semestral", peso: pesos.prova, nota: item.prova },
  ];
}

export default function AlunoNotasPage() {
  const { alunoLogado, carregandoSessao } = useAlunoSession();
  const [aluno, setAluno] = useState<AlunoInfo | null>(null);
  const [dadosNotas, setDadosNotas] = useState<NotaBoletim[]>([]);
  const [linhaExpandida, setLinhaExpandida] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [semestreSelecionado, setSemestreSelecionado] = useState(
    "Semestre atual"
  );
  const [insightIA, setInsightIA] = useState("");
  const [loadingIA, setLoadingIA] = useState(true);

  useEffect(() => {
    if (carregandoSessao || !alunoLogado?.ra) return;

    let cancelado = false;

    async function carregarBoletim() {
      setCarregando(true);
      const ra = alunoLogado!.ra;

      // Perfil do aluno (dados cadastrais)
      const { data: alunosRows, error: alunoError } = await supabase
        .from("alunos")
        .select("nome, ra, curso, professor, turma, semestre_atual")
        .eq("ra", ra);

      if (cancelado) return;

      if (alunoError) {
        console.error("Erro ao buscar aluno:", alunoError.message);
        toast.error("Não foi possível carregar o boletim.");
        setAluno({
          nome: alunoLogado!.nome,
          ra,
          curso: alunoLogado!.curso || "Tecnologia da Informação",
        });
        setDadosNotas([]);
        setCarregando(false);
        return;
      }

      const primeiro = (alunosRows ?? [])[0] as
        | Record<string, unknown>
        | undefined;

      if (!primeiro) {
        setAluno({
          nome: alunoLogado!.nome,
          ra,
          curso: alunoLogado!.curso || "Tecnologia da Informação",
        });
        setDadosNotas([]);
        setCarregando(false);
        return;
      }

      setAluno({
        nome: String(primeiro.nome ?? alunoLogado!.nome ?? "Estudante"),
        ra: String(primeiro.ra || ra),
        curso: String(
          primeiro.curso || alunoLogado!.curso || "Tecnologia da Informação"
        ),
        turma: primeiro.turma ? String(primeiro.turma) : undefined,
        professor: primeiro.professor
          ? String(primeiro.professor)
          : undefined,
      });

      const semestre =
        primeiro.semestre_atual ?? alunoLogado!.semestreAtual ?? "";
      setSemestreSelecionado(formatarSemestreLabel(semestre));

      // Notas reais por disciplina (tabela `notas` + vínculo com turmas)
      let linhas: NotaBoletim[] = [];
      const { data: notasData, error: notasError } = await supabase
        .from("notas")
        .select(
          "n1, n2, n3, media_final, faltas, turma, turmas(codigo, curso, professor_id, professores!professor_id(nome))"
        )
        .eq("ra_aluno", ra);

      if (cancelado) return;

      if (notasError) {
        console.warn(
          "Erro ao buscar notas com join (tentando select simples):",
          notasError.message
        );
        const simples = await supabase
          .from("notas")
          .select("n1, n2, n3, media_final, faltas, turma")
          .eq("ra_aluno", ra);

        if (simples.error) {
          console.warn(
            "Erro ao buscar notas (fallback alunos):",
            simples.error.message
          );
        } else {
          linhas = (simples.data ?? []).map((row) =>
            mapLinhaNotas(row as Record<string, unknown>)
          );
        }
      } else {
        linhas = (notasData ?? []).map((row) => {
          const raw = row as Record<string, unknown>;
          const turmasRel = raw.turmas as Record<string, unknown> | null;
          return mapLinhaNotas({
            ...raw,
            disciplina:
              turmasRel?.curso ??
              turmasRel?.codigo ??
              raw.turma ??
              "Disciplina",
            professor: nomeProfessorDoJoin(turmasRel) || "—",
          });
        });
      }

      // Fallback: se não houver linhas em `notas`, usa campos reais da ficha do aluno
      // Schema atual de `alunos`: atv1–atv4, prova, n1, faltas (sem n2/n3)
      if (linhas.length === 0) {
        const { data: fichaNotas, error: fichaError } = await supabase
          .from("alunos")
          .select(
            "nome, ra, curso, professor, turma, atv1, atv2, atv3, atv4, prova, n1, faltas"
          )
          .eq("ra", ra);

        if (fichaError) {
          console.error("Erro no fallback de notas:", fichaError.message);
        } else {
          linhas = (fichaNotas ?? []).map((row) =>
            mapLinhaNotas(row as Record<string, unknown>)
          );
        }
      }

      // Faltas agregadas da chamada, se a coluna em notas vier zerada
      const { data: chamadaRows, error: chamadaError } = await supabase
        .from("registro_chamada")
        .select("status")
        .eq("aluno_ra", ra);

      if (!chamadaError && chamadaRows && chamadaRows.length > 0) {
        const totalFaltas = chamadaRows.filter(
          (r) => String(r.status ?? "").toLowerCase() === "falta"
        ).length;
        if (linhas.length === 1 && linhas[0].faltas === 0 && totalFaltas > 0) {
          linhas = [{ ...linhas[0], faltas: totalFaltas }];
        }
      }

      setDadosNotas(linhas);
      setCarregando(false);
    }

    void carregarBoletim();
    return () => {
      cancelado = true;
    };
  }, [alunoLogado, carregandoSessao]);

  useEffect(() => {
    if (carregandoSessao || carregando) return;

    let cancelado = false;

    async function carregarInsightDesempenho() {
      setLoadingIA(true);
      try {
        const response = await fetch("/api/insights/desempenho", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            notas: dadosNotas,
            alunoNome: aluno?.nome || alunoLogado?.nome,
            curso: aluno?.curso || alunoLogado?.curso,
            semestre: semestreSelecionado || alunoLogado?.semestreAtual,
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Falha na análise de desempenho");
        }
        if (!cancelado) {
          setInsightIA((data.insight as string) ?? "");
        }
      } catch (err) {
        console.error("Erro ao gerar insight de desempenho:", err);
        if (!cancelado) {
          setInsightIA(
            "Seu desempenho mostra pontos fortes e oportunidades de evolução. Priorize as disciplinas com notas mais baixas e acompanhe as faltas de perto."
          );
        }
      } finally {
        if (!cancelado) setLoadingIA(false);
      }
    }

    void carregarInsightDesempenho();
    return () => {
      cancelado = true;
    };
  }, [dadosNotas, carregando, carregandoSessao]);

  function toggleLinhaExpandida(id: string) {
    setLinhaExpandida((prev) => (prev === id ? null : id));
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
                <option value={semestreSelecionado}>{semestreSelecionado}</option>
              </select>
              {aluno && (
                <BoletimDownloadButton
                  aluno={{
                    nome: aluno.nome,
                    ra: aluno.ra,
                    curso: aluno.curso,
                    turma: aluno.turma,
                  }}
                  notas={dadosNotas.map((n) => {
                    const media = mediaParcial(n.n1, n.n2, n.n3);
                    const composicao = composicaoN1De(n).map((c) => ({
                      label: c.label,
                      peso: c.peso,
                      nota: Number.isFinite(c.nota) ? c.nota : null,
                    }));
                    return {
                      disciplina: n.disciplina,
                      n1: n.n1 > 0 ? Number(n.n1.toFixed(1)) : null,
                      n2: n.n2 != null ? Number(n.n2.toFixed(1)) : null,
                      media: media > 0 ? Number(media.toFixed(1)) : null,
                      faltas: n.faltas,
                      composicao,
                    };
                  })}
                  className="w-auto"
                />
              )}
            </div>
          </div>

          {/* ── Insight IA + Desempenho Semestral ── */}
          <div className="mb-8 space-y-4">
            <div className="flex items-start gap-4 p-5 rounded-xl bg-gradient-to-br from-violet-950/40 via-zinc-900/80 to-zinc-950 border border-violet-500/20 shadow-[0_0_40px_rgba(139,92,246,0.08)]">
              <div className="shrink-0 mt-0.5 w-9 h-9 rounded-lg bg-violet-500/15 border border-violet-400/30 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-violet-300" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-violet-300/90 uppercase tracking-widest mb-2">
                  Feedback Inteligente
                </p>
                {loadingIA ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-3 rounded bg-zinc-800 w-full" />
                    <div className="h-3 rounded bg-zinc-800 w-5/6" />
                    <div className="h-3 rounded bg-zinc-800 w-2/3" />
                  </div>
                ) : (
                  <p className="text-sm text-zinc-200 leading-relaxed">
                    {insightIA}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-xl bg-[#0f1117] border border-zinc-800 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5">
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Desempenho Semestral
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Comparativo de N1 e N2 por disciplina
                  </p>
                </div>
                <div className="flex items-center gap-4 text-[11px] text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-sm bg-emerald-500" />
                    N1
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-sm bg-violet-500" />
                    N2
                  </span>
                </div>
              </div>
              {dadosNotas.length === 0 && !carregando ? (
                <p className="text-sm text-zinc-500 py-16 text-center">
                  Nenhuma nota lançada ainda.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dadosNotas}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#27272a"
                      vertical={false}
                    />
                    <XAxis dataKey="disciplina" stroke="#52525b" />
                    <YAxis stroke="#52525b" domain={[0, 10]} />
                    <Tooltip
                      cursor={{ fill: "#27272a" }}
                      contentStyle={{
                        backgroundColor: "#09090b",
                        borderColor: "#27272a",
                        color: "#fff",
                      }}
                    />
                    <Bar
                      dataKey="n1"
                      name="N1"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="n2"
                      name="N2"
                      fill="#8b5cf6"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* ── Tabela de Notas (linhas expansíveis) ── */}
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Notas do Semestre</h2>
              <span className="text-xs text-zinc-600">
                {carregando ? "…" : `${dadosNotas.length} disciplinas`}
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
                    <th className="px-4 py-3 text-center font-medium tracking-wider">Faltas</th>
                    <th className="px-6 py-3 text-left font-medium tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {carregandoSessao || carregando ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-10 text-center text-sm text-zinc-500"
                      >
                        Carregando boletim...
                      </td>
                    </tr>
                  ) : dadosNotas.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-10 text-center text-sm text-zinc-500"
                      >
                        Nenhuma nota encontrada para o seu RA.
                      </td>
                    </tr>
                  ) : (
                    dadosNotas.map((item, index) => {
                      const chave = `${item.disciplina}-${index}`;
                      const aberto = linhaExpandida === chave;
                      const media = mediaParcial(item.n1, item.n2, item.n3);
                      const label = statusPorMedia(media);
                      const composicao = composicaoN1De(item);
                      return (
                        <Fragment key={chave}>
                          <tr
                            onClick={() => toggleLinhaExpandida(chave)}
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
                              {fmtNota(media)}
                            </td>
                            <td className="px-4 py-4 text-center text-zinc-400">
                              {item.faltas}
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
                                <div className="bg-zinc-900/50 p-4 rounded-b-lg border-t border-zinc-800">
                                  <div className="flex items-start justify-between gap-4 mb-3">
                                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                      Composição da Nota
                                    </p>
                                    <p className="text-sm font-semibold text-emerald-400 shrink-0">
                                      Total N1: {item.n1.toFixed(1)}
                                    </p>
                                  </div>
                                  <div className="flex flex-col sm:flex-row gap-3 overflow-x-auto">
                                    {composicao.map((comp) => (
                                      <div
                                        key={comp.label}
                                        className="rounded-lg border border-zinc-800/80 bg-zinc-950/60 px-3 py-3 min-w-[140px] flex-1"
                                      >
                                        <p className="text-xs text-zinc-400 mb-1.5">
                                          {comp.label}
                                        </p>
                                        <p className="text-sm font-medium text-white">
                                          Peso {comp.peso.toFixed(1)}
                                        </p>
                                        <p className="text-xs text-zinc-500 mt-1">
                                          Nota {comp.nota.toFixed(1)}
                                        </p>
                                      </div>
                                    ))}
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

    </div>
  );
}
