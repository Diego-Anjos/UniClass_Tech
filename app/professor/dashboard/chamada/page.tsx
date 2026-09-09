"use client";

import { useEffect, useMemo, useState } from "react";
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
  AlertTriangle,
  Check,
  X,
  Search,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ProfessorSettingsControl } from "@/components/professor/config-modal";
import { ModalFeedback } from "@/components/ModalFeedback";
import { PaginationFooter } from "@/components/ui/pagination-footer";
import {
  iniciaisDoProfessor,
  limparSessaoProfessor,
  useProfessorSession,
} from "@/lib/professor-session";

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral",    href: "/professor/dashboard",          active: false },
  { icon: BookOpen,        label: "Turmas e Notas", href: "/professor/dashboard/notas",    active: false },
  { icon: UserCheck,       label: "Chamada Rápida", href: "/professor/dashboard/chamada",  active: true  },
  { icon: Sparkles,        label: "Insights IA",    href: "/professor/dashboard/insights",  active: false },
  { icon: MessageSquare,   label: "Mensagens",      href: "/professor/dashboard/mensagens", active: false },
];

type TurmaOption = {
  id: string;
  codigo: string;
  curso: string;
  turno?: string;
};

type AlunoChamada = {
  id: string;
  nome: string;
  ra: string;
  porcentagemFaltas: number;
  presente: boolean;
};

function hojeISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatarDataBR(iso: string) {
  const [yyyy, mm, dd] = iso.split("-");
  if (!yyyy || !mm || !dd) return iso;
  return `${dd}/${mm}/${yyyy}`;
}

function labelTurma(turma: TurmaOption) {
  return `${turma.curso} - Turma ${turma.codigo} (${turma.turno})`;
}

function iniciaisDoNome(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .join("");
}

/** Gera % de faltas estável (5–30) a partir do id do aluno. */
function porcentagemFaltasDeId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return 5 + (hash % 26);
}

