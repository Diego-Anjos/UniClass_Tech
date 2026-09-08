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
  UserPlus,
  CalendarDays,
  Sparkles,
  X,
  Layers,
  User,
  AlertTriangle,
  Pencil,
  Trash2,
  CheckCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Turno = "Manhã" | "Noite";
type StatusTurma = "Aberta" | "Em andamento" | "Fechada";
type AbaTurma = "Disciplinas & Professores" | "Lista de Alunos" | "Automação & IA";

type DisciplinaAlocada = {
  nome: string;
  professor: string;
};

type AlunoTurma = {
  ra: string;
  nome: string;
};

type Turma = {
  id: string;
  codigo: string;
  curso: string;
  turno: Turno;
  ocupacao: number;
  capacidade: number;
  status: StatusTurma;
  semestre: string;
  disciplinas: DisciplinaAlocada[];
  alunos: AlunoTurma[];
};

type FormDataTurma = {
  codigo: string;
  curso: string;
  turno: Turno;
  capacidade: string;
};

const formInicial: FormDataTurma = {
  codigo: "",
  curso: "",
  turno: "Manhã",
  capacidade: "",
};

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral", href: "/adm/dashboard", active: false },
  { icon: Users, label: "Gestão de Alunos", href: "/adm/dashboard/alunos", active: false },
  {
    icon: GraduationCap,
    label: "Gestão de Professores",
    href: "/adm/dashboard/professores",
    active: false,
  },
  {
    icon: BookOpen,
    label: "Turmas e Matrículas",
    href: "/adm/dashboard/turmas",
    active: true,
  },
  {
    icon: Settings,
    label: "Configurações do Sistema",
    href: "/adm/dashboard/configuracoes",
    active: false,
  },
];

const statusBadge: Record<StatusTurma, string> = {
  Aberta: "bg-green-950 text-green-400 border-green-900/50",
  "Em andamento": "bg-sky-950 text-sky-400 border-sky-900/50",
  Fechada: "bg-zinc-800 text-zinc-400 border-zinc-700",
};

const abas: AbaTurma[] = [
  "Disciplinas & Professores",
  "Lista de Alunos",
  "Automação & IA",
];

function ocupacaoPercentual(ocupacao: number, capacidade: number) {
  if (capacidade <= 0) return 0;
  return Math.round((ocupacao / capacidade) * 100);
}

function corBarraOcupacao(pct: number) {
  if (pct >= 90) return "bg-red-500";
  if (pct >= 70) return "bg-amber-500";
  if (pct >= 40) return "bg-sky-500";
  return "bg-zinc-500";
}

function mapTurma(row: Record<string, unknown>): Turma {
  return {
    id: String(row.id ?? ""),
    codigo: String(row.codigo ?? "—"),
    curso: String(row.curso ?? "—"),
    turno: (String(row.turno ?? "Manhã")) as Turno,
    ocupacao: Number(row.ocupacao ?? 0),
    capacidade: Number(row.capacidade ?? 0),
    status: (String(row.status ?? "Aberta")) as StatusTurma,
    semestre: String(row.semestre ?? "—"),
    disciplinas: [],
    alunos: [],
  };
}

