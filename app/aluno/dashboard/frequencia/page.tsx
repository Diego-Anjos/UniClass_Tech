"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  ClipboardList,
  CalendarCheck,
  BookOpen,
  Map,
  LogOut,
  Camera,
  Sparkles,
  GraduationCap,
  MessageSquare,
  Check,
  AlertTriangle,
  Settings,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral", href: "/aluno/dashboard", active: false },
  { icon: ClipboardList, label: "Boletim e Notas", href: "/aluno/dashboard/notas", active: false },
  { icon: CalendarCheck, label: "Frequência", href: "/aluno/dashboard/frequencia", active: true },
  { icon: BookOpen, label: "Grade e Matérias", href: "/aluno/dashboard/grade", active: false },
  { icon: Map, label: "Mapa de Salas e Labs", href: "/aluno/dashboard/mapa", active: false },
  { icon: MessageSquare, label: "Contato", href: "/aluno/dashboard/contato", active: false },
];

type AlunoInfo = {
  nome: string;
  ra: string;
};

type FrequenciaItem = {
  id: string;
  disciplina: string;
  faltas: number;
  limite: number;
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

function estiloBarra(porcentagemUso: number) {
  if (porcentagemUso >= 75) {
    return {
      cardClasses: "border-orange-900/50 bg-orange-950/20",
      fillClasses: "bg-orange-500",
    };
  }
  if (porcentagemUso >= 50) {
    return {
      cardClasses: "border-amber-900/40 bg-amber-950/10",
      fillClasses: "bg-amber-500",
    };
  }
  return {
    cardClasses: "border-zinc-800 bg-zinc-950",
    fillClasses: "bg-emerald-500",
  };
}

export default function AlunoFrequenciaPage() {
  const [aluno, setAluno] = useState<AlunoInfo | null>(null);
  const [frequencias, setFrequencias] = useState<FrequenciaItem[]>([]);
  const [aiInsight, setAiInsight] = useState("");
  const [isLoadingAi, setIsLoadingAi] = useState(true);

  const totalDisciplinas = frequencias.length;

  const disciplinasEmRisco = useMemo(
    () => frequencias.filter((f) => f.limite > 0 && f.faltas / f.limite >= 0.75),
    [frequencias]
  );

  const presencaGlobal = useMemo(() => {
    if (totalDisciplinas === 0) return 100;
    return Math.round(
      frequencias.reduce(
        (acc, curr) =>
          acc +
          ((curr.limite - curr.faltas) / Math.max(curr.limite, 1)) * 100,
        0
      ) / totalDisciplinas
    );
  }, [frequencias, totalDisciplinas]);

  async function fetchAiFrequencia(
    alunoNome: string,
    presenca: number,
    emRisco: FrequenciaItem[]
  ) {
    setIsLoadingAi(true);
    try {
      const response = await fetch("/api/insights/aluno-frequencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alunoNome: alunoNome || "Estudante",
          presencaGlobal: presenca,
          disciplinasEmRisco: emRisco.map((d) => d.disciplina),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Falha na análise de frequência");
      }
      setAiInsight((data.insight as string) ?? "");
    } catch (err) {
      console.error("Erro ao gerar insight de frequência:", err);
      setAiInsight(
        "Sua frequência está sob controle. Continue participando das aulas para evitar acúmulo de faltas no fim do semestre."
      );
    } finally {
      setIsLoadingAi(false);
    }
  }

  useEffect(() => {
    async function carregarFrequencia() {
      const { data: alunoData, error: alunoError } = await supabase
        .from("alunos")
        .select("*")
        .limit(1)
        .maybeSingle();

      let alunoNome = "Estudante";
      if (alunoError || !alunoData) {
        if (alunoError) {
          console.error("Erro ao buscar aluno:", alunoError.message);
        }
        setAluno(null);
      } else {
        const info: AlunoInfo = {
          nome: String(alunoData.nome ?? "Estudante"),
          ra: String(alunoData.ra || alunoData.matricula || "RA-0000"),
        };
        setAluno(info);
        alunoNome = info.nome;
      }

      const { data: turmasData, error: turmasError } = await supabase
        .from("turmas")
        .select("id, codigo, curso, turno");

      let lista: FrequenciaItem[] = [];
      if (turmasError) {
        console.error("Erro ao buscar turmas:", turmasError.message);
        setFrequencias([]);
        setIsLoadingAi(false);
        return;
      }

      if (turmasData && turmasData.length > 0) {
        lista = turmasData.map((turma) => ({
          id: String(turma.id),
          disciplina: String(turma.curso ?? "Disciplina"),
          faltas: 0,
          limite: 20,
        }));
        setFrequencias(lista);

        const emRisco = lista.filter(
          (f) => f.limite > 0 && f.faltas / f.limite >= 0.75
        );
        const presenca =
          lista.length === 0
            ? 100
            : Math.round(
                lista.reduce(
                  (acc, curr) =>
                    acc +
                    ((curr.limite - curr.faltas) / Math.max(curr.limite, 1)) *
                      100,
                  0
                ) / lista.length
              );

        await fetchAiFrequencia(alunoNome, presenca, emRisco);
      } else {
        setFrequencias([]);
        setIsLoadingAi(false);
        setAiInsight(
          "Nenhuma disciplina vinculada ainda. Assim que houver turmas, o acompanhamento de frequência será exibido aqui."
        );
      }
    }

    void carregarFrequencia();
  }, []);

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
            <a
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
            </a>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-2 py-4 border-t border-zinc-800">
          <a
            href="/"
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
                Frequência e Presença
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                Acompanhe seu limite de faltas para evitar reprovação (limite de
                25%).
              </p>
            </div>
          </div>

          {/* ── AI Insight Card (Alerta de Risco) ── */}
          <div className="flex items-start gap-4 p-5 rounded-xl bg-zinc-900/50 border border-orange-900/50 mb-8">
            <div className="shrink-0 mt-0.5 w-8 h-8 rounded-lg bg-zinc-800 border border-orange-900/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-orange-200" />
            </div>
            <div>
              <p className="text-xs font-semibold text-orange-200 uppercase tracking-widest mb-1">
                Alerta de Risco
              </p>
              <p
                className={`text-sm text-zinc-300 leading-relaxed ${
                  isLoadingAi ? "animate-pulse" : ""
                }`}
              >
                {isLoadingAi
                  ? "Calculando projeções de faltas..."
                  : aiInsight}
              </p>
            </div>
          </div>

          {/* ── Cards de Resumo (Grid 2 colunas) ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="p-6 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-500 uppercase tracking-widest">
                  Presença Global
                </p>
                <Check className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-4xl font-semibold tracking-tight">
                {presencaGlobal}%
              </p>
            </div>

            <div className="p-6 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-500 uppercase tracking-widest">
                  Disciplinas em Risco
                </p>
                <AlertTriangle className="w-4 h-4 text-orange-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-semibold tracking-tight">
                  {disciplinasEmRisco.length}
                </p>
                <span className="text-sm text-zinc-400">
                  {disciplinasEmRisco.length === 1
                    ? "disciplina"
                    : "disciplinas"}
                </span>
              </div>
            </div>
          </div>

          {/* ── Detalhamento por Disciplina ── */}
          <div className="flex flex-col gap-4">
            {frequencias.length === 0 ? (
              <div className="p-8 rounded-xl border border-zinc-800 bg-zinc-950 text-center">
                <p className="text-sm text-zinc-500">
                  Nenhuma disciplina vinculada para acompanhamento de
                  frequência.
                </p>
              </div>
            ) : (
              frequencias.map((item) => {
                const porcentagemUso = Math.min(
                  Math.round((item.faltas / item.limite) * 100),
                  100
                );
                const estilo = estiloBarra(porcentagemUso);

                return (
                  <div
                    key={item.id}
                    className={`p-5 rounded-xl border ${estilo.cardClasses}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">
                          {item.disciplina}
                        </p>
                        <p className="text-xs text-zinc-400 mt-1">
                          Faltas: {item.faltas} / Limite: {item.limite}
                        </p>
                      </div>
                      <span className="text-xs text-zinc-500 whitespace-nowrap">
                        {porcentagemUso}%
                      </span>
                    </div>

                    <div className="mt-4 w-full h-2 rounded-full overflow-hidden bg-zinc-800">
                      <div
                        className={`${estilo.fillClasses} h-full rounded-full transition-all`}
                        style={{ width: `${porcentagemUso}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