export default function ProfessorChamadaPage() {
  const { professorLogado, carregandoSessao } = useProfessorSession();
  const [turmas, setTurmas] = useState<TurmaOption[]>([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState("");
  const [dataChamada, setDataChamada] = useState(hojeISO());
  const [alunosTurma, setAlunosTurma] = useState<AlunoChamada[]>([]);
  const [termoBusca, setTermoBusca] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [aiInsight, setAiInsight] = useState("");
  const [isLoadingAi, setIsLoadingAi] = useState(false);
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

  const alunosFiltrados = useMemo(() => {
    const termo = termoBusca.trim().toLowerCase();
    if (!termo) return alunosTurma;
    return alunosTurma.filter(
      (aluno) =>
        aluno.nome.toLowerCase().includes(termo) ||
        aluno.ra.toLowerCase().includes(termo)
    );
  }, [alunosTurma, termoBusca]);

  const totalRegistros = alunosFiltrados.length;
  const totalPaginas = Math.max(1, Math.ceil(totalRegistros / itensPorPagina));
  const indiceInicial = (paginaAtual - 1) * itensPorPagina;
  const indiceFinal = indiceInicial + itensPorPagina;
  const alunosExibidos = alunosFiltrados.slice(indiceInicial, indiceFinal);

  const totalAlunos = alunosTurma.length;
  const totalPresentes = useMemo(
    () => alunosTurma.filter((a) => a.presente).length,
    [alunosTurma]
  );
  const totalFaltas = useMemo(
    () => alunosTurma.filter((a) => !a.presente).length,
    [alunosTurma]
  );

  const turmaAtual = useMemo(
    () => turmas.find((t) => t.id === turmaSelecionada) ?? null,
    [turmas, turmaSelecionada]
  );

  function mostrarFeedback(
    tipo: "sucesso" | "erro" | "atencao",
    titulo: string,
    mensagem: string
  ) {
    setModalFeedback({ aberto: true, tipo, titulo, mensagem });
  }

  function fecharFeedback() {
    setModalFeedback((prev) => ({ ...prev, aberto: false }));
  }

  async function fetchFrequenciaInsight(
    nomeTurma: string,
    total: number,
    faltas: number
  ) {
    setIsLoadingAi(true);
    try {
      const response = await fetch("/api/insights/frequencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          turma: nomeTurma,
          totalAlunos: total,
          totalFaltas: faltas,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Falha na análise de frequência.");
      }
      setAiInsight((data.insight as string) ?? "");
    } catch (err) {
      console.error("Erro ao gerar insight de frequência:", err);
      setAiInsight(
        "Não foi possível gerar o alerta de frequência no momento. Tente novamente."
      );
    } finally {
      setIsLoadingAi(false);
    }
  }

  function setPresenca(alunoId: string, presente: boolean) {
    setAlunosTurma((prev) =>
      prev.map((aluno) =>
        aluno.id === alunoId ? { ...aluno, presente } : aluno
      )
    );
  }

  function handleSalvarChamada() {
    if (alunosTurma.length === 0) {
      mostrarFeedback(
        "atencao",
        "Sem alunos",
        "Nenhum aluno nesta turma para registrar chamada."
      );
      return;
    }

    mostrarFeedback(
      "sucesso",
      "Chamada Registrada",
      "Presenças e faltas da data salvas com sucesso."
    );
  }

  useEffect(() => {
    if (!professorLogado) return;

    async function fetchTurmas() {
      const { data, error } = await supabase
        .from("turmas")
        .select("id, codigo, curso, turno")
        .eq("status", "Aberta")
        .order("curso", { ascending: true });

      if (error) {
        console.error("Erro ao buscar turmas:", error.message);
        setTurmas([]);
        setTurmaSelecionada("");
        return;
      }

      const lista = (data ?? []) as TurmaOption[];
      setTurmas(lista);
      if (lista.length > 0) {
        setTurmaSelecionada(lista[0].id);
      }
    }

    void fetchTurmas();
  }, [professorLogado]);

  useEffect(() => {
    if (!turmaSelecionada || !professorLogado) {
      setAlunosTurma([]);
      return;
    }

    async function fetchAlunos() {
      const vinculoProfessor = professorLogado!.nomeCompletoTitulo;
      const areaAtuacao = professorLogado!.area_atuacao;

      let { data, error } = await supabase
        .from("alunos")
        .select("id, nome, ra, professor, curso")
        .eq("professor", vinculoProfessor)
        .order("nome", { ascending: true });

      if (error) {
        const fallback = await supabase
          .from("alunos")
          .select("id, nome, ra, professor, curso")
          .eq("curso", areaAtuacao)
          .order("nome", { ascending: true });

        if (fallback.error) {
          console.error(
            "Erro ao buscar alunos:",
            error.message || fallback.error.message
          );
          setAlunosTurma([]);
          return;
        }

        data = fallback.data;
      }

      if (!data || data.length === 0) {
        setAlunosTurma([]);
        return;
      }

      const mapeados: AlunoChamada[] = data.map((aluno) => {
        const id = String(aluno.id);
        return {
          id,
          nome: String(aluno.nome ?? ""),
          ra: String(
            aluno.ra ||
              (aluno as { matricula?: string }).matricula ||
              "RA-"
          ),
          porcentagemFaltas: porcentagemFaltasDeId(id),
          presente: true,
        };
      });

      setAlunosTurma(mapeados);
    }

    void fetchAlunos();
  }, [turmaSelecionada, professorLogado]);

  useEffect(() => {
    setPaginaAtual(1);
  }, [turmaSelecionada, termoBusca]);

  useEffect(() => {
    if (paginaAtual > totalPaginas) {
      setPaginaAtual(totalPaginas);
    }
  }, [paginaAtual, totalPaginas]);

  useEffect(() => {
    if (!turmaAtual || totalAlunos === 0) {
      setAiInsight("");
      return;
    }

    void fetchFrequenciaInsight(
      labelTurma(turmaAtual),
      totalAlunos,
      totalFaltas
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turmaSelecionada, totalAlunos, totalFaltas, turmaAtual?.id]);

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

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 px-2 py-4 flex-1">
          {navItems.map(({ icon: Icon, label, href, active }) =>
            href.startsWith("/professor/dashboard") ? (
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
            ) : (
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
            )
          )}
        </nav>

        {/* Logout */}
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

      {/* ══════════════════════════════
          MAIN CONTENT
      ══════════════════════════════ */}
      <main className="flex-1 overflow-y-auto bg-black">
        <div className="max-w-6xl mx-auto p-8">

          {/* Header de Contexto */}
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                Chamada Rápida
              </h1>
              <div className="mt-3 flex flex-col sm:flex-row gap-3">
                <div className="relative inline-block">
                  <select
                    value={turmaSelecionada}
                    onChange={(e) => setTurmaSelecionada(e.target.value)}
                    className="appearance-none bg-zinc-950 border border-zinc-700 text-sm text-white font-medium rounded-lg pl-4 pr-10 py-2.5 focus:outline-none focus:ring-1 focus:ring-zinc-500 cursor-pointer hover:border-zinc-600 transition-colors min-w-[260px]"
                  >
                    {turmas.length === 0 ? (
                      <option value="">Nenhuma turma ativa</option>
                    ) : (
                      turmas.map((turma) => (
                        <option key={turma.id} value={turma.id}>
                          {labelTurma(turma)}
                        </option>
                      ))
                    )}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                </div>
                <div className="relative inline-block">
                  <input
                    type="date"
                    value={dataChamada}
                    onChange={(e) => setDataChamada(e.target.value)}
                    className="appearance-none bg-zinc-950 border border-zinc-700 text-sm text-white font-medium rounded-lg px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-zinc-500 cursor-pointer hover:border-zinc-600 transition-colors"
                  />
                  <p className="sr-only">Data: {formatarDataBR(dataChamada)}</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSalvarChamada}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-black hover:bg-zinc-200 transition-colors shrink-0 self-start lg:self-auto"
            >
              Salvar Chamada
            </button>
          </div>

          {/* AI Insight Card */}
          <div className="mb-4 rounded-xl bg-zinc-950 border border-orange-900/50 p-5 flex gap-4">
            <div className="w-9 h-9 rounded-lg bg-orange-950/60 border border-orange-900/50 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-orange-300" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-widest text-orange-300/80 mb-1.5">
                Alerta de Frequência
              </p>
              <p
                className={`text-sm text-zinc-300 leading-relaxed ${
                  isLoadingAi ? "animate-pulse text-zinc-400" : ""
                }`}
              >
                {isLoadingAi
                  ? "Analisando frequência da turma..."
                  : aiInsight || "Selecione uma turma para gerar o alerta."}
              </p>
            </div>
          </div>

          {/* Barra de Resumo */}
          <div className="mb-8 px-4 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 tracking-wide">
            Total de Alunos:{" "}
            <span className="text-white font-medium">{totalAlunos}</span>
            <span className="mx-2 text-zinc-700">|</span>
            Presentes:{" "}
            <span className="text-green-400 font-medium">{totalPresentes}</span>
            <span className="mx-2 text-zinc-700">|</span>
            Faltas:{" "}
            <span className="text-red-400 font-medium">{totalFaltas}</span>
          </div>

          {/* Lista de Alunos */}
          <div className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800">
              <div className="relative max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="search"
                  value={termoBusca}
                  onChange={(e) => setTermoBusca(e.target.value)}
                  placeholder="Buscar por nome ou RA..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-600"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="px-6 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest">
                      Aluno
                    </th>
                    <th className="px-4 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest">
                      Frequência Atual
                    </th>
                    <th className="px-6 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest text-right">
                      Status Diário
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {alunosExibidos.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-6 py-10 text-center text-sm text-zinc-500"
                      >
                        {alunosTurma.length === 0
                          ? "Nenhum aluno nesta turma"
                          : "Nenhum aluno encontrado para a busca"}
                      </td>
                    </tr>
                  ) : (
                    alunosExibidos.map((aluno) => {
                      const alerta = aluno.porcentagemFaltas >= 25;
                      return (
                        <tr
                          key={aluno.id}
                          className="border-b border-zinc-800 last:border-b-0 hover:bg-zinc-900/40 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-semibold text-white shrink-0">
                                {iniciaisDoNome(aluno.nome)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-white truncate flex items-center gap-1.5">
                                  {aluno.nome}
                                  {alerta && (
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  )}
                                </p>
                                <p className="text-xs text-zinc-500">
                                  RA {aluno.ra}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`text-sm ${
                                alerta
                                  ? "text-red-400 font-medium"
                                  : "text-zinc-400"
                              }`}
                            >
                              {aluno.porcentagemFaltas}% de faltas
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-end">
                              <div className="inline-flex rounded-lg overflow-hidden border border-zinc-800">
                                <button
                                  type="button"
                                  onClick={() => setPresenca(aluno.id, true)}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                                    aluno.presente
                                      ? "bg-green-900/40 text-green-500"
                                      : "bg-zinc-950 text-zinc-500 hover:text-zinc-300"
                                  }`}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Presente
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPresenca(aluno.id, false)}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-l border-zinc-800 transition-colors ${
                                    !aluno.presente
                                      ? "bg-red-900/40 text-red-500"
                                      : "bg-zinc-950 text-zinc-500 hover:text-zinc-300"
                                  }`}
                                >
                                  <X className="w-3.5 h-3.5" />
                                  Falta
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <PaginationFooter
              total={totalRegistros}
              paginaAtual={paginaAtual}
              itensPorPagina={itensPorPagina}
              onPaginaChange={setPaginaAtual}
              onItensPorPaginaChange={setItensPorPagina}
            />
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
