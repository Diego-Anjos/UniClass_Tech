"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Settings,
  LogOut,
  Shield,
  Building2,
  Search,
  Filter,
  User,
  UserPlus,
  AlertTriangle,
  Mail,
  X,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type StatusAluno = "Ativo" | "Evadido" | "Trancado" | string;
type AbaProntuario = "Cadastral" | "Acadêmico" | "Insights de IA";

type Aluno = {
  ra: string;
  nome: string;
  curso: string;
  semestre: number;
  status: StatusAluno;
  email: string;
  telefone: string;
  iniciais: string;
};

type FormDataAluno = {
  ra: string;
  nome: string;
  curso: string;
  semestre: string;
};

const formInicial: FormDataAluno = {
  ra: "",
  nome: "",
  curso: "",
  semestre: "",
};

const statusBadge: Record<string, string> = {
  Ativo: "bg-green-950 text-green-400 border-green-900/50",
  Evadido: "bg-red-950 text-red-400 border-red-900/50",
  Trancado: "bg-amber-950 text-amber-400 border-amber-900/50",
};

const abas: AbaProntuario[] = ["Cadastral", "Acadêmico", "Insights de IA"];

const cursosOpcoes = [
  "Análise e Desenvolvimento de Sistemas",
  "Engenharia de Software",
  "Ciência da Computação",
  "Sistemas de Informação",
  "Banco de Dados",
  "Redes de Computadores",
  "Segurança da Informação (Defesa Cibernética)",
  "Inteligência Artificial",
  "Jogos Digitais",
  "Gestão da Tecnologia da Informação",
  "Internet das Coisas (IoT)",
  "Computação na Nuvem",
];

