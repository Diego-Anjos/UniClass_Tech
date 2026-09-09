"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  BookOpen,
  UserCheck,
  Sparkles,
  MessageSquare,
  LogOut,
  GraduationCap,
  ChevronDown,
  Send,
  UserRound,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { ProfessorSettingsControl } from "@/components/professor/config-modal";
import {
  iniciaisDoProfessor,
  limparSessaoProfessor,
  useProfessorSession,
} from "@/lib/professor-session";

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral",    href: "/professor/dashboard",           active: false },
  { icon: BookOpen,        label: "Turmas e Notas", href: "/professor/dashboard/notas",     active: false },
  { icon: UserCheck,       label: "Chamada Rápida", href: "/professor/dashboard/chamada",   active: false },
  { icon: Sparkles,        label: "Insights IA",    href: "/professor/dashboard/insights",  active: true  },
  { icon: MessageSquare,   label: "Mensagens",      href: "/professor/dashboard/mensagens",  active: false },
];

const anoAtual = new Date().getFullYear();
const anosDisponiveis = Array.from(
  { length: anoAtual - 2026 + 1 },
  (_, i) => 2026 + i
);

type AlunoInsight = {
  id: string;
  nome: string;
  ra: string;
  curso: string;
  semestre: number;
  professor: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ResumoEngajamento = {
  totalRegistros: number;
  presentes: number;
  faltas: number;
  taxaPresenca: number;
  fonte: "registro_chamada" | "mock";
  resumo: string;
};

type FiltrosMacro = {
  ano: string;
  semestre: string;
};

type DadoGraficoMacro = {
  mes: string;
  notaMedia: number;
  frequencia: number;
};

const MESES_1_SEMESTRE = ["Fev", "Mar", "Abr", "Mai", "Jun"] as const;
const MESES_2_SEMESTRE = ["Ago", "Set", "Out", "Nov", "Dez"] as const;

function gerarDadosGraficoMock(filtros: FiltrosMacro): DadoGraficoMacro[] {
  const meses =
    filtros.semestre === "2º Semestre" ? MESES_2_SEMESTRE : MESES_1_SEMESTRE;
  const seed = Number(filtros.ano) + (filtros.semestre.startsWith("2") ? 17 : 3);

  return meses.map((mes, index) => {
    const notaMedia = Number(
      (6.2 + ((seed + index * 7) % 28) / 10 - index * 0.05).toFixed(1)
    );
    const frequencia = Math.min(
      98,
      Math.max(68, 88 - index * 2 + ((seed + index * 5) % 9))
    );
    return { mes, notaMedia, frequencia };
  });
}

function iniciaisDoNome(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .join("");
}

function hashId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function mockEngajamento(aluno: AlunoInsight): ResumoEngajamento {
  const base = 8 + aluno.semestre * 2 + (hashId(aluno.id) % 12);
  const faltas = Math.min(35, Math.max(4, base));
  const taxaPresenca = Math.max(55, 100 - faltas);
  const presentes = Math.round((taxaPresenca / 100) * 20);
  const totalFaltas = 20 - presentes;

  let tom = "engajamento estável";
  if (faltas >= 25) tom = "alerta de frequência";
  else if (faltas >= 15) tom = "atenção moderada";

  return {
    totalRegistros: 20,
    presentes,
    faltas: totalFaltas,
    taxaPresenca,
    fonte: "mock",
    resumo: `Estimativa do ${aluno.semestre}º semestre: ${taxaPresenca}% de presença e ${tom} nas últimas aulas.`,
  };
}

function mensagemInicialIA(nomeAluno: string): ChatMessage {
  return {
    role: "assistant",
    content: `Olá, professor! Estou analisando o histórico de ${nomeAluno}. O que gostaria de saber sobre o desempenho dele(a)?`,
  };
}

export default function ProfessorInsightsPage() {
  const { professorLogado, carregandoSessao } = useProfessorSession();
  const [alunos, setAlunos] = useState<AlunoInsight[]>([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState<AlunoInsight | null>(
    null
  );
  const [resumoAluno, setResumoAluno] = useState<ResumoEngajamento | null>(null);
  const [carregandoAlunos, setCarregandoAlunos] = useState(true);
  const [carregandoResumo, setCarregandoResumo] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputChat, setInputChat] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [filtrosMacro, setFiltrosMacro] = useState<FiltrosMacro>({
    ano: anoAtual.toString(),
    semestre: "1º Semestre",
  });
  const [dadosGrafico, setDadosGrafico] = useState<DadoGraficoMacro[]>(() =>
    gerarDadosGraficoMock({
      ano: anoAtual.toString(),
      semestre: "1º Semestre",
    })
  );
  const [analiseMacroIA, setAnaliseMacroIA] = useState("");
  const [carregandoMacro, setCarregandoMacro] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const contextoAluno = useMemo(() => {
    if (!alunoSelecionado) {
      return "Nenhum aluno específico selecionado. Fale sobre a turma em geral.";
    }

    const resumo =
      resumoAluno?.resumo ??
      "Resumo de frequência ainda não disponível para este aluno.";

    return [
      `Nome: ${alunoSelecionado.nome}`,
      `RA: ${alunoSelecionado.ra}`,
      `Curso: ${alunoSelecionado.curso}`,
      `Semestre: ${alunoSelecionado.semestre}`,
      `Professor vinculado: ${alunoSelecionado.professor || "—"}`,
      `Engajamento/Frequência: ${resumo}`,
      resumoAluno
        ? `Métricas: ${resumoAluno.presentes} presentes, ${resumoAluno.faltas} faltas, ${resumoAluno.taxaPresenca}% de presença (${resumoAluno.fonte === "registro_chamada" ? "dados reais" : "estimativa"}).`
        : null,
    ]
      .filter(Boolean)
      .join("\n");
  }, [alunoSelecionado, resumoAluno]);

  useEffect(() => {
    if (!professorLogado) return;

    async function carregarAlunosDoProfessor() {
      setCarregandoAlunos(true);
      const vinculoProfessor = professorLogado!.nomeCompletoTitulo;
      const nomeProfessor = professorLogado!.nome;
      const areaAtuacao = professorLogado!.area_atuacao?.trim() ?? "";

      const [porTitulo, porNome, porCurso] = await Promise.all([
        supabase
          .from("alunos")
          .select("id, nome, ra, professor, curso, semestre")
          .eq("professor", vinculoProfessor)
          .order("nome", { ascending: true }),
        nomeProfessor
          ? supabase
              .from("alunos")
              .select("id, nome, ra, professor, curso, semestre")
              .eq("professor", nomeProfessor)
              .order("nome", { ascending: true })
          : Promise.resolve({ data: [], error: null }),
        areaAtuacao
          ? supabase
              .from("alunos")
              .select("id, nome, ra, professor, curso, semestre")
              .eq("curso", areaAtuacao)
              .order("nome", { ascending: true })
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (porTitulo.error) {
        console.error("Erro ao buscar alunos do professor:", porTitulo.error.message);
      }
      if ("error" in porNome && porNome.error) {
        console.error("Erro ao buscar alunos por nome:", porNome.error.message);
      }
      if ("error" in porCurso && porCurso.error) {
        console.error("Erro ao buscar alunos por curso:", porCurso.error.message);
      }

      const mapa = new Map<string, AlunoInsight>();
      for (const row of [
        ...(porTitulo.data ?? []),
        ...(porNome.data ?? []),
        ...(porCurso.data ?? []),
      ]) {
        const id = String(row.id);
        if (mapa.has(id)) continue;
        mapa.set(id, {
          id,
          nome: String(row.nome ?? ""),
          ra: String(
            row.ra ||
              (row as { matricula?: string }).matricula ||
              "RA-"
          ),
          curso: String(row.curso ?? "—"),
          semestre: Number(row.semestre ?? 1) || 1,
          professor: String(row.professor ?? ""),
        });
      }

      const lista = Array.from(mapa.values()).sort((a, b) =>
        a.nome.localeCompare(b.nome, "pt-BR")
      );
      setAlunos(lista);
      setCarregandoAlunos(false);
    }

    void carregarAlunosDoProfessor();
  }, [professorLogado]);

  useEffect(() => {
    if (!alunoSelecionado) {
      setResumoAluno(null);
      return;
    }

    let cancelado = false;

    async function carregarResumo() {
      setCarregandoResumo(true);
      const { data, error } = await supabase
        .from("registro_chamada")
        .select("status")
        .eq("aluno_ra", alunoSelecionado!.ra);

      if (cancelado) return;

      if (error) {
        console.error("Erro ao buscar registro_chamada:", error.message);
        setResumoAluno(mockEngajamento(alunoSelecionado!));
        setCarregandoResumo(false);
        return;
      }

      if (!data || data.length === 0) {
        setResumoAluno(mockEngajamento(alunoSelecionado!));
        setCarregandoResumo(false);
        return;
      }

      const presentes = data.filter(
        (r) => String(r.status ?? "").toLowerCase() === "presente"
      ).length;
      const faltas = data.filter(
        (r) => String(r.status ?? "").toLowerCase() === "falta"
      ).length;
      const total = data.length;
      const taxaPresenca = Math.round((presentes / (total || 1)) * 100);

      setResumoAluno({
        totalRegistros: total,
        presentes,
        faltas,
        taxaPresenca,
        fonte: "registro_chamada",
        resumo:
          taxaPresenca >= 85
            ? `Boa frequência: ${taxaPresenca}% de presença em ${total} registro(s) de chamada.`
            : taxaPresenca >= 70
              ? `Frequência moderada: ${taxaPresenca}% de presença, com ${faltas} falta(s) registradas.`
              : `Alerta de frequência: apenas ${taxaPresenca}% de presença e ${faltas} falta(s) em ${total} aula(s).`,
      });
      setCarregandoResumo(false);
    }

    void carregarResumo();
    return () => {
      cancelado = true;
    };
  }, [alunoSelecionado]);

  useEffect(() => {
    if (!alunoSelecionado) {
      setMessages([]);
      return;
    }
    setMessages([mensagemInicialIA(alunoSelecionado.nome)]);
    setInputChat("");
    setIsTyping(false);
  }, [alunoSelecionado?.id]);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isTyping]);

  useEffect(() => {
    if (!professorLogado) return;

    const dados = gerarDadosGraficoMock(filtrosMacro);
    setDadosGrafico(dados);

    let cancelado = false;

    async function carregarAnaliseMacro() {
      setCarregandoMacro(true);
      try {
        const mediaNotas =
          dados.reduce((acc, item) => acc + item.notaMedia, 0) /
          (dados.length || 1);
        const mediaFrequencia =
          dados.reduce((acc, item) => acc + item.frequencia, 0) /
          (dados.length || 1);

        const response = await fetch("/api/insights/turma", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            professor: professorLogado!.nomeCompletoTitulo,
            filtros: filtrosMacro,
            metricasGlobais: {
              serieMensal: dados,
              mediaNotas: Number(mediaNotas.toFixed(1)),
              mediaFrequencia: Math.round(mediaFrequencia),
              totalAlunos: alunos.length,
              area: professorLogado!.area_atuacao,
            },
          }),
        });

        const data = await response.json();
        if (cancelado) return;
        setAnaliseMacroIA(
          (data.analise as string) ||
            "Análise indisponível no momento."
        );
      } catch (err) {
        console.error("Erro na análise macro da turma:", err);
        if (!cancelado) {
          setAnaliseMacroIA(
            "Não foi possível gerar a análise macro da turma neste momento."
          );
        }
      } finally {
        if (!cancelado) setCarregandoMacro(false);
      }
    }

    void carregarAnaliseMacro();
    return () => {
      cancelado = true;
    };
  }, [filtrosMacro, professorLogado, alunos.length]);

  function handleSelecionarAluno(alunoId: string) {
    if (!alunoId) {
      setAlunoSelecionado(null);
      return;
    }
    const aluno = alunos.find((a) => a.id === alunoId) ?? null;
    setAlunoSelecionado(aluno);
  }

  async function enviarMensagem(e?: FormEvent) {
    e?.preventDefault();
    const texto = inputChat.trim();
    if (!texto || isTyping || !professorLogado) return;

    const novasMensagens: ChatMessage[] = [
      ...messages,
      { role: "user", content: texto },
    ];
    setMessages(novasMensagens);
    setInputChat("");
    setIsTyping(true);

    try {
      const response = await fetch("/api/insights/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: novasMensagens,
          professor: professorLogado.nomeCompletoTitulo,
          contextoAluno,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Falha na comunicação com o Groq.");
      }

      const reply =
        (data.reply as string) ||
        "Desculpe, não consegui processar a análise agora.";

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      console.error("Erro no chat pedagógico:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Não foi possível obter a resposta da IA no momento. Tente novamente em instantes.",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  }

  if (carregandoSessao || !professorLogado) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-zinc-400 text-sm">
        Carregando sessão...
      </div>
    );
  }

  const iniciais = iniciaisDoProfessor(
    professorLogado.nome || professorLogado.nomeCompletoTitulo
  );

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
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-semibold text-white shrink-0">
                {iniciais || "PR"}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {professorLogado.nomeCompletoTitulo}
                </p>
                <p className="text-xs text-zinc-500 truncate">
                  {professorLogado.area_atuacao}
                </p>
              </div>
            </div>
            <ProfessorSettingsControl />
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
            href="/professor"
            onClick={limparSessaoProfessor}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-500 hover:bg-zinc-900 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sair
          </a>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-black">
        <div className="max-w-6xl mx-auto p-8">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                Análise Preditiva e Insights
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                Conversa pedagógica com IA focada nos seus alunos e turmas.
              </p>
            </div>

            <div className="relative inline-block shrink-0">
              <select
                value={alunoSelecionado?.id ?? ""}
                onChange={(e) => handleSelecionarAluno(e.target.value)}
                disabled={carregandoAlunos}
                className="appearance-none bg-zinc-950 border border-zinc-700 text-sm text-white font-medium rounded-lg pl-4 pr-10 py-2.5 focus:outline-none focus:ring-1 focus:ring-zinc-500 cursor-pointer hover:border-zinc-600 transition-colors min-w-[280px] disabled:opacity-60"
              >
                <option value="">
                  {carregandoAlunos
                    ? "Carregando alunos..."
                    : "Filtrar por Aluno"}
                </option>
                {alunos.map((aluno) => (
                  <option key={aluno.id} value={aluno.id}>
                    {aluno.nome} — RA {aluno.ra}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Raio-X do Aluno */}
            <div className="lg:col-span-2 rounded-xl bg-[#0f1117] border border-gray-800 p-5">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-gray-800 flex items-center justify-center">
                  <UserRound className="w-4 h-4 text-zinc-300" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Raio-X do Aluno
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Perfil acadêmico e engajamento
                  </p>
                </div>
              </div>

              {!alunoSelecionado ? (
                <div className="rounded-lg border border-dashed border-gray-800 bg-black/40 px-4 py-10 text-center">
                  <p className="text-sm text-zinc-500">
                    Selecione um aluno no filtro acima para visualizar o
                    diagnóstico individual.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-semibold text-white shrink-0">
                      {iniciaisDoNome(alunoSelecionado.nome)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-medium text-white truncate">
                        {alunoSelecionado.nome}
                      </p>
                      <p className="text-xs text-zinc-500">
                        RA {alunoSelecionado.ra}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-black/50 border border-gray-800 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-zinc-500 mb-1">
                        Curso
                      </p>
                      <p className="text-sm text-zinc-200 truncate">
                        {alunoSelecionado.curso}
                      </p>
                    </div>
                    <div className="rounded-lg bg-black/50 border border-gray-800 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-zinc-500 mb-1">
                        Semestre
                      </p>
                      <p className="text-sm text-zinc-200">
                        {alunoSelecionado.semestre}º
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg bg-black/50 border border-gray-800 p-4">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-500 mb-2">
                      Engajamento / Faltas
                    </p>
                    {carregandoResumo ? (
                      <p className="text-sm text-zinc-400 animate-pulse">
                        Consultando frequência...
                      </p>
                    ) : resumoAluno ? (
                      <>
                        <div className="flex items-end justify-between gap-3 mb-3">
                          <div>
                            <p className="text-2xl font-semibold text-white">
                              {resumoAluno.taxaPresenca}%
                            </p>
                            <p className="text-xs text-zinc-500">presença</p>
                          </div>
                          <div className="text-right text-xs text-zinc-400 space-y-0.5">
                            <p>
                              Presentes:{" "}
                              <span className="text-emerald-400">
                                {resumoAluno.presentes}
                              </span>
                            </p>
                            <p>
                              Faltas:{" "}
                              <span className="text-red-400">
                                {resumoAluno.faltas}
                              </span>
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-zinc-300 leading-relaxed">
                          {resumoAluno.resumo}
                        </p>
                        <p className="text-[11px] text-zinc-600 mt-2">
                          Fonte:{" "}
                          {resumoAluno.fonte === "registro_chamada"
                            ? "registro_chamada"
                            : "estimativa por semestre"}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-zinc-500">
                        Sem dados de engajamento disponíveis.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Assistente Pedagógico */}
            <div className="lg:col-span-3 bg-[#0f1117] border border-gray-800 rounded-xl h-[500px] flex flex-col overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-3 shrink-0">
                <div className="w-8 h-8 rounded-lg bg-purple-950/50 border border-purple-900/40 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-purple-300" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-white">
                    Assistente Pedagógico (Groq)
                  </h2>
                  <p className="text-xs text-zinc-500 truncate">
                    {alunoSelecionado
                      ? `Contexto: ${alunoSelecionado.nome}`
                      : "Selecione um aluno para contextualizar a conversa"}
                  </p>
                </div>
              </div>

              <div
                ref={chatScrollRef}
                className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
              >
                {!alunoSelecionado ? (
                  <div className="h-full flex items-center justify-center px-6 text-center">
                    <p className="text-sm text-zinc-500">
                      Escolha um aluno no filtro para iniciar a análise
                      conversacional com a IA.
                    </p>
                  </div>
                ) : (
                  <>
                    {messages.map((msg, index) => (
                      <div
                        key={`${msg.role}-${index}`}
                        className={`flex ${
                          msg.role === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                            msg.role === "user"
                              ? "bg-purple-600 text-white rounded-br-md"
                              : "bg-[#1a1d24] text-gray-200 rounded-bl-md"
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {isTyping && (
                      <div className="flex justify-start">
                        <div className="bg-[#1a1d24] text-gray-400 rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm animate-pulse">
                          Analisando...
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <form
                onSubmit={(e) => void enviarMensagem(e)}
                className="shrink-0 border-t border-gray-800 p-3 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputChat}
                  onChange={(e) => setInputChat(e.target.value)}
                  disabled={!alunoSelecionado || isTyping}
                  placeholder={
                    alunoSelecionado
                      ? "Pergunte sobre desempenho, faltas ou engajamento..."
                      : "Selecione um aluno para conversar"
                  }
                  className="flex-1 bg-black border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-purple-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={
                    !alunoSelecionado || !inputChat.trim() || isTyping
                  }
                  className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-purple-600 text-white hover:bg-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  aria-label="Enviar mensagem"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

          <hr className="border-gray-800 my-8" />

          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Visão Geral de Desempenho
              </h2>
              <p className="text-sm text-zinc-500 mt-0.5">
                Desempenho Global da Turma — médias de notas e frequência
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative inline-block">
                <select
                  value={filtrosMacro.ano}
                  onChange={(e) =>
                    setFiltrosMacro((prev) => ({
                      ...prev,
                      ano: e.target.value,
                    }))
                  }
                  className="appearance-none bg-zinc-950 border border-zinc-700 text-sm text-white rounded-lg pl-3 pr-9 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-500 cursor-pointer"
                >
                  {anosDisponiveis.map((ano) => (
                    <option key={ano} value={ano}>
                      {ano}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              </div>
              <div className="relative inline-block">
                <select
                  value={filtrosMacro.semestre}
                  onChange={(e) =>
                    setFiltrosMacro((prev) => ({
                      ...prev,
                      semestre: e.target.value,
                    }))
                  }
                  className="appearance-none bg-zinc-950 border border-zinc-700 text-sm text-white rounded-lg pl-3 pr-9 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-500 cursor-pointer"
                >
                  <option value="1º Semestre">1º Semestre</option>
                  <option value="2º Semestre">2º Semestre</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl bg-[#0f1117] border border-gray-800 p-5 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white">
                    Evolução da Nota Média
                  </h3>
                  <span className="text-[11px] text-[#9333ea]">● Notas</span>
                </div>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosGrafico}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#27272a"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="mes"
                        tick={{ fill: "#a1a1aa", fontSize: 12 }}
                        axisLine={{ stroke: "#3f3f46" }}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 10]}
                        tick={{ fill: "#a1a1aa", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f1117",
                          border: "1px solid #1f2937",
                          borderRadius: "8px",
                          color: "#e4e4e7",
                        }}
                      />
                      <Bar
                        dataKey="notaMedia"
                        name="Nota média"
                        fill="#9333ea"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white">
                    Tendência de Frequência
                  </h3>
                  <span className="text-[11px] text-[#10b981]">
                    ● Frequência
                  </span>
                </div>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dadosGrafico}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#27272a"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="mes"
                        tick={{ fill: "#a1a1aa", fontSize: 12 }}
                        axisLine={{ stroke: "#3f3f46" }}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[50, 100]}
                        tick={{ fill: "#a1a1aa", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        unit="%"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f1117",
                          border: "1px solid #1f2937",
                          borderRadius: "8px",
                          color: "#e4e4e7",
                        }}
                      />
                      <Legend
                        wrapperStyle={{ color: "#a1a1aa", fontSize: 12 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="frequencia"
                        name="Frequência %"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        dot={{ fill: "#10b981", r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-[#0f1117] border border-gray-800 rounded-xl p-5 flex flex-col min-h-[500px]">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-purple-950/50 border border-purple-900/40 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-purple-300" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Síntese Preditiva da Turma
                  </h3>
                  <p className="text-xs text-zinc-500">
                    {filtrosMacro.ano} · {filtrosMacro.semestre}
                  </p>
                </div>
              </div>

              {carregandoMacro ? (
                <div className="flex-1 space-y-3">
                  <p className="text-sm text-zinc-400 animate-pulse">
                    O Groq está analisando as tendências da turma...
                  </p>
                  <div className="h-3 rounded bg-zinc-800/80 animate-pulse w-full" />
                  <div className="h-3 rounded bg-zinc-800/80 animate-pulse w-11/12" />
                  <div className="h-3 rounded bg-zinc-800/80 animate-pulse w-4/5" />
                  <div className="h-3 rounded bg-zinc-800/80 animate-pulse w-9/12" />
                </div>
              ) : (
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {analiseMacroIA ||
                    "Ajuste os filtros de ano e período para gerar a síntese preditiva."}
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
