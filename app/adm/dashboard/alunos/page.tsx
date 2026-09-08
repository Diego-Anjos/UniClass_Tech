"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Filter,
  User,
  UserPlus,
  AlertTriangle,
  Mail,
  X,
  Sparkles,
  Pencil,
  Trash2,
  CheckCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type StatusAluno = "Ativo" | "Evadido" | "Trancado" | string;
type AbaProntuario = "Cadastral" | "Acadêmico" | "Insights de IA";

type Aluno = {
  id: string;
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
    id: String(row.id ?? ""),
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterCurso, setFilterCurso] = useState("Todos");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [alunoSelecionado, setAlunoSelecionado] = useState<Aluno | null>(null);
  const [drawerAberto, setDrawerAberto] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<AbaProntuario>("Cadastral");
  const [cursosAtivos, setCursosAtivos] = useState<string[]>([]);

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

  async function fetchCursosAtivos() {
    const { data, error } = await supabase
      .from("turmas")
      .select("curso")
      .eq("status", "Aberta");

    if (error) {
      console.error("Erro ao buscar cursos ativos:", error.message);
      setCursosAtivos([]);
      return;
    }

    if (data) {
      const cursosUnicos = Array.from(
        new Set(
          data
            .map((t) => t.curso)
            .filter((curso): curso is string => Boolean(curso))
        )
      ).sort();
      setCursosAtivos(cursosUnicos);
    }
  }

  useEffect(() => {
    fetchAlunos();
    fetchCursosAtivos();
  }, []);

  const cursosUnicos = useMemo(
    () => Array.from(new Set(alunos.map((a) => a.curso).filter((c) => c && c !== "—"))).sort(),
    [alunos]
  );

  const cursosNoFormulario = useMemo(() => {
    if (formData.curso && !cursosAtivos.includes(formData.curso)) {
      return [...cursosAtivos, formData.curso].sort();
    }
    return cursosAtivos;
  }, [cursosAtivos, formData.curso]);

  const alunosFiltrados = useMemo(() => {
    const termo = searchTerm.trim().toLowerCase();

    return alunos.filter((aluno) => {
      const matchBusca =
        !termo ||
        aluno.nome.toLowerCase().includes(termo) ||
        aluno.ra.toLowerCase().includes(termo);

      const matchCurso =
        !filterCurso ||
        filterCurso === "Todos" ||
        aluno.curso === filterCurso;

      const matchStatus =
        !filterStatus ||
        filterStatus === "Todos" ||
        aluno.status === filterStatus;

      return matchBusca && matchCurso && matchStatus;
    });
  }, [alunos, searchTerm, filterCurso, filterStatus]);

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
    setEditingId(null);
  }

  async function confirmDelete() {
    if (!itemToDelete) return;
    const { error } = await supabase.from("alunos").delete().eq("id", itemToDelete);
    if (error) {
      console.error("Erro ao excluir aluno:", error.message);
      setItemToDelete(null);
      return;
    }
    setItemToDelete(null);
    await fetchAlunos();
  }

  function handleEdit(aluno: Aluno) {
    setFormData({
      ra: aluno.ra,
      nome: aluno.nome,
      curso: aluno.curso,
      semestre: String(aluno.semestre),
    });
    setEditingId(aluno.id);
    setIsModalOpen(true);
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
    const { error } = editingId
      ? await supabase.from("alunos").update({ ra, nome, curso, semestre }).eq("id", editingId)
      : await supabase.from("alunos").insert({ ra, nome, curso, semestre });
    setIsSubmitting(false);

    if (error) {
      console.error("Erro ao cadastrar aluno:", error.message);
      setFormError(error.message);
      return;
    }

    const wasEditing = !!editingId;
    fecharModal();
    await fetchAlunos();
    setSuccessMessage(wasEditing ? "Aluno atualizado com sucesso!" : "Aluno cadastrado com sucesso!");
    setTimeout(() => setSuccessMessage(null), 3000);
  }

  const inputClass =
    "w-full px-3 py-2.5 rounded-lg bg-black border border-zinc-800 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-zinc-600 transition-colors";
  const labelClass = "block text-xs text-zinc-500 mb-1.5";

  return (
    <>
      <div className="relative min-h-[calc(100vh-8rem)]">
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
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nome ou RA..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-zinc-600 transition-colors"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <div className="relative min-w-[220px]">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                  <select
                    value={filterCurso}
                    onChange={(e) => setFilterCurso(e.target.value)}
                    className="w-full appearance-none pl-10 pr-8 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white outline-none focus:border-zinc-600 transition-colors"
                  >
                    <option value="Todos">Todos</option>
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
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full appearance-none pl-10 pr-8 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white outline-none focus:border-zinc-600 transition-colors"
                  >
                    <option value="Todos">Todos</option>
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
                    <th className="px-6 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest text-right">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-16 text-center text-sm text-zinc-500"
                      >
                        Carregando alunos...
                      </td>
                    </tr>
                  ) : alunosFiltrados.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
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
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleEdit(aluno); }}
                              className="p-1.5 rounded-md text-zinc-500 hover:text-blue-500 hover:bg-zinc-800 transition-colors"
                              aria-label="Editar aluno"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setItemToDelete(aluno.id); }}
                              className="p-1.5 rounded-md text-zinc-500 hover:text-red-500 hover:bg-zinc-800 transition-colors"
                              aria-label="Excluir aluno"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
                    {editingId ? "Editar Aluno" : "Cadastrar Novo Aluno"}
                  </h2>
                  <p className="text-sm text-zinc-500 mt-1">
                    {editingId
                      ? "Atualize os dados do aluno abaixo."
                      : "O status do aluno será definido automaticamente pelo sistema."}
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
                  <select
                    id="curso"
                    required
                    value={formData.curso}
                    onChange={(e) => atualizarCampo("curso", e.target.value)}
                    className={inputClass}
                  >
                    <option value="" disabled>
                      {cursosAtivos.length === 0
                        ? "Nenhum curso com turma aberta"
                        : "Selecione o curso"}
                    </option>
                    {cursosNoFormulario.map((curso) => (
                      <option key={curso} value={curso}>
                        {curso}
                      </option>
                    ))}
                  </select>
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
                    {isSubmitting ? "Salvando..." : editingId ? "Atualizar Aluno" : "Salvar Aluno"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Modal Confirmação de Exclusão */}
        {itemToDelete && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-12 h-12 rounded-full bg-red-950/60 border border-red-900/50 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Confirmar Exclusão</h3>
                  <p className="text-sm text-zinc-400 mt-1">
                    Esta ação é irreversível. O aluno será removido permanentemente do sistema.
                  </p>
                </div>
                <div className="flex gap-3 w-full mt-2">
                  <button
                    type="button"
                    onClick={() => setItemToDelete(null)}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => void confirmDelete()}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
                  >
                    Sim, Excluir
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toast de Sucesso */}
        {successMessage && (
          <div className="fixed bottom-4 right-4 z-[80] flex items-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-lg">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span className="text-sm font-medium">{successMessage}</span>
          </div>
        )}
      </div>
    </>
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
