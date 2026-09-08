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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ModalFeedback } from "@/components/ModalFeedback";

type StatusAluno = "Ativo" | "Evadido" | "Trancado" | string;
type AbaProntuario = "Cadastral" | "Acadêmico" | "Insights de IA";
type AbaCadastro = "academico" | "documentos" | "contato";

type Aluno = {
  id: string;
  ra: string;
  nome: string;
  curso: string;
  semestre: number;
  professor: string;
  status: StatusAluno;
  email: string;
  telefone: string;
  iniciais: string;
  cpf: string;
  rg: string;
  data_nascimento: string;
  email_pessoal: string;
  email_institucional: string;
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  estado: string;
};

type ProfessorDisponivel = {
  id: string;
  nome: string;
  area_atuacao: string;
  titulacao: string;
};

type FormDataAluno = {
  ra: string;
  nome: string;
  curso: string;
  semestre: string;
  cpf: string;
  rg: string;
  data_nascimento: string;
  email_pessoal: string;
  email_institucional: string;
  telefone: string;
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  estado: string;
};

const CURSOS_DISPONIVEIS = [
  "Ciência da Computação",
  "Engenharia de Software",
  "Análise e Desenvolvimento de Sistemas",
  "Ciência de Dados e Inteligência Artificial",
  "Sistemas de Informação",
  "Segurança da Informação",
  "Redes de Computadores",
  "Jogos Digitais",
  "Gestão da Tecnologia da Informação",
  "Banco de Dados",
];

const formInicial: FormDataAluno = {
  ra: "",
  nome: "",
  curso: "",
  semestre: "",
  cpf: "",
  rg: "",
  data_nascimento: "",
  email_pessoal: "",
  email_institucional: "",
  telefone: "",
  cep: "",
  logradouro: "",
  bairro: "",
  cidade: "",
  estado: "",
};

const abasCadastro: { id: AbaCadastro; label: string }[] = [
  { id: "academico", label: "1. Acadêmico" },
  { id: "documentos", label: "2. Documentação MEC" },
  { id: "contato", label: "3. Contato & Endereço" },
];

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

function gerarEmailInstitucional(nome: string, ra: string) {
  const partes = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  let local = "";
  if (partes.length >= 2) {
    local = `${partes[0]}.${partes[partes.length - 1]}`;
  } else if (partes.length === 1) {
    local = partes[0];
  } else {
    local = ra
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .trim();
  }

  if (!local) return "";
  return `${local}@uniclasstech.edu.br`;
}

