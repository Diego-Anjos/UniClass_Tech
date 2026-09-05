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
  Briefcase,
  UserPlus,
  AlertCircle,
  Send,
  X,
  Sparkles,
  CheckCircle2,
  Circle,
  Clock,
  Pencil,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type StatusProfessor = "Ativo" | "Licença" | "Inativo";
type Titulacao = "Especialista" | "Mestre" | "Doutor";
type AbaProntuario = "Alocação" | "Conformidade" | "Insights de IA";

type Professor = {
  id: string;
  matricula: string;
  nome: string;
  titulacao: Titulacao;
  area: string;
  cargaHoraria: number;
  status: StatusProfessor;
  email: string;
  iniciais: string;
  turmas: string[];
  diarioFechado: boolean;
};

type FormDataProfessor = {
  matricula: string;
  nome: string;
  titulacao: Titulacao;
  area: string;
  cargaHoraria: string;
};

const formInicial: FormDataProfessor = {
  matricula: "",
  nome: "",
  titulacao: "Especialista",
  area: "",
  cargaHoraria: "",
};

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral", href: "/adm/dashboard", active: false },
  { icon: Users, label: "Gestão de Alunos", href: "/adm/dashboard/alunos", active: false },
  {
    icon: GraduationCap,
    label: "Gestão de Professores",
    href: "/adm/dashboard/professores",
    active: true,
  },
  { icon: BookOpen, label: "Turmas e Matrículas", href: "/adm/dashboard/turmas", active: false },
  {
    icon: Settings,
    label: "Configurações do Sistema",
    href: "/adm/dashboard/configuracoes",
    active: false,
  },
];

const statusBadge: Record<StatusProfessor, string> = {
  Ativo: "bg-green-950 text-green-400 border-green-900/50",
  Licença: "bg-amber-950 text-amber-400 border-amber-900/50",
  Inativo: "bg-red-950 text-red-400 border-red-900/50",
};

const titulacoes: Titulacao[] = ["Especialista", "Mestre", "Doutor"];
const abas: AbaProntuario[] = ["Alocação", "Conformidade", "Insights de IA"];