export default function TurmasMatriculasPage() {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormDataTurma>(formInicial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterTurno, setFilterTurno] = useState("Todos");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [turmaSelecionada, setTurmaSelecionada] = useState<Turma | null>(null);
  const [drawerAberto, setDrawerAberto] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<AbaTurma>("Disciplinas & Professores");

  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);

  async function fetchTurmas() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("turmas")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar turmas:", error.message);
      setTurmas([]);
    } else {
      setTurmas((data ?? []).map((row) => mapTurma(row as Record<string, unknown>)));
    }
    setIsLoading(false);
  }

  useEffect(() => {
    fetchTurmas();
  }, []);

  const turmasFiltradas = useMemo(() => {
    const termo = searchTerm.trim().toLowerCase();

    return turmas.filter((turma) => {
      const matchBusca =
        !termo ||
        turma.codigo.toLowerCase().includes(termo) ||
        turma.curso.toLowerCase().includes(termo);

      const matchTurno =
        !filterTurno ||
        filterTurno === "Todos" ||
        turma.turno === filterTurno;

      const matchStatus =
        !filterStatus ||
        filterStatus === "Todos" ||
        turma.status === filterStatus;

      return matchBusca && matchTurno && matchStatus;
    });
  }, [turmas, searchTerm, filterTurno, filterStatus]);

  async function gerarInsightIA(turma: Turma) {
    setAiInsight(null);
    setIsGeneratingInsight(true);
    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          curso:      turma.curso,
          capacidade: turma.capacidade,
          ocupacao:   turma.ocupacao,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro na API de insights.");
      setAiInsight(json.insight as string);
    } catch (err) {
      console.error("Erro ao gerar insight:", err);
      setAiInsight("Não foi possível gerar a análise no momento. Tente novamente.");
    } finally {
      setIsGeneratingInsight(false);
    }
  }

  function abrirGestao(turma: Turma) {
    setTurmaSelecionada(turma);
    setAbaAtiva("Disciplinas & Professores");
    setAiInsight(null);
    setDrawerAberto(true);
    void gerarInsightIA(turma);
  }

  function fecharGestao() {
    setDrawerAberto(false);
    setAiInsight(null);
    window.setTimeout(() => setTurmaSelecionada(null), 300);
  }

  function atualizarCampo<K extends keyof FormDataTurma>(
    campo: K,
    valor: FormDataTurma[K]
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
    const { error } = await supabase.from("turmas").delete().eq("id", itemToDelete);
    if (error) {
      console.error("Erro ao excluir turma:", error.message);
      setItemToDelete(null);
      return;
    }
    setItemToDelete(null);
    await fetchTurmas();
  }

  function handleEdit(turma: Turma) {
    setFormData({
      codigo: turma.codigo,
      curso: turma.curso,
      turno: turma.turno,
      capacidade: String(turma.capacidade),
    });
    setEditingId(turma.id);
    setIsModalOpen(true);
  }

  async function salvarTurma() {
    setFormError(null);

    const codigo = formData.codigo.trim();
    const curso = formData.curso.trim();
    const capacidade = Number(formData.capacidade);

    if (!codigo || !curso || !formData.capacidade || Number.isNaN(capacidade)) {
      setFormError("Preencha todos os campos obrigatórios.");
      return;
    }

    setIsSubmitting(true);
    const payload = { codigo, curso, turno: formData.turno, capacidade };
    const { error } = editingId
      ? await supabase.from("turmas").update(payload).eq("id", editingId)
      : await supabase.from("turmas").insert(payload);
    setIsSubmitting(false);

    if (error) {
      console.error("Erro ao cadastrar turma:", error.message);
      setFormError(error.message);
      return;
    }

    const wasEditing = !!editingId;
    fecharModal();
    await fetchTurmas();
    setSuccessMessage(wasEditing ? "Turma atualizada com sucesso!" : "Turma criada com sucesso!");
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
                Turmas e Matrículas
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                Gerencie turmas, ocupação de vagas e automações acadêmicas.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              Abrir Nova Turma
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
                  placeholder="Buscar por código da turma ou curso..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-zinc-600 transition-colors"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <div className="relative min-w-[160px]">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                  <select
                    value={filterTurno}
                    onChange={(e) => setFilterTurno(e.target.value)}
                    className="w-full appearance-none pl-10 pr-8 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white outline-none focus:border-zinc-600 transition-colors"
                  >
                    <option value="Todos">Todos</option>
                    <option value="Manhã">Manhã</option>
                    <option value="Noite">Noite</option>
                  </select>
                </div>

                <div className="relative min-w-[180px]">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full appearance-none pl-10 pr-8 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white outline-none focus:border-zinc-600 transition-colors"
                  >
                    <option value="Todos">Todos</option>
                    <option value="Aberta">Aberta</option>
                    <option value="Em andamento">Em andamento</option>
                    <option value="Fechada">Fechada</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Tabela */}
          <div className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Turmas Cadastradas</h2>
              <span className="text-xs text-zinc-500">
                {isLoading
                  ? "Carregando..."
                  : `${turmasFiltradas.length} registro${turmasFiltradas.length !== 1 ? "s" : ""}`}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[820px]">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="px-6 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest">
                      Código da Turma
                    </th>
                    <th className="px-4 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest">
                      Curso
                    </th>
                    <th className="px-4 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest">
                      Turno
                    </th>
                    <th className="px-4 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest">
                      Ocupação
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
                        Carregando turmas...
                      </td>
                    </tr>
                  ) : turmasFiltradas.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-center text-sm text-zinc-500"
                      >
                        Nenhuma turma encontrada com os filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    turmasFiltradas.map((turma) => {
                      const pct = ocupacaoPercentual(turma.ocupacao, turma.capacidade);
                      return (
                        <tr
                          key={turma.id || turma.codigo}
                          onClick={() => abrirGestao(turma)}
                          className="border-b border-zinc-800 last:border-b-0 hover:bg-zinc-900/40 transition-colors cursor-pointer"
                        >
                          <td className="px-6 py-4 text-sm font-mono font-medium text-white">
                            {turma.codigo}
                          </td>
                          <td className="px-4 py-4 text-sm text-zinc-400 max-w-[280px]">
                            <span className="line-clamp-1">{turma.curso}</span>
                          </td>
                          <td className="px-4 py-4 text-sm text-zinc-400">{turma.turno}</td>
                          <td className="px-4 py-4 min-w-[160px]">
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-zinc-300">
                                  {turma.ocupacao}/{turma.capacidade}
                                </span>
                                <span className="text-zinc-500">{pct}%</span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${corBarraOcupacao(pct)}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${
                                statusBadge[turma.status] ??
                                "bg-zinc-900 text-zinc-400 border-zinc-800"
                              }`}
                            >
                              {turma.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleEdit(turma); }}
                                className="p-1.5 rounded-md text-zinc-500 hover:text-blue-500 hover:bg-zinc-800 transition-colors"
                                aria-label="Editar turma"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setItemToDelete(turma.id); }}
                                className="p-1.5 rounded-md text-zinc-500 hover:text-red-500 hover:bg-zinc-800 transition-colors"
                                aria-label="Excluir turma"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Overlay */}
        <button
          type="button"
          aria-label="Fechar gestão da turma"
          onClick={fecharGestao}
          className={`absolute inset-0 bg-black/60 backdrop-blur-[2px] z-40 transition-opacity duration-300 ${
            drawerAberto
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        />

        {/* Drawer */}
        <aside
          className={`absolute right-0 top-0 h-full w-full max-w-md bg-zinc-950 border-l border-zinc-800 z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-out ${
            drawerAberto ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {turmaSelecionada && (
            <>
              <div className="px-6 py-5 border-b border-zinc-800 flex items-start justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-14 h-14 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                    <Layers className="w-7 h-7 text-zinc-300" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">
                      Gestão da Turma
                    </p>
                    <h3 className="text-lg font-semibold text-white font-mono truncate">
                      {turmaSelecionada.codigo}
                    </h3>
                    <p className="text-sm text-zinc-400 mt-0.5 line-clamp-2">
                      {turmaSelecionada.curso}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={fecharGestao}
                  className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-4 pt-4 border-b border-zinc-800">
                <div className="flex gap-1 overflow-x-auto">
                  {abas.map((aba) => (
                    <button
                      key={aba}
                      type="button"
                      onClick={() => setAbaAtiva(aba)}
                      className={`px-3 py-2.5 text-xs font-medium rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
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
                {abaAtiva === "Disciplinas & Professores" && (
                  <div className="space-y-4">
                    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-3">
                      <Campo label="Turno" valor={turmaSelecionada.turno} />
                      <Campo label="Semestre" valor={turmaSelecionada.semestre} />
                      <Campo label="Status" valor={turmaSelecionada.status} />
                      <Campo
                        label="Ocupação"
                        valor={`${turmaSelecionada.ocupacao}/${turmaSelecionada.capacidade} (${ocupacaoPercentual(turmaSelecionada.ocupacao, turmaSelecionada.capacidade)}%)`}
                      />
                    </div>

                    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
                      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">
                        Disciplinas e docentes
                      </p>
                      {turmaSelecionada.disciplinas.length === 0 ? (
                        <p className="text-sm text-zinc-500">
                          Nenhuma disciplina alocada nesta turma.
                        </p>
                      ) : (
                        <ul className="space-y-3">
                          {turmaSelecionada.disciplinas.map((d) => (
                            <li
                              key={d.nome}
                              className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-black/30 px-3 py-3"
                            >
                              <BookOpen className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-white">{d.nome}</p>
                                <p className="text-xs text-zinc-500 mt-0.5">{d.professor}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}

                {abaAtiva === "Lista de Alunos" && (
                  <div className="space-y-4">
                    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-xs text-zinc-500 uppercase tracking-widest">
                          Matriculados
                        </p>
                        <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
                          <Users className="w-3.5 h-3.5" />
                          {turmaSelecionada.alunos.length} aluno
                          {turmaSelecionada.alunos.length !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {turmaSelecionada.alunos.length === 0 ? (
                        <p className="text-sm text-zinc-500 py-4 text-center">
                          Nenhum aluno matriculado nesta turma.
                        </p>
                      ) : (
                        <ul className="divide-y divide-zinc-800">
                          {turmaSelecionada.alunos.map((aluno) => (
                            <li
                              key={aluno.ra}
                              className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                            >
                              <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                                <User className="w-4 h-4 text-zinc-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-white truncate">
                                  {aluno.nome}
                                </p>
                                <p className="text-xs text-zinc-500 font-mono">
                                  RA {aluno.ra}
                                </p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}

                {abaAtiva === "Automação & IA" && turmaSelecionada && (
                  <div className="space-y-4">
                    <button
                      type="button"
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors"
                    >
                      <CalendarDays className="w-4 h-4" />
                      Sincronizar Google Calendar (Alunos e Docentes)
                    </button>

                    {/* ── Painel Preditivo Groq ─────────────────────────── */}
                    <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
                      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-zinc-400" />
                          <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
                            Painel Preditivo · Groq / Llama 3
                          </p>
                        </div>
                        {/* Botão para re-gerar */}
                        {!isGeneratingInsight && (
                          <button
                            type="button"
                            onClick={() => void gerarInsightIA(turmaSelecionada)}
                            className="text-[11px] text-zinc-500 hover:text-white transition-colors underline underline-offset-2"
                          >
                            Reanalisar
                          </button>
                        )}
                      </div>

                      <div className="p-4 space-y-4">
                        {/* Mini-cards com dados reais da turma */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3">
                            <p className="text-[11px] text-zinc-500 uppercase tracking-widest">
                              Ocupação atual
                            </p>
                            <p className={`text-lg font-semibold mt-1 ${
                              ocupacaoPercentual(turmaSelecionada.ocupacao, turmaSelecionada.capacidade) >= 90
                                ? "text-red-400"
                                : ocupacaoPercentual(turmaSelecionada.ocupacao, turmaSelecionada.capacidade) >= 70
                                ? "text-amber-400"
                                : "text-sky-400"
                            }`}>
                              {ocupacaoPercentual(turmaSelecionada.ocupacao, turmaSelecionada.capacidade)}%
                            </p>
                          </div>
                          <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3">
                            <p className="text-[11px] text-zinc-500 uppercase tracking-widest">
                              Vagas
                            </p>
                            <p className="text-lg font-semibold text-white mt-1">
                              {turmaSelecionada.ocupacao}
                              <span className="text-zinc-500 text-sm font-normal">
                                /{turmaSelecionada.capacidade}
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* ── Skeleton de carregamento ── */}
                        {isGeneratingInsight && (
                          <div className="rounded-lg bg-black/40 border border-zinc-800 p-4 space-y-3">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-5 h-5 rounded-full border-2 border-zinc-600 border-t-white animate-spin shrink-0" />
                              <p className="text-xs text-zinc-500 animate-pulse">
                                A IA está analisando o cenário da turma...
                              </p>
                            </div>
                            <div className="h-3 rounded bg-zinc-800 animate-pulse w-full" />
                            <div className="h-3 rounded bg-zinc-800 animate-pulse w-5/6" />
                            <div className="h-3 rounded bg-zinc-800 animate-pulse w-4/6" />
                          </div>
                        )}

                        {/* ── Insight real da Groq ── */}
                        {!isGeneratingInsight && aiInsight && (
                          <div className="rounded-lg bg-black/40 border-l-4 border-violet-500 border border-violet-900/40 p-4 flex gap-3">
                            <div className="w-9 h-9 rounded-lg bg-violet-950/60 border border-violet-900/50 flex items-center justify-center shrink-0">
                              <Sparkles className="w-4 h-4 text-violet-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold uppercase tracking-wide text-violet-400 mb-1.5">
                                Análise de Ocupação · IA
                              </p>
                              <p className="text-sm text-zinc-300 leading-relaxed">
                                {aiInsight}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* ── Estado vazio (sem erro, sem insight ainda) ── */}
                        {!isGeneratingInsight && !aiInsight && (
                          <p className="text-sm text-zinc-600 text-center py-2">
                            Nenhuma análise disponível.
                          </p>
                        )}
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
              aria-labelledby="modal-nova-turma-titulo"
              className="bg-zinc-950 border border-zinc-800 rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <h2
                    id="modal-nova-turma-titulo"
                    className="text-lg font-semibold text-white tracking-tight"
                  >
                    {editingId ? "Editar Turma" : "Abrir Nova Turma"}
                  </h2>
                  <p className="text-sm text-zinc-500 mt-1">
                    {editingId
                      ? "Atualize os dados da turma abaixo."
                      : "O status será definido automaticamente como Aberta pelo sistema."}
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
                  void salvarTurma();
                }}
                className="space-y-4"
              >
                <div>
                  <label className={labelClass} htmlFor="turma-codigo">
                    Código da Turma
                  </label>
                  <input
                    id="turma-codigo"
                    type="text"
                    required
                    value={formData.codigo}
                    onChange={(e) => atualizarCampo("codigo", e.target.value)}
                    className={inputClass}
                    placeholder="Ex: ES-3A-M"
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="turma-curso">
                    Curso
                  </label>
                  <input
                    id="turma-curso"
                    type="text"
                    required
                    value={formData.curso}
                    onChange={(e) => atualizarCampo("curso", e.target.value)}
                    className={inputClass}
                    placeholder="Ex: Engenharia de Software"
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="turma-turno">
                    Turno
                  </label>
                  <select
                    id="turma-turno"
                    required
                    value={formData.turno}
                    onChange={(e) =>
                      atualizarCampo("turno", e.target.value as Turno)
                    }
                    className={inputClass}
                  >
                    <option value="Manhã">Manhã</option>
                    <option value="Noite">Noite</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass} htmlFor="turma-capacidade">
                    Capacidade (vagas)
                  </label>
                  <input
                    id="turma-capacidade"
                    type="number"
                    required
                    min={1}
                    max={200}
                    value={formData.capacidade}
                    onChange={(e) => atualizarCampo("capacidade", e.target.value)}
                    className={inputClass}
                    placeholder="Ex: 40"
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
                    {isSubmitting ? "Salvando..." : editingId ? "Atualizar Turma" : "Salvar Turma"}
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
                    Esta ação é irreversível. A turma será removida permanentemente do sistema.
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