function iniciaisDe(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function mapAluno(row: Record<string, unknown>): Aluno {
  const nome = String(row.nome ?? "");
  const status = String(row.status ?? "Ativo");
  return {
    ra: String(row.ra ?? "—"),
    nome,
    curso: String(row.curso ?? "—"),
    semestre: Number(row.semestre ?? 1),
    status,
    email: String(row.email ?? row.email_institucional ?? "—"),
    telefone: String(row.telefone ?? row.celular ?? "—"),
    iniciais: iniciaisDe(nome) || "—",
  };
}

export default function GestaoAlunosPage() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormDataAluno>(formInicial);

  const [busca, setBusca] = useState("");
  const [filtroCurso, setFiltroCurso] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [alunoSelecionado, setAlunoSelecionado] = useState<Aluno | null>(null);
  const [drawerAberto, setDrawerAberto] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<AbaProntuario>("Cadastral");

  async function fetchAlunos() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("alunos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar alunos:", error.message);
      setAlunos([]);
    } else {
      setAlunos((data ?? []).map((row) => mapAluno(row as Record<string, unknown>)));
    }
    setIsLoading(false);
  }

  useEffect(() => {
    fetchAlunos();
  }, []);

  const cursosUnicos = useMemo(
    () => Array.from(new Set(alunos.map((a) => a.curso).filter((c) => c && c !== "—"))).sort(),
    [alunos]
  );

  const alunosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return alunos.filter((aluno) => {
      const matchBusca =
        !termo ||
        aluno.nome.toLowerCase().includes(termo) ||
        aluno.ra.toLowerCase().includes(termo) ||
        aluno.curso.toLowerCase().includes(termo);
      const matchCurso = filtroCurso === "todos" || aluno.curso === filtroCurso;
      const matchStatus = filtroStatus === "todos" || aluno.status === filtroStatus;
      return matchBusca && matchCurso && matchStatus;
    });
  }, [alunos, busca, filtroCurso, filtroStatus]);

  function abrirProntuario(aluno: Aluno) {
    setAlunoSelecionado(aluno);
    setAbaAtiva("Cadastral");
    setDrawerAberto(true);
  }

  function fecharProntuario() {
    setDrawerAberto(false);
    window.setTimeout(() => setAlunoSelecionado(null), 300);
  }

  function atualizarCampo<K extends keyof FormDataAluno>(campo: K, valor: FormDataAluno[K]) {
    setFormData((prev) => ({ ...prev, [campo]: valor }));
  }

  function fecharModal() {
    setIsModalOpen(false);
    setFormData(formInicial);
    setFormError(null);
  }

  async function salvarAluno() {
    setFormError(null);

    const ra = formData.ra.trim();
    const nome = formData.nome.trim();
    const curso = formData.curso.trim();
    const semestre = Number(formData.semestre);

    if (!ra || !nome || !curso || !formData.semestre || Number.isNaN(semestre)) {
      setFormError("Preencha todos os campos obrigatórios.");
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.from("alunos").insert({
      ra,
      nome,
      curso,
      semestre,
    });
    setIsSubmitting(false);

    if (error) {
      console.error("Erro ao cadastrar aluno:", error.message);
      setFormError(error.message);
      return;
    }

    fecharModal();
    await fetchAlunos();
  }

  const inputClass =
    "w-full px-3 py-2.5 rounded-lg bg-black border border-zinc-800 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-zinc-600 transition-colors";
  const labelClass = "block text-xs text-zinc-500 mb-1.5";

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      {/* SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-zinc-950 border-r border-zinc-800">
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-zinc-800">
          <div className="w-8 h-8 bg-gradient-to-br from-zinc-800 to-zinc-950 border border-zinc-700/50 shadow-[0_0_15px_rgba(255,255,255,0.05)] flex items-center justify-center rounded-lg shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="text-sm tracking-tight">
            <span className="text-white font-bold">UniClass</span>
            <span className="text-zinc-400 font-light">Tech</span>
          </span>
        </div>

        <div className="px-4 py-5 border-b border-zinc-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-zinc-300" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">Secretaria Acadêmica</p>
              <p className="text-xs text-zinc-500">Acesso Root</p>
            </div>
          </div>
        </div>

        <nav className="flex flex-col gap-0.5 px-2 py-4 flex-1">
          <Link
            href="/adm/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-zinc-400 hover:text-white"
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            Visão Geral
          </Link>
          <Link
            href="/adm/dashboard/alunos"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors bg-zinc-800/50 text-white font-medium"
          >
            <Users className="w-4 h-4 shrink-0" />
            Gestão de Alunos
          </Link>
          <Link
            href="/adm/dashboard/professores"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-zinc-400 hover:text-white"
          >
            <GraduationCap className="w-4 h-4 shrink-0" />
            Gestão de Professores
          </Link>
          <Link
            href="/adm/dashboard/turmas"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-zinc-400 hover:text-white"
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            Turmas e Matrículas
          </Link>
          <Link
            href="/adm/dashboard/configuracoes"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-zinc-400 hover:text-white"
          >
            <Settings className="w-4 h-4 shrink-0" />
            Configurações do Sistema
          </Link>
        </nav>

        <div className="px-2 py-4 border-t border-zinc-800">
          <a
            href="/adm/login"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-500 hover:bg-zinc-900 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sair
          </a>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 overflow-y-auto bg-black relative">
        <div className="max-w-6xl mx-auto p-8">
          {/* Header */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                Gestão de Alunos
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                Consulte, filtre e acompanhe o prontuário acadêmico dos estudantes.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              Cadastrar Novo Aluno
            </button>
          </div>

          {/* Barra de ferramentas */}
          <div className="mb-6 rounded-xl bg-zinc-950 border border-zinc-800 p-4">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por nome..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-zinc-600 transition-colors"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <div className="relative min-w-[220px]">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                  <select
                    value={filtroCurso}
                    onChange={(e) => setFiltroCurso(e.target.value)}
                    className="w-full appearance-none pl-10 pr-8 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white outline-none focus:border-zinc-600 transition-colors"
                  >
                    <option value="todos">Todos os cursos</option>
                    {cursosUnicos.map((curso) => (
                      <option key={curso} value={curso}>
                        {curso}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative min-w-[160px]">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                  <select
                    value={filtroStatus}
                    onChange={(e) => setFiltroStatus(e.target.value)}
                    className="w-full appearance-none pl-10 pr-8 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white outline-none focus:border-zinc-600 transition-colors"
                  >
                    <option value="todos">Todos os status</option>
                    <option value="Ativo">Ativo</option>
                    <option value="Trancado">Trancado</option>
                    <option value="Evadido">Evadido</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Tabela */}
          <div className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Listagem de Alunos</h2>
              <span className="text-xs text-zinc-500">
                {isLoading
                  ? "Carregando..."
                  : `${alunosFiltrados.length} registro${alunosFiltrados.length !== 1 ? "s" : ""}`}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[720px]">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="px-6 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest">
                      RA
                    </th>
                    <th className="px-4 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest">
                      Nome do Aluno
                    </th>
                    <th className="px-4 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest">
                      Curso
                    </th>
                    <th className="px-4 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest">
                      Semestre
                    </th>
                    <th className="px-6 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-16 text-center text-sm text-zinc-500"
                      >
                        Carregando alunos...
                      </td>
                    </tr>
                  ) : alunosFiltrados.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-sm text-zinc-500"
                      >
                        Nenhum aluno encontrado com os filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    alunosFiltrados.map((aluno) => (
                      <tr
                        key={aluno.ra}
                        onClick={() => abrirProntuario(aluno)}
                        className="border-b border-zinc-800 last:border-b-0 hover:bg-zinc-900/40 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-4 text-sm text-zinc-400 font-mono">
                          {aluno.ra}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-200 shrink-0">
                              {aluno.iniciais}
                            </div>
                            <span className="text-sm font-medium text-white">
                              {aluno.nome}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-zinc-400 max-w-[260px]">
                          <span className="line-clamp-1">{aluno.curso}</span>
                        </td>
                        <td className="px-4 py-4 text-sm text-zinc-400">
                          {aluno.semestre}º
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${
                              statusBadge[aluno.status] ??
                              "bg-zinc-900 text-zinc-400 border-zinc-800"
                            }`}
                          >
                            {aluno.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Overlay drawer */}
        <button
          type="button"
          aria-label="Fechar prontuário"
          onClick={fecharProntuario}
          className={`absolute inset-0 bg-black/60 backdrop-blur-[2px] z-40 transition-opacity duration-300 ${
            drawerAberto
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        />

        {/* Drawer lateral */}
        <aside
          className={`absolute right-0 top-0 h-full w-full max-w-md bg-zinc-950 border-l border-zinc-800 z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-out ${
            drawerAberto ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {alunoSelecionado && (
            <>
              <div className="px-6 py-5 border-b border-zinc-800 flex items-start justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-14 h-14 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                    <User className="w-7 h-7 text-zinc-300" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">
                      Prontuário Acadêmico
                    </p>
                    <h3 className="text-lg font-semibold text-white truncate">
                      {alunoSelecionado.nome}
                    </h3>
                    <p className="text-sm text-zinc-400 font-mono mt-0.5">
                      RA {alunoSelecionado.ra}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={fecharProntuario}
                  className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-4 pt-4 border-b border-zinc-800">
                <div className="flex gap-1">
                  {abas.map((aba) => (
                    <button
                      key={aba}
                      type="button"
                      onClick={() => setAbaAtiva(aba)}
                      className={`px-3 py-2.5 text-xs font-medium rounded-t-lg transition-colors border-b-2 ${
                        abaAtiva === aba
                          ? "text-white border-white bg-zinc-900/50"
                          : "text-zinc-500 border-transparent hover:text-zinc-300"
                      }`}
                    >
                      {aba}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {abaAtiva === "Cadastral" && (
                  <div className="space-y-4">
                    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-3">
                      <Campo label="Nome completo" valor={alunoSelecionado.nome} />
                      <Campo label="RA" valor={alunoSelecionado.ra} />
                      <Campo
                        label="E-mail institucional"
                        valor={alunoSelecionado.email}
                      />
                      <Campo label="Telefone" valor={alunoSelecionado.telefone} />
                      <Campo label="Status" valor={alunoSelecionado.status} />
                    </div>
                  </div>
                )}

                {abaAtiva === "Acadêmico" && (
                  <div className="space-y-4">
                    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-3">
                      <Campo label="Curso" valor={alunoSelecionado.curso} />
                      <Campo
                        label="Semestre atual"
                        valor={`${alunoSelecionado.semestre}º semestre`}
                      />
                      <Campo label="Turno" valor="Noturno" />
                      <Campo label="Ingresso" valor="2026.1" />
                      <Campo label="CRA" valor="7.4" />
                    </div>
                    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
                      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">
                        Disciplinas em andamento
                      </p>
                      <ul className="space-y-2 text-sm text-zinc-300">
                        <li className="flex justify-between gap-2">
                          <span>Banco de Dados</span>
                          <span className="text-zinc-500">22% faltas</span>
                        </li>
                        <li className="flex justify-between gap-2">
                          <span>Engenharia de Software</span>
                          <span className="text-zinc-500">8% faltas</span>
                        </li>
                        <li className="flex justify-between gap-2">
                          <span>Redes de Computadores</span>
                          <span className="text-zinc-500">5% faltas</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                )}

                {abaAtiva === "Insights de IA" && (
                  <div className="space-y-4">
                    <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
                      <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-zinc-400" />
                        <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
                          Painel Preditivo · Groq / Llama 3
                        </p>
                      </div>

                      <div className="p-4 space-y-4">
                        <div className="rounded-lg bg-black/40 border-l-4 border-orange-500 border border-orange-900/40 p-4 flex gap-3">
                          <div className="w-9 h-9 rounded-lg bg-orange-950/60 border border-orange-900/50 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-4 h-4 text-orange-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wide text-orange-400 mb-1.5">
                              Alerta Preditivo
                            </p>
                            <p className="text-sm text-zinc-300 leading-relaxed">
                              O aluno atingiu 22% de faltas na disciplina de Banco de
                              Dados. Risco moderado de reprovação.
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3">
                            <p className="text-[11px] text-zinc-500 uppercase tracking-widest">
                              Risco
                            </p>
                            <p className="text-lg font-semibold text-orange-400 mt-1">
                              Moderado
                            </p>
                          </div>
                          <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3">
                            <p className="text-[11px] text-zinc-500 uppercase tracking-widest">
                              Faltas BD
                            </p>
                            <p className="text-lg font-semibold text-white mt-1">22%</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors"
                        >
                          <Mail className="w-4 h-4" />
                          Notificar via Resend
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </aside>

        {/* Modal Cadastro */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-novo-aluno-titulo"
              className="bg-zinc-950 border border-zinc-800 rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <h2
                    id="modal-novo-aluno-titulo"
                    className="text-lg font-semibold text-white tracking-tight"
                  >
                    Cadastrar Novo Aluno
                  </h2>
                  <p className="text-sm text-zinc-500 mt-1">
                    O status do aluno será definido automaticamente pelo sistema.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fecharModal}
                  className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors shrink-0"
                  aria-label="Fechar modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void salvarAluno();
                }}
                className="space-y-4"
              >
                <div>
                  <label className={labelClass} htmlFor="ra">
                    RA
                  </label>
                  <input
                    id="ra"
                    type="text"
                    required
                    value={formData.ra}
                    onChange={(e) => atualizarCampo("ra", e.target.value)}
                    className={inputClass}
                    placeholder="Ex: 20261001"
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="nome">
                    Nome
                  </label>
                  <input
                    id="nome"
                    type="text"
                    required
                    value={formData.nome}
                    onChange={(e) => atualizarCampo("nome", e.target.value)}
                    className={inputClass}
                    placeholder="Nome completo do aluno"
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="curso">
                    Curso
                  </label>
                  <input
                    id="curso"
                    type="text"
                    required
                    value={formData.curso}
                    onChange={(e) => atualizarCampo("curso", e.target.value)}
                    className={inputClass}
                    placeholder="Ex: Engenharia de Software"
                    list="cursos-sugeridos"
                  />
                  <datalist id="cursos-sugeridos">
                    {cursosOpcoes.map((curso) => (
                      <option key={curso} value={curso} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className={labelClass} htmlFor="semestre">
                    Semestre
                  </label>
                  <input
                    id="semestre"
                    type="number"
                    required
                    min={1}
                    max={12}
                    value={formData.semestre}
                    onChange={(e) => atualizarCampo("semestre", e.target.value)}
                    className={inputClass}
                    placeholder="Ex: 1"
                  />
                </div>

                {formError && (
                  <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">
                    {formError}
                  </p>
                )}

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={fecharModal}
                    disabled={isSubmitting}
                    className="px-4 py-2.5 rounded-lg border border-zinc-700 text-sm font-medium text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? "Salvando..." : "Salvar Aluno"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-[11px] text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-sm text-zinc-200">{valor}</p>
    </div>
  );
}