function iniciaisDe(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function mapProfessor(row: Record<string, unknown>): Professor {
  const nome = String(row.nome ?? "");
  return {
    id: String(row.id ?? ""),
    matricula: String(row.matricula ?? "—"),
    nome,
    titulacao: (String(row.titulacao ?? "Especialista")) as Titulacao,
    area: String(row.area_atuacao ?? row.area ?? "—"),
    cargaHoraria: Number(row.carga_horaria_semanal ?? row.carga_horaria ?? 0),
    status: (String(row.status ?? "Ativo")) as StatusProfessor,
    email: String(row.email ?? "—"),
    iniciais: iniciaisDe(nome) || "—",
    turmas: [],
    diarioFechado: Boolean(row.diario_fechado ?? false),
  };
}

export default function GestaoProfessoresPage() {
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormDataProfessor>(formInicial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [busca, setBusca] = useState("");
  const [filtroArea, setFiltroArea] = useState("todos");
  const [filtroTitulacao, setFiltroTitulacao] = useState("todos");
  const [professorSelecionado, setProfessorSelecionado] = useState<Professor | null>(null);
  const [drawerAberto, setDrawerAberto] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<AbaProntuario>("Alocação");

  async function fetchProfessores() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("professores")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar professores:", error.message);
      setProfessores([]);
    } else {
      setProfessores((data ?? []).map((row) => mapProfessor(row as Record<string, unknown>)));
    }
    setIsLoading(false);
  }

  useEffect(() => {
    fetchProfessores();
  }, []);

  const areasUnicas = useMemo(
    () =>
      Array.from(
        new Set(professores.map((p) => p.area).filter((a) => a && a !== "—"))
      ).sort(),
    [professores]
  );

  const professoresFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return professores.filter((prof) => {
      const matchBusca =
        !termo ||
        prof.nome.toLowerCase().includes(termo) ||
        prof.matricula.includes(termo) ||
        prof.area.toLowerCase().includes(termo);
      const matchArea = filtroArea === "todos" || prof.area === filtroArea;
      const matchTitulacao =
        filtroTitulacao === "todos" || prof.titulacao === filtroTitulacao;
      return matchBusca && matchArea && matchTitulacao;
    });
  }, [professores, busca, filtroArea, filtroTitulacao]);

  function abrirProntuario(professor: Professor) {
    setProfessorSelecionado(professor);
    setAbaAtiva("Alocação");
    setDrawerAberto(true);
  }

  function fecharProntuario() {
    setDrawerAberto(false);
    window.setTimeout(() => setProfessorSelecionado(null), 300);
  }

  function atualizarCampo<K extends keyof FormDataProfessor>(
    campo: K,
    valor: FormDataProfessor[K]
  ) {
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
    const { error } = await supabase.from("professores").delete().eq("id", itemToDelete);
    if (error) {
      console.error("Erro ao excluir professor:", error.message);
      setItemToDelete(null);
      return;
    }
    setItemToDelete(null);
    await fetchProfessores();
  }

  function handleEdit(prof: Professor) {
    setFormData({
      matricula: prof.matricula,
      nome: prof.nome,
      titulacao: prof.titulacao,
      area: prof.area,
      cargaHoraria: String(prof.cargaHoraria),
    });
    setEditingId(prof.id);
    setIsModalOpen(true);
  }

  async function salvarProfessor() {
    setFormError(null);

    const matricula = formData.matricula.trim();
    const nome = formData.nome.trim();
    const area = formData.area.trim();
    const cargaHoraria = Number(formData.cargaHoraria);

    if (
      !matricula ||
      !nome ||
      !area ||
      !formData.cargaHoraria ||
      Number.isNaN(cargaHoraria)
    ) {
      setFormError("Preencha todos os campos obrigatórios.");
      return;
    }

    setIsSubmitting(true);
    const payload = {
      matricula,
      nome,
      titulacao: formData.titulacao,
      area_atuacao: area,
      carga_horaria_semanal: cargaHoraria,
    };
    const { error } = editingId
      ? await supabase.from("professores").update(payload).eq("id", editingId)
      : await supabase.from("professores").insert(payload);
    setIsSubmitting(false);

    if (error) {
      console.error("Erro ao cadastrar professor:", error.message);
      setFormError(error.message);
      return;
    }

    const wasEditing = !!editingId;
    fecharModal();
    await fetchProfessores();
    setSuccessMessage(wasEditing ? "Professor atualizado com sucesso!" : "Professor cadastrado com sucesso!");
    setTimeout(() => setSuccessMessage(null), 3000);
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
          {navItems.map(({ icon: Icon, label, href, active }) =>
            href.startsWith("/adm") ? (
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
                Gestão de Professores
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                Administre o corpo docente, alocações e conformidade acadêmica.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              Cadastrar Novo Professor
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
                  placeholder="Buscar por nome ou matrícula..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-zinc-600 transition-colors"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <div className="relative min-w-[200px]">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                  <select
                    value={filtroArea}
                    onChange={(e) => setFiltroArea(e.target.value)}
                    className="w-full appearance-none pl-10 pr-8 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white outline-none focus:border-zinc-600 transition-colors"
                  >
                    <option value="todos">Todas as áreas</option>
                    {areasUnicas.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative min-w-[180px]">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                  <select
                    value={filtroTitulacao}
                    onChange={(e) => setFiltroTitulacao(e.target.value)}
                    className="w-full appearance-none pl-10 pr-8 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white outline-none focus:border-zinc-600 transition-colors"
                  >
                    <option value="todos">Todas as titulações</option>
                    {titulacoes.map((tit) => (
                      <option key={tit} value={tit}>
                        {tit}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Tabela */}
          <div className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Corpo Docente</h2>
              <span className="text-xs text-zinc-500">
                {isLoading
                  ? "Carregando..."
                  : `${professoresFiltrados.length} registro${professoresFiltrados.length !== 1 ? "s" : ""}`}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[860px]">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="px-6 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest">
                      Matrícula
                    </th>
                    <th className="px-4 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest">
                      Nome do Professor
                    </th>
                    <th className="px-4 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest">
                      Titulação
                    </th>
                    <th className="px-4 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest">
                      Área de Atuação
                    </th>
                    <th className="px-4 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest">
                      Carga Horária
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
                        colSpan={7}
                        className="px-6 py-16 text-center text-sm text-zinc-500"
                      >
                        Carregando professores...
                      </td>
                    </tr>
                  ) : professoresFiltrados.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-12 text-center text-sm text-zinc-500"
                      >
                        Nenhum professor encontrado com os filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    professoresFiltrados.map((prof) => (
                      <tr
                        key={prof.id || prof.matricula}
                        onClick={() => abrirProntuario(prof)}
                        className="border-b border-zinc-800 last:border-b-0 hover:bg-zinc-900/40 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-4 text-sm text-zinc-400 font-mono">
                          {prof.matricula}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-200 shrink-0">
                              {prof.iniciais}
                            </div>
                            <span className="text-sm font-medium text-white">
                              {prof.nome}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-zinc-400">
                          {prof.titulacao}
                        </td>
                        <td className="px-4 py-4 text-sm text-zinc-400">{prof.area}</td>
                        <td className="px-4 py-4 text-sm text-zinc-400">
                          {prof.cargaHoraria}h/semana
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${
                              statusBadge[prof.status] ??
                              "bg-zinc-900 text-zinc-400 border-zinc-800"
                            }`}
                          >
                            {prof.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleEdit(prof); }}
                              className="p-1.5 rounded-md text-zinc-500 hover:text-blue-500 hover:bg-zinc-800 transition-colors"
                              aria-label="Editar professor"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setItemToDelete(prof.id); }}
                              className="p-1.5 rounded-md text-zinc-500 hover:text-red-500 hover:bg-zinc-800 transition-colors"
                              aria-label="Excluir professor"
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
        </div>

        {/* Overlay */}
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
          {professorSelecionado && (
            <>
              <div className="px-6 py-5 border-b border-zinc-800 flex items-start justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-14 h-14 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                    <Briefcase className="w-7 h-7 text-zinc-300" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">
                      Prontuário do Docente
                    </p>
                    <h3 className="text-lg font-semibold text-white truncate">
                      {professorSelecionado.nome}
                    </h3>
                    <p className="text-sm text-zinc-400 mt-0.5">
                      <span className="font-mono">MAT {professorSelecionado.matricula}</span>
                      <span className="text-zinc-600 mx-1.5">·</span>
                      {professorSelecionado.titulacao}
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
                {abaAtiva === "Alocação" && (
                  <div className="space-y-4">
                    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-3">
                      <Campo label="Área de atuação" valor={professorSelecionado.area} />
                      <Campo
                        label="Carga horária"
                        valor={`${professorSelecionado.cargaHoraria}h/semana`}
                      />
                      <Campo label="E-mail institucional" valor={professorSelecionado.email} />
                      <Campo label="Status" valor={professorSelecionado.status} />
                    </div>

                    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
                      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">
                        Turmas alocadas
                      </p>
                      {professorSelecionado.turmas.length === 0 ? (
                        <p className="text-sm text-zinc-500">Nenhuma turma no semestre.</p>
                      ) : (
                        <ul className="space-y-2">
                          {professorSelecionado.turmas.map((turma) => (
                            <li
                              key={turma}
                              className="flex items-center gap-2 text-sm text-zinc-300"
                            >
                              <BookOpen className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                              {turma}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}

                {abaAtiva === "Conformidade" && (
                  <div className="space-y-4">
                    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
                      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4">
                        Checklist acadêmico
                      </p>
                      <ul className="space-y-3">
                        <ChecklistItem
                          ok={professorSelecionado.diarioFechado}
                          label="Diário de classe fechado"
                          detalhe={
                            professorSelecionado.diarioFechado
                              ? "Todas as turmas com diário encerrado"
                              : "Há turmas com diário pendente"
                          }
                        />
                        <ChecklistItem
                          ok={true}
                          label="Plano de ensino enviado"
                          detalhe="Documentação no Storage"
                        />
                        <ChecklistItem
                          ok={professorSelecionado.status === "Ativo"}
                          label="Disponibilidade confirmada"
                          detalhe={
                            professorSelecionado.status === "Ativo"
                              ? "Docente disponível neste semestre"
                              : `Status atual: ${professorSelecionado.status}`
                          }
                        />
                      </ul>
                    </div>

                    {!professorSelecionado.diarioFechado && (
                      <div className="rounded-lg bg-amber-950/30 border border-amber-900/40 p-3 flex gap-3">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-200/90 leading-relaxed">
                          O diário de classe ainda não foi fechado. Dispare uma cobrança
                          automática via Resend.
                        </p>
                      </div>
                    )}

                    <button
                      type="button"
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors"
                    >
                      <Send className="w-4 h-4" />
                      Disparar Cobrança de Diário
                    </button>
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
                            <AlertCircle className="w-4 h-4 text-orange-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wide text-orange-400 mb-1.5">
                              Alerta de Retenção
                            </p>
                            <p className="text-sm text-zinc-300 leading-relaxed">
                              A turma de Banco de Dados apresentou queda de 35% no
                              rendimento com este docente em relação ao semestre anterior.
                              Avaliar plano de ensino.
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3">
                            <p className="text-[11px] text-zinc-500 uppercase tracking-widest">
                              Queda
                            </p>
                            <p className="text-lg font-semibold text-orange-400 mt-1">
                              −35%
                            </p>
                          </div>
                          <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3">
                            <p className="text-[11px] text-zinc-500 uppercase tracking-widest">
                              Turma
                            </p>
                            <p className="text-lg font-semibold text-white mt-1">BD</p>
                          </div>
                        </div>

                        <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3 flex items-start gap-2">
                          <Clock className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                          <p className="text-xs text-zinc-400 leading-relaxed">
                            Comparativo gerado com base nas médias finais do semestre
                            anterior versus N1/N2 atuais.
                          </p>
                        </div>
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
              aria-labelledby="modal-novo-professor-titulo"
              className="bg-zinc-950 border border-zinc-800 rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <h2
                    id="modal-novo-professor-titulo"
                    className="text-lg font-semibold text-white tracking-tight"
                  >
                    {editingId ? "Editar Professor" : "Cadastrar Novo Professor"}
                  </h2>
                  <p className="text-sm text-zinc-500 mt-1">
                    {editingId
                      ? "Atualize os dados do professor abaixo."
                      : "O status será definido automaticamente como Ativo pelo sistema."}
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
                  void salvarProfessor();
                }}
                className="space-y-4"
              >
                <div>
                  <label className={labelClass} htmlFor="prof-matricula">
                    Matrícula
                  </label>
                  <input
                    id="prof-matricula"
                    type="text"
                    required
                    value={formData.matricula}
                    onChange={(e) => atualizarCampo("matricula", e.target.value)}
                    className={inputClass}
                    placeholder="Ex: 9012"
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="prof-nome">
                    Nome
                  </label>
                  <input
                    id="prof-nome"
                    type="text"
                    required
                    value={formData.nome}
                    onChange={(e) => atualizarCampo("nome", e.target.value)}
                    className={inputClass}
                    placeholder="Nome completo do professor"
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="prof-titulacao">
                    Titulação
                  </label>
                  <select
                    id="prof-titulacao"
                    required
                    value={formData.titulacao}
                    onChange={(e) =>
                      atualizarCampo("titulacao", e.target.value as Titulacao)
                    }
                    className={inputClass}
                  >
                    {titulacoes.map((tit) => (
                      <option key={tit} value={tit}>
                        {tit}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass} htmlFor="prof-area">
                    Área de Atuação
                  </label>
                  <input
                    id="prof-area"
                    type="text"
                    required
                    value={formData.area}
                    onChange={(e) => atualizarCampo("area", e.target.value)}
                    className={inputClass}
                    placeholder="Ex: Engenharia de Software"
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="prof-carga">
                    Carga Horária (h/semana)
                  </label>
                  <input
                    id="prof-carga"
                    type="number"
                    required
                    min={1}
                    max={80}
                    value={formData.cargaHoraria}
                    onChange={(e) => atualizarCampo("cargaHoraria", e.target.value)}
                    className={inputClass}
                    placeholder="Ex: 20"
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
                    {isSubmitting ? "Salvando..." : editingId ? "Atualizar Professor" : "Salvar Professor"}
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
                    Esta ação é irreversível. O professor será removido permanentemente do sistema.
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
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="text-sm font-medium">{successMessage}</span>
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

function ChecklistItem({
  ok,
  label,
  detalhe,
}: {
  ok: boolean;
  label: string;
  detalhe: string;
}) {
  return (
    <li className="flex items-start gap-3">
      {ok ? (
        <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
      ) : (
        <Circle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
      )}
      <div className="min-w-0">
        <p className={`text-sm font-medium ${ok ? "text-zinc-200" : "text-amber-200"}`}>
          {label}
        </p>
        <p className="text-xs text-zinc-500 mt-0.5">{detalhe}</p>
      </div>
    </li>
  );
}