function mascaraCPF(valor: string) {
  const digits = valor.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
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

function mascaraCEP(valor: string) {
  const digits = valor.replace(/\D/g, "").slice(0, 8);
  return digits.replace(/(\d{5})(\d)/, "$1-$2");
}

function mapAluno(row: Record<string, unknown>): Aluno {
  const nome = String(row.nome ?? "");
  const status = String(row.status ?? "Ativo");
  const emailInstitucional = String(
    row.email_institucional ?? row.email ?? "—"
  );
  return {
    id: String(row.id ?? ""),
    ra: String(row.ra ?? "—"),
    nome,
    curso: String(row.curso ?? "—"),
    semestre: Number(row.semestre ?? 1),
    professor: String(
      row.professor ?? row.professor_vinculado ?? row.orientador ?? ""
    ),
    status,
    email: emailInstitucional,
    telefone: String(row.telefone ?? row.celular ?? "—"),
    iniciais: iniciaisDe(nome) || "—",
    cpf: String(row.cpf ?? ""),
    rg: String(row.rg ?? ""),
    data_nascimento: String(row.data_nascimento ?? ""),
    email_pessoal: String(row.email_pessoal ?? ""),
    email_institucional: emailInstitucional === "—" ? "" : emailInstitucional,
    cep: String(row.cep ?? ""),
    logradouro: String(row.logradouro ?? ""),
    bairro: String(row.bairro ?? ""),
    cidade: String(row.cidade ?? ""),
    estado: String(row.estado ?? ""),
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
  const [filterCurso, setFilterCurso] = useState("Todos");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [alunoSelecionado, setAlunoSelecionado] = useState<Aluno | null>(null);
  const [drawerAberto, setDrawerAberto] = useState(false);
  const [abaProntuario, setAbaProntuario] = useState<AbaProntuario>("Cadastral");
  const [abaAtiva, setAbaAtiva] = useState<AbaCadastro>("academico");
  const [cursosAtivos, setCursosAtivos] = useState<string[]>([]);
  const [professoresDisponiveis, setProfessoresDisponiveis] = useState<
    ProfessorDisponivel[]
  >([]);
  const [professorVinculado, setProfessorVinculado] = useState("");
  const [professorSugerido, setProfessorSugerido] = useState<string | null>(null);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [cepErro, setCepErro] = useState<string | null>(null);

  function fecharFeedback() {
    setModalFeedback((prev) => ({ ...prev, aberto: false }));
  }

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

  async function fetchProfessoresDisponiveis() {
    const { data, error } = await supabase
      .from("professores")
      .select("id, nome, area_atuacao, titulacao");

    if (error) {
      console.error("Erro ao buscar professores:", error.message);
      setProfessoresDisponiveis([]);
      return;
    }

    if (data && data.length > 0) {
      setProfessoresDisponiveis(
        data.map((p) => ({
          id: String(p.id),
          nome: String(p.nome ?? ""),
          area_atuacao: String(p.area_atuacao ?? ""),
          titulacao: String(p.titulacao ?? ""),
        }))
      );
    } else {
      setProfessoresDisponiveis([]);
    }
  }

  useEffect(() => {
    fetchAlunos();
    fetchCursosAtivos();
    fetchProfessoresDisponiveis();
  }, []);

  const cursosUnicos = useMemo(
    () => Array.from(new Set(alunos.map((a) => a.curso).filter((c) => c && c !== "—"))).sort(),
    [alunos]
  );

  const cursosNoFormulario = useMemo(() => {
    const base = [...CURSOS_DISPONIVEIS];
    if (formData.curso && !base.includes(formData.curso)) {
      base.push(formData.curso);
    }
    for (const curso of cursosAtivos) {
      if (!base.includes(curso)) base.push(curso);
    }
    return base.sort();
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

  const totalRegistros = alunosFiltrados.length;
  const totalPaginas = Math.max(1, Math.ceil(totalRegistros / itensPorPagina));
  const indiceInicial = (paginaAtual - 1) * itensPorPagina;
  const indiceFinal = indiceInicial + itensPorPagina;
  const alunosPaginados = alunosFiltrados.slice(indiceInicial, indiceFinal);

  const paginasVisiveis = useMemo(() => {
    const maxBotoes = 5;
    if (totalPaginas <= maxBotoes) {
      return Array.from({ length: totalPaginas }, (_, i) => i + 1);
    }
    let inicio = Math.max(1, paginaAtual - 2);
    const fim = Math.min(totalPaginas, inicio + maxBotoes - 1);
    inicio = Math.max(1, fim - maxBotoes + 1);
    return Array.from({ length: fim - inicio + 1 }, (_, i) => inicio + i);
  }, [paginaAtual, totalPaginas]);

  useEffect(() => {
    setPaginaAtual(1);
  }, [searchTerm, filterCurso]);

  useEffect(() => {
    if (paginaAtual > totalPaginas) {
      setPaginaAtual(totalPaginas);
    }
  }, [paginaAtual, totalPaginas]);

  useEffect(() => {
    const email = gerarEmailInstitucional(formData.nome, formData.ra);
    setFormData((prev) =>
      prev.email_institucional === email
        ? prev
        : { ...prev, email_institucional: email }
    );
  }, [formData.nome, formData.ra]);

  useEffect(() => {
    const cepLimpo = formData.cep.replace(/\D/g, "");
    if (cepLimpo.length !== 8) {
      setCepErro(null);
      return;
    }

    let cancelado = false;

    async function buscarCep() {
      setBuscandoCep(true);
      setCepErro(null);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        const data = (await res.json()) as {
          erro?: boolean;
          logradouro?: string;
          bairro?: string;
          localidade?: string;
          uf?: string;
        };

        if (cancelado) return;

        if (data.erro) {
          setCepErro("CEP não encontrado.");
          return;
        }

        setFormData((prev) => ({
          ...prev,
          logradouro: data.logradouro ?? "",
          bairro: data.bairro ?? "",
          cidade: data.localidade ?? "",
          estado: data.uf ?? "",
        }));
      } catch {
        if (!cancelado) setCepErro("Não foi possível consultar o CEP.");
      } finally {
        if (!cancelado) setBuscandoCep(false);
      }
    }

    void buscarCep();
    return () => {
      cancelado = true;
    };
  }, [formData.cep]);

  function abrirProntuario(aluno: Aluno) {
    setAlunoSelecionado(aluno);
    setAbaProntuario("Cadastral");
    setDrawerAberto(true);
  }

  function fecharProntuario() {
    setDrawerAberto(false);
    window.setTimeout(() => setAlunoSelecionado(null), 300);
  }

  function atualizarCampo<K extends keyof FormDataAluno>(campo: K, valor: FormDataAluno[K]) {
    setFormData((prev) => ({ ...prev, [campo]: valor }));
  }

  function sugerirProfessorPorCurso(cursoSelecionado: string) {
    const cursoNorm = cursoSelecionado.trim().toLowerCase();
    if (!cursoNorm) {
      setProfessorVinculado("");
      setProfessorSugerido(null);
      return;
    }

    const professor = professoresDisponiveis.find((p) => {
      const area = p.area_atuacao.trim().toLowerCase();
      return area === cursoNorm || area.includes(cursoNorm);
    });

    if (professor) {
      setProfessorVinculado(professor.nome);
      setProfessorSugerido(professor.nome);
    } else {
      setProfessorVinculado("");
      setProfessorSugerido(null);
    }
  }

  function fecharModal() {
    setIsModalOpen(false);
    setFormData(formInicial);
    setFormError(null);
    setEditingId(null);
    setProfessorVinculado("");
    setProfessorSugerido(null);
    setAbaAtiva("academico");
    setCepErro(null);
    setBuscandoCep(false);
  }

  function abrirModalCadastro() {
    setFormData(formInicial);
    setFormError(null);
    setEditingId(null);
    setProfessorVinculado("");
    setProfessorSugerido(null);
    setAbaAtiva("academico");
    setCepErro(null);
    setIsModalOpen(true);
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
      ra: aluno.ra === "—" ? "" : aluno.ra,
      nome: aluno.nome,
      curso: aluno.curso === "—" ? "" : aluno.curso,
      semestre: String(aluno.semestre),
      cpf: aluno.cpf,
      rg: aluno.rg,
      data_nascimento: aluno.data_nascimento
        ? aluno.data_nascimento.slice(0, 10)
        : "",
      email_pessoal: aluno.email_pessoal,
      email_institucional:
        aluno.email_institucional ||
        gerarEmailInstitucional(aluno.nome, aluno.ra),
      telefone: aluno.telefone === "—" ? "" : aluno.telefone,
      cep: aluno.cep,
      logradouro: aluno.logradouro,
      bairro: aluno.bairro,
      cidade: aluno.cidade,
      estado: aluno.estado,
    });
    setProfessorVinculado(aluno.professor);
    setProfessorSugerido(null);
    setEditingId(aluno.id);
    setAbaAtiva("academico");
    setIsModalOpen(true);
  }

  async function salvarAluno() {
    setFormError(null);

    const ra = formData.ra.trim();
    const nome = formData.nome.trim();
    const curso = formData.curso.trim();
    const professor = professorVinculado.trim();
    const semestreNum = Number(formData.semestre);
    const email_institucional =
      formData.email_institucional.trim() ||
      gerarEmailInstitucional(nome, ra);

    if (!ra || !nome || !curso) {
      setFormError("Preencha os campos obrigatórios: Nome, RA e Curso.");
      setAbaAtiva("academico");
      return;
    }

    setIsSubmitting(true);
    const payload = {
      ra,
      nome,
      curso,
      professor,
      semestre: Number.isNaN(semestreNum) ? null : semestreNum,
      cpf: formData.cpf.trim(),
      rg: formData.rg.trim(),
      data_nascimento: formData.data_nascimento || null,
      email_pessoal: formData.email_pessoal.trim(),
      email_institucional,
      telefone: formData.telefone.trim(),
      cep: formData.cep.trim(),
      logradouro: formData.logradouro.trim(),
      bairro: formData.bairro.trim(),
      cidade: formData.cidade.trim(),
      estado: formData.estado.trim(),
    };

    const { error } = editingId
      ? await supabase.from("alunos").update(payload).eq("id", editingId)
      : await supabase.from("alunos").insert(payload);
    setIsSubmitting(false);

    if (error) {
      console.error("Erro ao cadastrar aluno:", error.message);
      setFormError(error.message);
      return;
    }

    const wasEditing = !!editingId;
    fecharModal();
    await fetchAlunos();
    setModalFeedback({
      aberto: true,
      tipo: "sucesso",
      titulo: wasEditing
        ? "Matrícula Atualizada com Sucesso"
        : "Matrícula Realizada com Sucesso",
      mensagem: wasEditing
        ? `Dados de ${nome} atualizados. Credencial institucional: ${email_institucional}`
        : `Aluno ${nome} matriculado no curso de ${curso}. Credencial institucional gerada: ${email_institucional}`,
    });
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
                Gestão de Alunos
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                Consulte, filtre e acompanhe o prontuário acadêmico dos estudantes.
              </p>
            </div>
            <button
              type="button"
              onClick={abrirModalCadastro}
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
                    alunosPaginados.map((aluno) => (
                      <tr
                        key={aluno.id || aluno.ra}
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

            {!isLoading && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-800/80 bg-[#0a0c12]/40">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-sm text-zinc-400">
                  <span>
                    {totalRegistros === 0
                      ? "Mostrando 0 a 0 de 0 alunos"
                      : `Mostrando ${indiceInicial + 1} a ${Math.min(indiceFinal, totalRegistros)} de ${totalRegistros} alunos`}
                  </span>
                  <label className="inline-flex items-center gap-2 text-xs text-zinc-500">
                    Exibir:
                    <select
                      value={itensPorPagina}
                      onChange={(e) => {
                        setItensPorPagina(Number(e.target.value));
                        setPaginaAtual(1);
                      }}
                      className="appearance-none rounded-md bg-[#0f1117] border border-gray-800 text-zinc-300 text-xs px-2.5 py-1.5 outline-none focus:border-purple-500"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </label>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                    disabled={paginaAtual === 1}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white border border-gray-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </button>

                  {paginasVisiveis.map((pagina) => (
                    <button
                      key={pagina}
                      type="button"
                      onClick={() => setPaginaAtual(pagina)}
                      className={
                        pagina === paginaAtual
                          ? "bg-purple-600 text-white font-semibold rounded-lg px-3 py-1.5 text-sm"
                          : "bg-transparent text-gray-400 hover:text-white rounded-lg px-3 py-1.5 text-sm transition-colors"
                      }
                    >
                      {pagina}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() =>
                      setPaginaAtual((p) => Math.min(totalPaginas, p + 1))
                    }
                    disabled={paginaAtual === totalPaginas}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white border border-gray-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  >
                    Próximo
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
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
                {abaProntuario === "Cadastral" && (
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

                {abaProntuario === "Acadêmico" && (
                  <div className="space-y-4">
                    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-3">
                      <Campo label="Curso" valor={alunoSelecionado.curso} />
                      <Campo
                        label="Professor(a) / Orientador"
                        valor={alunoSelecionado.professor || "—"}
                      />
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
              className="bg-[#0f1117] border border-gray-800 rounded-lg w-full max-w-xl max-h-[85vh] overflow-y-auto shadow-2xl"
            >
              <div className="sticky top-0 z-10 bg-[#0f1117] px-6 pt-6 pb-0 border-b border-gray-800">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <h2
                      id="modal-novo-aluno-titulo"
                      className="text-lg font-semibold text-white tracking-tight"
                    >
                      {editingId ? "Editar Aluno" : "Cadastrar Novo Aluno"}
                    </h2>
                    <p className="text-sm text-zinc-500 mt-1">
                      {editingId
                        ? "Atualize os dados acadêmicos, documentais e de contato."
                        : "Fluxo de matrícula em 3 etapas. O status será definido automaticamente."}
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
                  if (abaAtiva === "contato") void salvarAluno();
                }}
                className="px-6 py-5 space-y-4"
              >
                {abaAtiva === "academico" && (
                  <>
                    <div>
                      <label className={labelClass} htmlFor="ra">
                        RA
                      </label>
                      <input
                        id="ra"
                        type="text"
                        value={formData.ra}
                        onChange={(e) => atualizarCampo("ra", e.target.value)}
                        className={inputClass}
                        placeholder="Ex: 20261001"
                      />
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="nome">
                        Nome Completo
                      </label>
                      <input
                        id="nome"
                        type="text"
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
                        value={formData.curso}
                        onChange={(e) => {
                          const cursoSelecionado = e.target.value;
                          atualizarCampo("curso", cursoSelecionado);
                          sugerirProfessorPorCurso(cursoSelecionado);
                        }}
                        className={inputClass}
                      >
                        <option value="" disabled>
                          Selecione o curso
                        </option>
                        {cursosNoFormulario.map((curso) => (
                          <option key={curso} value={curso}>
                            {curso}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        className={labelClass}
                        htmlFor="professor-vinculado"
                      >
                        Professor(a) Vinculado / Orientador
                      </label>
                      <select
                        id="professor-vinculado"
                        value={professorVinculado}
                        onChange={(e) => {
                          setProfessorVinculado(e.target.value);
                          if (e.target.value !== professorSugerido) {
                            setProfessorSugerido(null);
                          }
                        }}
                        className={inputClass}
                      >
                        <option value="">
                          Selecione ou confirme o docente...
                        </option>
                        {professoresDisponiveis.map((p) => (
                          <option key={p.id} value={p.nome}>
                            {p.titulacao} {p.nome} ({p.area_atuacao})
                          </option>
                        ))}
                      </select>
                      {professorSugerido && (
                        <span className="text-[11px] text-purple-400 mt-1 block">
                          Vinculado automaticamente pela área de atuação do
                          docente.
                        </span>
                      )}
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="semestre">
                        Semestre
                      </label>
                      <select
                        id="semestre"
                        value={formData.semestre}
                        onChange={(e) =>
                          atualizarCampo("semestre", e.target.value)
                        }
                        className={inputClass}
                      >
                        <option value="" disabled>
                          Selecione o semestre
                        </option>
                        {Array.from({ length: 10 }, (_, i) => i + 1).map(
                          (n) => (
                            <option key={n} value={String(n)}>
                              {n}º semestre
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  </>
                )}

                {abaAtiva === "documentos" && (
                  <>
                    <div>
                      <label className={labelClass} htmlFor="cpf">
                        CPF
                      </label>
                      <input
                        id="cpf"
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
                      <label className={labelClass} htmlFor="rg">
                        RG e Órgão Emissor
                      </label>
                      <input
                        id="rg"
                        type="text"
                        value={formData.rg}
                        onChange={(e) => atualizarCampo("rg", e.target.value)}
                        className={inputClass}
                        placeholder="12.345.678-9 SSP/SP"
                      />
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="data_nascimento">
                        Data de Nascimento
                      </label>
                      <input
                        id="data_nascimento"
                        type="date"
                        value={formData.data_nascimento}
                        onChange={(e) =>
                          atualizarCampo("data_nascimento", e.target.value)
                        }
                        className={`${inputClass} [color-scheme:dark]`}
                      />
                    </div>
                  </>
                )}

                {abaAtiva === "contato" && (
                  <>
                    <div>
                      <label className={labelClass} htmlFor="email_pessoal">
                        E-mail Pessoal
                      </label>
                      <input
                        id="email_pessoal"
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
                      <label className={labelClass} htmlFor="telefone">
                        Telefone / WhatsApp
                      </label>
                      <input
                        id="telefone"
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
                        htmlFor="email_institucional"
                      >
                        E-mail Institucional
                      </label>
                      <input
                        id="email_institucional"
                        type="text"
                        readOnly
                        value={formData.email_institucional}
                        className={inputLockedClass}
                        style={{ backgroundColor: "#0a0c10" }}
                        placeholder="gerado automaticamente"
                      />
                      <span className="text-[11px] text-zinc-500 mt-1 block">
                        Gerado automaticamente a partir do nome (ou RA).
                      </span>
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="cep">
                        CEP
                      </label>
                      <input
                        id="cep"
                        type="text"
                        inputMode="numeric"
                        value={formData.cep}
                        onChange={(e) =>
                          atualizarCampo("cep", mascaraCEP(e.target.value))
                        }
                        className={inputClass}
                        placeholder="00000-000"
                      />
                      {buscandoCep && (
                        <span className="text-[11px] text-purple-400 mt-1 block">
                          Buscando endereço...
                        </span>
                      )}
                      {cepErro && (
                        <span className="text-[11px] text-red-400 mt-1 block">
                          {cepErro}
                        </span>
                      )}
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="logradouro">
                        Logradouro
                      </label>
                      <input
                        id="logradouro"
                        type="text"
                        value={formData.logradouro}
                        onChange={(e) =>
                          atualizarCampo("logradouro", e.target.value)
                        }
                        className={inputClass}
                        placeholder="Rua, avenida..."
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-1">
                        <label className={labelClass} htmlFor="bairro">
                          Bairro
                        </label>
                        <input
                          id="bairro"
                          type="text"
                          value={formData.bairro}
                          onChange={(e) =>
                            atualizarCampo("bairro", e.target.value)
                          }
                          className={inputClass}
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <label className={labelClass} htmlFor="cidade">
                          Cidade
                        </label>
                        <input
                          id="cidade"
                          type="text"
                          value={formData.cidade}
                          onChange={(e) =>
                            atualizarCampo("cidade", e.target.value)
                          }
                          className={inputClass}
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <label className={labelClass} htmlFor="estado">
                          Estado
                        </label>
                        <input
                          id="estado"
                          type="text"
                          value={formData.estado}
                          onChange={(e) =>
                            atualizarCampo(
                              "estado",
                              e.target.value.toUpperCase().slice(0, 2)
                            )
                          }
                          className={inputClass}
                          placeholder="UF"
                          maxLength={2}
                        />
                      </div>
                    </div>
                  </>
                )}

                {formError && (
                  <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">
                    {formError}
                  </p>
                )}

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2 border-t border-gray-800">
                  {abaAtiva === "academico" && (
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
                        onClick={() => setAbaAtiva("academico")}
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
                            : "Salvar e Matricular Aluno"}
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
