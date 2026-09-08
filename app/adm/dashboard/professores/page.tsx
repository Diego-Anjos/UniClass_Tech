"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
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
import { ModalFeedback } from "@/components/ModalFeedback";

type StatusProfessor = "Ativo" | "Licença" | "Inativo";
type Titulacao = "Especialista" | "Mestre(a)" | "Doutor(a)";
type AbaProntuario = "Alocação" | "Conformidade" | "Insights de IA";
type AbaCadastro = "docente" | "documentos" | "contato";

type Professor = {
  id: string;
  matricula: string;
  nome: string;
  cpf: string;
  titulacao: Titulacao;
  area_atuacao: string;
  carga_horaria: number;
  status: StatusProfessor;
  email: string;
  iniciais: string;
  diarioFechado: boolean;
  pis: string;
  lattes_url: string;
  email_pessoal: string;
  email_institucional: string;
  telefone: string;
};

type AiInsight = {
  tipoAlerta: string;
  corAlerta: "amber" | "emerald" | "blue" | string;
  mensagem: string;
  metricaValor: string;
  metricaLabel: string;
  turmaDestaque: string;
  detalheComparativo: string;
};

type TurmaAlocada = {
  id: string;
  codigo: string;
  curso: string;
  turno: string;
  diario_fechado?: boolean;
};

type FormDataProfessor = {
  matricula: string;
  nome: string;
  titulacao: Titulacao | "";
  area: string;
  cargaHoraria: string;
  cpf: string;
  pis: string;
  lattes_url: string;
  email_pessoal: string;
  email_institucional: string;
  telefone: string;
};

type TurmaDisponivel = {
  id: string;
  codigo: string;
  curso: string;
  turno: string;
};

const formInicial: FormDataProfessor = {
  matricula: "",
  nome: "",
  titulacao: "",
  area: "",
  cargaHoraria: "",
  cpf: "",
  pis: "",
  lattes_url: "",
  email_pessoal: "",
  email_institucional: "",
  telefone: "",
};

const statusBadge: Record<StatusProfessor, string> = {
  Ativo: "bg-green-950 text-green-400 border-green-900/50",
  Licença: "bg-amber-950 text-amber-400 border-amber-900/50",
  Inativo: "bg-red-950 text-red-400 border-red-900/50",
};

const titulacoes: Titulacao[] = ["Especialista", "Mestre(a)", "Doutor(a)"];

const abasCadastro: { id: AbaCadastro; label: string }[] = [
  { id: "docente", label: "1. Docência & Turma" },
  { id: "documentos", label: "2. Documentação & Lattes" },
  { id: "contato", label: "3. Contato & Acesso" },
];

function normalizarTitulacao(valor: string): Titulacao {
  const v = valor.trim();
  if (v === "Mestre" || v === "Mestre(a)" || v === "Mestre / Mestra") return "Mestre(a)";
  if (v === "Doutor" || v === "Doutor(a)") return "Doutor(a)";
  if (v === "Especialista") return "Especialista";
  return "Especialista";
}
const abas: AbaProntuario[] = ["Alocação", "Conformidade", "Insights de IA"];

function iniciaisDe(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function gerarEmailInstitucional(nome: string) {
  const partes = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (partes.length === 0) return "";
  if (partes.length === 1) return `${partes[0]}@uniclasstech.edu.br`;
  return `${partes[0]}.${partes[partes.length - 1]}@uniclasstech.edu.br`;
}

function mascaraCPF(valor: string) {
  const digits = valor.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function mascaraPIS(valor: string) {
  const digits = valor.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{5})(\d)/, "$1.$2")
    .replace(/(\d{2})(\d{1})$/, "$1-$2");
}

function mascaraTelefone(valor: string) {
  const digits = valor.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function mapProfessor(row: Record<string, unknown>): Professor {
  const nome = String(row.nome ?? "");
  const emailInstitucional = String(
    row.email_institucional ?? row.email ?? "—"
  );
  return {
    id: String(row.id ?? ""),
    matricula: String(row.matricula ?? "—"),
    nome,
    cpf: String(row.cpf ?? ""),
    titulacao: normalizarTitulacao(String(row.titulacao ?? "Especialista")),
    area_atuacao: String(row.area_atuacao ?? row.area ?? "—"),
    carga_horaria: Number(row.carga_horaria ?? row.carga_horaria_semanal ?? 0),
    status: (String(row.status ?? "Ativo")) as StatusProfessor,
    email: emailInstitucional,
    iniciais: iniciaisDe(nome) || "—",
    diarioFechado: Boolean(row.diario_fechado ?? false),
    pis: String(row.pis ?? ""),
    lattes_url: String(row.lattes_url ?? ""),
    email_pessoal: String(row.email_pessoal ?? ""),
    email_institucional: emailInstitucional === "—" ? "" : emailInstitucional,
    telefone: String(row.telefone ?? ""),
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
  const [turmasDisponiveis, setTurmasDisponiveis] = useState<TurmaDisponivel[]>([]);
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

  const [searchTerm, setSearchTerm] = useState("");
  const [filterTitulacao, setFilterTitulacao] = useState("Todas");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [professorSelecionado, setProfessorSelecionado] = useState<Professor | null>(null);
  const [drawerAberto, setDrawerAberto] = useState(false);
  const [abaProntuario, setAbaProntuario] = useState<AbaProntuario>("Alocação");
  const [abaAtiva, setAbaAtiva] = useState<AbaCadastro>("docente");
  const [turmasDoProfessor, setTurmasDoProfessor] = useState<TurmaAlocada[]>([]);
  const [aiInsight, setAiInsight] = useState<AiInsight | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [disparandoCobranca, setDisparandoCobranca] = useState(false);

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

  async function fetchTurmasDisponiveis() {
    const { data, error } = await supabase
      .from("turmas")
      .select("id, codigo, curso, turno");

    if (error) {
      console.error("Erro ao buscar turmas:", error.message);
      setTurmasDisponiveis([]);
      return;
    }

    if (data && data.length > 0) {
      setTurmasDisponiveis(
        data.map((t) => ({
          id: String(t.id),
          codigo: String(t.codigo ?? "—"),
          curso: String(t.curso ?? "—"),
          turno: String(t.turno ?? "—"),
        }))
      );
    } else {
      setTurmasDisponiveis([]);
    }
  }

  useEffect(() => {
    void fetchProfessores();
    void fetchTurmasDisponiveis();
  }, []);

  useEffect(() => {
    const email = gerarEmailInstitucional(formData.nome);
    setFormData((prev) =>
      prev.email_institucional === email
        ? prev
        : { ...prev, email_institucional: email }
    );
  }, [formData.nome]);

  useEffect(() => {
    if (!professorSelecionado?.id) {
      setTurmasDoProfessor([]);
      setAiInsight(null);
      setIsLoadingAi(false);
      return;
    }

    const professor = professorSelecionado;
    let cancelado = false;

    async function carregarTurmasEInsight() {
      const area =
        professor.area_atuacao && professor.area_atuacao !== "—"
          ? professor.area_atuacao
          : "";

      let turmas: TurmaAlocada[] = [];

      if (area) {
        const { data, error } = await supabase
          .from("turmas")
          .select("*")
          .ilike("curso", `%${area}%`);

        if (error) {
          console.error("Erro ao buscar turmas do professor:", error.message);
        } else {
          turmas = (data ?? []).map((t) => ({
            id: String(t.id ?? ""),
            codigo: String(t.codigo ?? "—"),
            curso: String(t.curso ?? "—"),
            turno: String(t.turno ?? "—"),
            diario_fechado: Boolean(t.diario_fechado ?? false),
          }));
        }
      }

      if (cancelado) return;
      setTurmasDoProfessor(turmas);

      setIsLoadingAi(true);
      setAiInsight(null);
      try {
        const res = await fetch("/api/insights/professor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome: professor.nome,
            titulacao: professor.titulacao,
            area_atuacao: area || "Não definida",
            carga_horaria: professor.carga_horaria,
            turmasCount: turmas.length,
          }),
        });
        const data = (await res.json()) as AiInsight;
        if (!cancelado) setAiInsight(data);
      } catch (err) {
        console.error("Erro ao buscar insight do professor:", err);
        if (!cancelado) setAiInsight(null);
      } finally {
        if (!cancelado) setIsLoadingAi(false);
      }
    }

    void carregarTurmasEInsight();
    return () => {
      cancelado = true;
    };
  }, [professorSelecionado?.id]);

  const professoresFiltrados = useMemo(() => {
    const termo = searchTerm.trim().toLowerCase();

    return professores.filter((professor) => {
      const matchBusca =
        !termo ||
        professor.nome.toLowerCase().includes(termo) ||
        professor.cpf.toLowerCase().includes(termo);

      const matchTitulacao =
        !filterTitulacao ||
        filterTitulacao === "Todas" ||
        professor.titulacao === filterTitulacao;

      const matchStatus =
        !filterStatus ||
        filterStatus === "Todos" ||
        professor.status === filterStatus;

      return matchBusca && matchTitulacao && matchStatus;
    });
  }, [professores, searchTerm, filterTitulacao, filterStatus]);

  function abrirProntuario(professor: Professor) {
    setProfessorSelecionado(professor);
    setAbaProntuario("Alocação");
    setDrawerAberto(true);
  }

  function fecharProntuario() {
    setDrawerAberto(false);
    window.setTimeout(() => {
      setProfessorSelecionado(null);
      setTurmasDoProfessor([]);
      setAiInsight(null);
      setIsLoadingAi(false);
    }, 300);
  }

  async function dispararCobrancaDiario() {
    if (!professorSelecionado || disparandoCobranca) return;
    setDisparandoCobranca(true);
    await new Promise((resolve) => window.setTimeout(resolve, 800));
    const destino =
      professorSelecionado.email_institucional ||
      professorSelecionado.email_pessoal ||
      professorSelecionado.email;
    abrirFeedback(
      "sucesso",
      "Cobrança Enviada",
      `Notificação formal enviada com sucesso para ${destino}.`
    );
    setDisparandoCobranca(false);
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
    setAbaAtiva("docente");
  }

  function abrirModalCadastro() {
    setFormData(formInicial);
    setFormError(null);
    setEditingId(null);
    setAbaAtiva("docente");
    void fetchTurmasDisponiveis();
    setIsModalOpen(true);
  }

  function abrirFeedback(
    tipo: "sucesso" | "erro" | "atencao",
    titulo: string,
    mensagem: string
  ) {
    setModalFeedback({ aberto: true, tipo, titulo, mensagem });
  }

  function fecharFeedback() {
    setModalFeedback((prev) => ({ ...prev, aberto: false }));
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
      matricula: prof.matricula === "—" ? "" : prof.matricula,
      nome: prof.nome,
      titulacao: prof.titulacao,
      area: prof.area_atuacao === "—" ? "" : prof.area_atuacao,
      cargaHoraria: String(prof.carga_horaria || ""),
      cpf: prof.cpf,
      pis: prof.pis,
      lattes_url: prof.lattes_url,
      email_pessoal: prof.email_pessoal,
      email_institucional:
        prof.email_institucional || gerarEmailInstitucional(prof.nome),
      telefone: prof.telefone,
    });
    setEditingId(prof.id);
    setAbaAtiva("docente");
    void fetchTurmasDisponiveis();
    setIsModalOpen(true);
  }

  async function salvarProfessor() {
    setFormError(null);

    const matricula = formData.matricula.trim();
    const nome = formData.nome.trim();
    const area = formData.area.trim();
    const titulacao = formData.titulacao;
    const cargaHoraria = Number(formData.cargaHoraria);
    const email_institucional =
      formData.email_institucional.trim() || gerarEmailInstitucional(nome);

    if (!matricula || !nome || !titulacao || !area) {
      setFormError(
        "Preencha os campos essenciais: Nome, Matrícula, Titulação e Área."
      );
      setAbaAtiva("docente");
      return;
    }

    setIsSubmitting(true);
    const payload = {
      matricula,
      nome,
      titulacao,
      area_atuacao: area,
      carga_horaria: Number.isNaN(cargaHoraria) ? null : cargaHoraria,
      cpf: formData.cpf.trim(),
      pis: formData.pis.trim(),
      lattes_url: formData.lattes_url.trim(),
      email_pessoal: formData.email_pessoal.trim(),
      email_institucional,
      telefone: formData.telefone.trim(),
      status: "Ativo" as const,
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
    abrirFeedback(
      "sucesso",
      wasEditing
        ? "Docente Atualizado com Sucesso"
        : "Docente Cadastrado com Sucesso",
      wasEditing
        ? `Dados de ${nome} atualizados. Credencial de acesso: ${email_institucional}`
        : `Professor(a) ${nome} cadastrado(a). Credencial de acesso: ${email_institucional}`
    );
  }

  const inputClass =
    "w-full px-3 py-2.5 rounded-lg bg-black border border-gray-800 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-purple-500 transition-colors";
  const labelClass = "block text-xs text-gray-400 mb-1.5";
  const inputLockedClass =
    "w-full px-3 py-2.5 rounded-lg border border-gray-800 text-sm text-zinc-300 outline-none cursor-not-allowed";

  return (
    <>
      <div className="relative min-h-[calc(100vh-8rem)]">
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
              onClick={abrirModalCadastro}
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
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nome ou CPF..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-zinc-600 transition-colors"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <div className="relative min-w-[180px]">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                  <select
                    value={filterTitulacao}
                    onChange={(e) => setFilterTitulacao(e.target.value)}
                    className="w-full appearance-none pl-10 pr-8 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white outline-none focus:border-zinc-600 transition-colors"
                  >
                    <option value="Todas">Todas</option>
                    {titulacoes.map((tit) => (
                      <option key={tit} value={tit}>
                        {tit}
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
                    <option value="Licença">Licença</option>
                    <option value="Inativo">Inativo</option>
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
                        <td className="px-4 py-4 text-sm text-zinc-400">{prof.area_atuacao}</td>
                        <td className="px-4 py-4 text-sm text-zinc-400">
                          {prof.carga_horaria}h/semana
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
                      onClick={() => setAbaProntuario(aba)}
                      className={`px-3 py-2.5 text-xs font-medium rounded-t-lg transition-colors border-b-2 ${
                        abaProntuario === aba
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
                {abaProntuario === "Alocação" && (
                  <div className="space-y-4">
                    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-3">
                      <Campo
                        label="Área de atuação"
                        valor={
                          professorSelecionado.area_atuacao &&
                          professorSelecionado.area_atuacao !== "—"
                            ? professorSelecionado.area_atuacao
                            : "Não definida"
                        }
                      />
                      <Campo
                        label="Carga horária"
                        valor={
                          professorSelecionado.carga_horaria
                            ? `${professorSelecionado.carga_horaria}h/semana`
                            : "A definir"
                        }
                      />
                      <Campo
                        label="E-mail institucional"
                        valor={
                          professorSelecionado.email_institucional ||
                          `${professorSelecionado.nome
                            .toLowerCase()
                            .replace(/\s+/g, ".")}@uniclasstech.edu.br`
                        }
                      />
                      <Campo
                        label="Status"
                        valor={professorSelecionado.status || "Ativo"}
                      />
                    </div>

                    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
                      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">
                        Turmas alocadas
                      </p>
                      {turmasDoProfessor.length === 0 ? (
                        <p className="text-sm text-zinc-500">
                          Nenhuma turma no semestre.
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {turmasDoProfessor.map((turma) => (
                            <li
                              key={turma.id || turma.codigo}
                              className="flex items-center gap-3 text-sm text-zinc-300"
                            >
                              <BookOpen className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-zinc-950 border border-zinc-700 text-zinc-300 shrink-0">
                                {turma.codigo}
                              </span>
                              <span className="min-w-0 truncate">
                                {turma.curso}
                                <span className="text-zinc-500"> · {turma.turno}</span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}

                {abaProntuario === "Conformidade" && (
                  <div className="space-y-4">
                    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
                      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4">
                        Checklist acadêmico
                      </p>
                      <ul className="space-y-3">
                        <ChecklistItem
                          ok={
                            turmasDoProfessor.length > 0 &&
                            turmasDoProfessor.every((t) => t.diario_fechado)
                          }
                          label="Diário de classe fechado"
                          detalhe={
                            turmasDoProfessor.length === 0 ||
                            turmasDoProfessor.some((t) => !t.diario_fechado)
                              ? "Há turmas com diário pendente"
                              : "Todas as turmas com diário encerrado"
                          }
                        />
                        <ChecklistItem
                          ok={Boolean(professorSelecionado.lattes_url)}
                          label="Plano de ensino enviado"
                          detalhe={
                            professorSelecionado.lattes_url
                              ? "Documentação homologada"
                              : "Pendente de envio"
                          }
                        />
                        <ChecklistItem
                          ok={true}
                          label="Disponibilidade confirmada"
                          detalhe="Docente ativo neste semestre"
                        />
                      </ul>
                    </div>

                    {(turmasDoProfessor.length === 0 ||
                      turmasDoProfessor.some((t) => !t.diario_fechado)) && (
                      <div className="rounded-lg bg-amber-950/30 border border-amber-900/40 p-3 flex gap-3">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-200/90 leading-relaxed">
                          O diário de classe ainda não foi fechado. Dispare uma
                          cobrança automática via Resend.
                        </p>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => void dispararCobrancaDiario()}
                      disabled={disparandoCobranca}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      {disparandoCobranca
                        ? "Enviando cobrança..."
                        : "Disparar Cobrança de Diário"}
                    </button>
                  </div>
                )}

                {abaProntuario === "Insights de IA" && (
                  <div className="space-y-4">
                    <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
                      <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-zinc-400" />
                        <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
                          Painel Preditivo · Groq / Llama 3
                        </p>
                      </div>

                      <div className="p-4 space-y-4">
                        {isLoadingAi ? (
                          <div className="space-y-3 animate-pulse">
                            <div className="h-20 rounded-lg bg-zinc-950 border border-zinc-800" />
                            <div className="grid grid-cols-2 gap-3">
                              <div className="h-16 rounded-lg bg-zinc-950 border border-zinc-800" />
                              <div className="h-16 rounded-lg bg-zinc-950 border border-zinc-800" />
                            </div>
                            <div className="h-12 rounded-lg bg-zinc-950 border border-zinc-800" />
                            <p className="text-xs text-zinc-500 text-center pt-1">
                              Consultando modelo analítico Llama 3 via Groq...
                            </p>
                          </div>
                        ) : aiInsight ? (
                          <>
                            <div
                              className={`rounded-lg bg-black/40 border-l-4 p-4 flex gap-3 border ${
                                aiInsight.corAlerta === "emerald"
                                  ? "border-l-emerald-500 border-emerald-900/40"
                                  : aiInsight.corAlerta === "blue"
                                    ? "border-l-blue-500 border-blue-900/40"
                                    : "border-l-amber-500 border-amber-900/40"
                              }`}
                            >
                              <div
                                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                                  aiInsight.corAlerta === "emerald"
                                    ? "bg-emerald-950/60 border-emerald-900/50"
                                    : aiInsight.corAlerta === "blue"
                                      ? "bg-blue-950/60 border-blue-900/50"
                                      : "bg-amber-950/60 border-amber-900/50"
                                }`}
                              >
                                <AlertCircle
                                  className={`w-4 h-4 ${
                                    aiInsight.corAlerta === "emerald"
                                      ? "text-emerald-400"
                                      : aiInsight.corAlerta === "blue"
                                        ? "text-blue-400"
                                        : "text-amber-400"
                                  }`}
                                />
                              </div>
                              <div className="min-w-0">
                                <p
                                  className={`text-xs font-semibold uppercase tracking-wide mb-1.5 ${
                                    aiInsight.corAlerta === "emerald"
                                      ? "text-emerald-400"
                                      : aiInsight.corAlerta === "blue"
                                        ? "text-blue-400"
                                        : "text-amber-400"
                                  }`}
                                >
                                  {aiInsight.tipoAlerta}
                                </p>
                                <p className="text-sm text-zinc-300 leading-relaxed">
                                  {aiInsight.mensagem}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3">
                                <p className="text-[11px] text-zinc-500 uppercase tracking-widest">
                                  {aiInsight.metricaLabel}
                                </p>
                                <p
                                  className={`text-lg font-semibold mt-1 ${
                                    aiInsight.corAlerta === "emerald"
                                      ? "text-emerald-400"
                                      : aiInsight.corAlerta === "blue"
                                        ? "text-blue-400"
                                        : "text-amber-400"
                                  }`}
                                >
                                  {aiInsight.metricaValor}
                                </p>
                              </div>
                              <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3">
                                <p className="text-[11px] text-zinc-500 uppercase tracking-widest">
                                  Turma
                                </p>
                                <p className="text-lg font-semibold text-white mt-1 truncate">
                                  {aiInsight.turmaDestaque}
                                </p>
                              </div>
                            </div>

                            <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3 flex items-start gap-2">
                              <Clock className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                              <p className="text-xs text-zinc-400 leading-relaxed">
                                {aiInsight.detalheComparativo}
                              </p>
                            </div>
                          </>
                        ) : (
                          <p className="text-sm text-zinc-500 text-center py-6">
                            Não foi possível carregar o insight preditivo.
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
              aria-labelledby="modal-novo-professor-titulo"
              className="bg-[#0f1117] border border-gray-800 rounded-lg w-full max-w-xl max-h-[85vh] overflow-y-auto shadow-2xl"
            >
              <div className="sticky top-0 z-10 bg-[#0f1117] px-6 pt-6 pb-0 border-b border-gray-800">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <h2
                      id="modal-novo-professor-titulo"
                      className="text-lg font-semibold text-white tracking-tight"
                    >
                      {editingId ? "Editar Professor" : "Cadastrar Novo Professor"}
                    </h2>
                    <p className="text-sm text-zinc-500 mt-1">
                      {editingId
                        ? "Atualize docência, documentação e acesso do docente."
                        : "Fluxo de cadastro em 3 etapas. O status será definido como Ativo."}
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

                <nav className="flex gap-1" aria-label="Etapas do cadastro">
                  {abasCadastro.map((aba) => (
                    <button
                      key={aba.id}
                      type="button"
                      onClick={() => setAbaAtiva(aba.id)}
                      className={`flex-1 px-2 py-3 text-xs sm:text-sm transition-colors border-b-2 ${
                        abaAtiva === aba.id
                          ? "border-b-2 border-purple-500 text-white font-semibold"
                          : "border-transparent text-gray-400 hover:text-gray-200"
                      }`}
                    >
                      {aba.label}
                    </button>
                  ))}
                </nav>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (abaAtiva === "contato") void salvarProfessor();
                }}
                className="px-6 py-5 space-y-4"
              >
                {abaAtiva === "docente" && (
                  <>
                    <div>
                      <label className={labelClass} htmlFor="prof-matricula">
                        Matrícula
                      </label>
                      <input
                        id="prof-matricula"
                        type="text"
                        value={formData.matricula}
                        onChange={(e) =>
                          atualizarCampo("matricula", e.target.value)
                        }
                        className={inputClass}
                        placeholder="Ex: 9012"
                      />
                    </div>

                    <div>
                      <label className={labelClass} htmlFor="prof-nome">
                        Nome Completo
                      </label>
                      <input
                        id="prof-nome"
                        type="text"
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
                        value={formData.titulacao}
                        onChange={(e) =>
                          atualizarCampo(
                            "titulacao",
                            e.target.value as Titulacao
                          )
                        }
                        className={inputClass}
                      >
                        <option value="" disabled>
                          Selecione a titulação
                        </option>
                        {titulacoes.map((tit) => (
                          <option key={tit} value={tit}>
                            {tit}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={labelClass} htmlFor="prof-area">
                        Área de Atuação / Turma Atribuída
                      </label>
                      <select
                        id="prof-area"
                        value={formData.area}
                        onChange={(e) => atualizarCampo("area", e.target.value)}
                        className={inputClass}
                      >
                        <option value="">
                          Selecione o curso / turma atribuída...
                        </option>
                        {turmasDisponiveis.length === 0 ? (
                          <option value="" disabled>
                            Nenhuma turma cadastrada. Crie uma turma primeiro.
                          </option>
                        ) : (
                          turmasDisponiveis.map((t) => (
                            <option key={t.id} value={t.curso}>
                              {t.curso} ({t.codigo} - {t.turno})
                            </option>
                          ))
                        )}
                        {formData.area &&
                          !turmasDisponiveis.some(
                            (t) => t.curso === formData.area
                          ) && (
                            <option value={formData.area}>
                              {formData.area}
                            </option>
                          )}
                      </select>
                    </div>

                    <div>
                      <label className={labelClass} htmlFor="prof-carga">
                        Carga Horária (h/semana)
                      </label>
                      <input
                        id="prof-carga"
                        type="number"
                        min={1}
                        max={80}
                        value={formData.cargaHoraria}
                        onChange={(e) =>
                          atualizarCampo("cargaHoraria", e.target.value)
                        }
                        className={inputClass}
                        placeholder="Ex: 20"
                      />
                    </div>
                  </>
                )}

                {abaAtiva === "documentos" && (
                  <>
                    <div>
                      <label className={labelClass} htmlFor="prof-cpf">
                        CPF
                      </label>
                      <input
                        id="prof-cpf"
                        type="text"
                        inputMode="numeric"
                        value={formData.cpf}
                        onChange={(e) =>
                          atualizarCampo("cpf", mascaraCPF(e.target.value))
                        }
                        className={inputClass}
                        placeholder="000.000.000-00"
                      />
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="prof-pis">
                        PIS / PASEP
                      </label>
                      <input
                        id="prof-pis"
                        type="text"
                        inputMode="numeric"
                        value={formData.pis}
                        onChange={(e) =>
                          atualizarCampo("pis", mascaraPIS(e.target.value))
                        }
                        className={inputClass}
                        placeholder="000.00000.00-0"
                      />
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="prof-lattes">
                        Link do Currículo Lattes
                      </label>
                      <input
                        id="prof-lattes"
                        type="url"
                        value={formData.lattes_url}
                        onChange={(e) =>
                          atualizarCampo("lattes_url", e.target.value)
                        }
                        className={inputClass}
                        placeholder="http://lattes.cnpq.br/..."
                      />
                    </div>
                  </>
                )}

                {abaAtiva === "contato" && (
                  <>
                    <div>
                      <label className={labelClass} htmlFor="prof-email-pessoal">
                        E-mail Pessoal
                      </label>
                      <input
                        id="prof-email-pessoal"
                        type="email"
                        value={formData.email_pessoal}
                        onChange={(e) =>
                          atualizarCampo("email_pessoal", e.target.value)
                        }
                        className={inputClass}
                        placeholder="email@exemplo.com"
                      />
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="prof-telefone">
                        Telefone / WhatsApp
                      </label>
                      <input
                        id="prof-telefone"
                        type="text"
                        inputMode="tel"
                        value={formData.telefone}
                        onChange={(e) =>
                          atualizarCampo(
                            "telefone",
                            mascaraTelefone(e.target.value)
                          )
                        }
                        className={inputClass}
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                    <div>
                      <label
                        className={labelClass}
                        htmlFor="prof-email-institucional"
                      >
                        E-mail Institucional
                      </label>
                      <input
                        id="prof-email-institucional"
                        type="text"
                        readOnly
                        value={formData.email_institucional}
                        className={inputLockedClass}
                        style={{ backgroundColor: "#0a0c10" }}
                        placeholder="gerado automaticamente"
                      />
                      <span className="text-[11px] text-zinc-500 mt-1 block">
                        Gerado automaticamente a partir do nome completo.
                      </span>
                    </div>
                  </>
                )}

                {formError && (
                  <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">
                    {formError}
                  </p>
                )}

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2 border-t border-gray-800">
                  {abaAtiva === "docente" && (
                    <>
                      <button
                        type="button"
                        onClick={fecharModal}
                        disabled={isSubmitting}
                        className="px-4 py-2.5 rounded-lg border border-zinc-700 text-sm font-medium text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => setAbaAtiva("documentos")}
                        className="px-4 py-2.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors"
                      >
                        Avançar para Documentos
                      </button>
                    </>
                  )}

                  {abaAtiva === "documentos" && (
                    <>
                      <button
                        type="button"
                        onClick={() => setAbaAtiva("docente")}
                        className="px-4 py-2.5 rounded-lg border border-zinc-700 text-sm font-medium text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors"
                      >
                        Voltar
                      </button>
                      <button
                        type="button"
                        onClick={() => setAbaAtiva("contato")}
                        className="px-4 py-2.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors"
                      >
                        Avançar para Contato
                      </button>
                    </>
                  )}

                  {abaAtiva === "contato" && (
                    <>
                      <button
                        type="button"
                        onClick={() => setAbaAtiva("documentos")}
                        disabled={isSubmitting}
                        className="px-4 py-2.5 rounded-lg border border-zinc-700 text-sm font-medium text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors disabled:opacity-50"
                      >
                        Voltar
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50"
                      >
                        {isSubmitting
                          ? "Salvando..."
                          : editingId
                            ? "Salvar Alterações"
                            : "Salvar Professor"}
                      </button>
                    </>
                  )}
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

        <ModalFeedback
          aberto={modalFeedback.aberto}
          onClose={fecharFeedback}
          tipo={modalFeedback.tipo}
          titulo={modalFeedback.titulo}
          mensagem={modalFeedback.mensagem}
        />
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
