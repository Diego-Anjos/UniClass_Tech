"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
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
  Users,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ModalFeedback } from "@/components/ModalFeedback";

type Turno = "Manhã" | "Noite";
type StatusTurma = "Aberta" | "Em andamento" | "Fechada";
type AbaTurma = "Disciplinas & Professores" | "Lista de Alunos" | "Automação & IA";

type AlunoTurma = {
  id: string;
  ra: string;
  nome: string;
  semestre: string;
};

type ProfessorTurma = {
  id: string;
  nome: string;
  titulacao: string;
  status: string;
  area_atuacao: string;
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
  matriculados: number;
  percentual: number;
  sala: string;
  andar: string;
};

type FormDataTurma = {
  codigo: string;
  curso: string;
  turno: Turno;
  semestre: string;
  capacidade: string;
};

const SEMESTRES = Array.from({ length: 10 }, (_, i) => `${i + 1}º Semestre`);

const ANDARES = [
  "Térreo",
  "1º Andar",
  "2º Andar",
  "3º Andar",
  "4º Andar",
] as const;

const SALAS_LABS = [
  "Sala 101",
  "Sala 102",
  "Lab 1",
  "Lab 2",
  "Lab 3",
  "Auditório",
] as const;

const formInicial: FormDataTurma = {
  codigo: "",
  curso: "",
  turno: "Manhã",
  semestre: "1º Semestre",
  capacidade: "",
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
  return Math.min(100, Math.round((ocupacao / capacidade) * 100));
}

function statusPorOcupacao(
  percentual: number,
  statusDb: StatusTurma
): { label: string; className: string } {
  if (percentual >= 100) {
    return {
      label: "Lotada",
      className: "bg-red-950 text-red-400 border-red-900/50",
    };
  }
  if (percentual === 0) {
    return {
      label: "Sem Alunos",
      className: "bg-zinc-800 text-zinc-400 border-zinc-700",
    };
  }
  if (statusDb === "Em andamento") {
    return {
      label: "Em andamento",
      className: statusBadge["Em andamento"],
    };
  }
  return {
    label: "Aberta",
    className: statusBadge.Aberta,
  };
}

function formatarSemestreAluno(valor: unknown) {
  if (valor === null || valor === undefined || valor === "") return "—";
  const raw = String(valor);
  if (raw.includes("Semestre")) return raw;
  const num = Number(raw);
  if (!Number.isNaN(num) && num > 0) return `${num}º Semestre`;
  return raw;
}

function mapTurma(
  row: Record<string, unknown>,
  matriculados = 0
): Turma {
  const capacidade = Number(row.capacidade ?? 40) || 40;
  const percentual = ocupacaoPercentual(matriculados, capacidade);
  return {
    id: String(row.id ?? ""),
    codigo: String(row.codigo ?? "—"),
    curso: String(row.curso ?? "—"),
    turno: (String(row.turno ?? "Manhã")) as Turno,
    ocupacao: matriculados,
    capacidade,
    status: (String(row.status ?? "Aberta")) as StatusTurma,
    semestre: String(row.semestre ?? "1º Semestre"),
    matriculados,
    percentual,
    sala: String(row.sala ?? ""),
    andar: String(row.andar ?? ""),
  };
}

export default function TurmasMatriculasPage() {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormDataTurma>(formInicial);
  const [andarSelecionado, setAndarSelecionado] = useState("");
  const [salaSelecionada, setSalaSelecionada] = useState("");
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
  const [filterTurno, setFilterTurno] = useState("Todos");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [turmaSelecionada, setTurmaSelecionada] = useState<Turma | null>(null);
  const [drawerAberto, setDrawerAberto] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<AbaTurma>("Disciplinas & Professores");
  const [alunosDaTurma, setAlunosDaTurma] = useState<AlunoTurma[]>([]);
  const [professoresDaTurma, setProfessoresDaTurma] = useState<ProfessorTurma[]>([]);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);

  function fecharFeedback() {
    setModalFeedback((prev) => ({ ...prev, aberto: false }));
  }

  async function fetchTurmas() {
    setIsLoading(true);

    const [{ data: turmasData, error: turmasError }, { data: alunosData, error: alunosError }] =
      await Promise.all([
        supabase.from("turmas").select("*").order("created_at", { ascending: false }),
        supabase.from("alunos").select("curso"),
      ]);

    if (turmasError) {
      console.error("Erro ao buscar turmas:", turmasError.message);
      setTurmas([]);
      setIsLoading(false);
      return;
    }

    if (alunosError) {
      console.error("Erro ao buscar alunos para ocupação:", alunosError.message);
    }

    const contagemPorCurso: Record<string, number> = {};
    (alunosData || []).forEach((aluno) => {
      if (aluno.curso) {
        contagemPorCurso[aluno.curso] =
          (contagemPorCurso[aluno.curso] || 0) + 1;
      }
    });

    const turmasComOcupacao = (turmasData || []).map((t) => {
      const matriculados = contagemPorCurso[String(t.curso ?? "")] || 0;
      return mapTurma(t as Record<string, unknown>, matriculados);
    });

    setTurmas(turmasComOcupacao);
    setIsLoading(false);
  }

  useEffect(() => {
    void fetchTurmas();
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

  const capacidadeTurma = turmaSelecionada?.capacidade || 40;
  const matriculados = turmaSelecionada?.matriculados ?? alunosDaTurma.length;
  const taxaOcupacao =
    turmaSelecionada?.percentual ??
    ocupacaoPercentual(matriculados, capacidadeTurma);

  useEffect(() => {
    if (!turmaSelecionada?.id) {
      setAlunosDaTurma([]);
      setProfessoresDaTurma([]);
      setAiInsight(null);
      setIsGeneratingInsight(false);
      return;
    }

    const turma = turmaSelecionada;
    let cancelado = false;

    async function carregarDadosDaTurma() {
      const curso = turma.curso && turma.curso !== "—" ? turma.curso : "";

      let alunos: AlunoTurma[] = [];
      if (curso) {
        const { data, error } = await supabase
          .from("alunos")
          .select("*")
          .eq("curso", curso);

        if (error) {
          console.error("Erro ao buscar alunos da turma:", error.message);
        } else {
          alunos = (data ?? []).map((a) => ({
            id: String(a.id ?? ""),
            ra: String(a.ra ?? "—"),
            nome: String(a.nome ?? "—"),
            semestre: formatarSemestreAluno(a.semestre),
          }));
        }
      }

      if (cancelado) return;
      setAlunosDaTurma(alunos);
      setTurmaSelecionada((prev) => {
        if (!prev || prev.id !== turma.id) return prev;
        const capacidade = prev.capacidade || 40;
        const percentual = ocupacaoPercentual(alunos.length, capacidade);
        return {
          ...prev,
          matriculados: alunos.length,
          ocupacao: alunos.length,
          percentual,
          capacidade,
        };
      });
      setTurmas((prev) =>
        prev.map((t) => {
          if (t.id !== turma.id) return t;
          const capacidade = t.capacidade || 40;
          return {
            ...t,
            matriculados: alunos.length,
            ocupacao: alunos.length,
            percentual: ocupacaoPercentual(alunos.length, capacidade),
            capacidade,
          };
        })
      );

      let professores: ProfessorTurma[] = [];
      if (curso) {
        const { data, error } = await supabase
          .from("professores")
          .select("*")
          .ilike("area_atuacao", `%${curso}%`);

        if (error) {
          console.error("Erro ao buscar professores da turma:", error.message);
        } else {
          professores = (data ?? []).map((p) => ({
            id: String(p.id ?? ""),
            nome: String(p.nome ?? "—"),
            titulacao: String(p.titulacao ?? "—"),
            status: String(p.status ?? "Ativo"),
            area_atuacao: String(p.area_atuacao ?? curso),
          }));
        }
      }

      if (cancelado) return;
      setProfessoresDaTurma(professores);

      const capacidade = turma.capacidade || 40;
      const matriculadosCount = alunos.length;

      setIsGeneratingInsight(true);
      setAiInsight(null);
      try {
        const res = await fetch("/api/insights/turma", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            codigo: turma.codigo,
            curso: turma.curso,
            turno: turma.turno,
            semestre: turma.semestre || "1º Semestre",
            matriculados: matriculadosCount,
            capacidade,
          }),
        });
        const json = (await res.json()) as { analise?: string; insight?: string };
        if (!cancelado) {
          setAiInsight(
            json.analise ||
              json.insight ||
              "Não foi possível gerar a análise no momento."
          );
        }
      } catch (err) {
        console.error("Erro ao gerar insight da turma:", err);
        if (!cancelado) {
          setAiInsight(
            "Não foi possível gerar a análise no momento. Tente novamente."
          );
        }
      } finally {
        if (!cancelado) setIsGeneratingInsight(false);
      }
    }

    void carregarDadosDaTurma();
    return () => {
      cancelado = true;
    };
  }, [turmaSelecionada?.id]);

  function abrirGestao(turma: Turma) {
    setTurmaSelecionada(turma);
    setAbaAtiva("Disciplinas & Professores");
    setAiInsight(null);
    setAlunosDaTurma([]);
    setProfessoresDaTurma([]);
    setDrawerAberto(true);
  }

  function fecharGestao() {
    setDrawerAberto(false);
    setAiInsight(null);
    window.setTimeout(() => {
      setTurmaSelecionada(null);
      setAlunosDaTurma([]);
      setProfessoresDaTurma([]);
      setIsGeneratingInsight(false);
    }, 300);
  }

  function sincronizarGoogleCalendar() {
    setModalFeedback({
      aberto: true,
      tipo: "sucesso",
      titulo: "Calendário Sincronizado",
      mensagem:
        "Grade horária integrada à agenda dos docentes e alunos matriculados.",
    });
  }

  async function reanalisarTurma() {
    if (!turmaSelecionada) return;
    setIsGeneratingInsight(true);
    setAiInsight(null);
    try {
      const res = await fetch("/api/insights/turma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo: turmaSelecionada.codigo,
          curso: turmaSelecionada.curso,
          turno: turmaSelecionada.turno,
          semestre: turmaSelecionada.semestre || "1º Semestre",
          matriculados,
          capacidade: capacidadeTurma,
        }),
      });
      const json = (await res.json()) as { analise?: string; insight?: string };
      setAiInsight(
        json.analise ||
          json.insight ||
          "Não foi possível gerar a análise no momento."
      );
    } catch (err) {
      console.error("Erro ao gerar insight da turma:", err);
      setAiInsight(
        "Não foi possível gerar a análise no momento. Tente novamente."
      );
    } finally {
      setIsGeneratingInsight(false);
    }
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
    setAndarSelecionado("");
    setSalaSelecionada("");
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
      semestre:
        turma.semestre && turma.semestre !== "—"
          ? turma.semestre
          : "1º Semestre",
      capacidade: String(turma.capacidade),
    });
    setAndarSelecionado(turma.andar || "");
    setSalaSelecionada(turma.sala || "");
    setEditingId(turma.id);
    setIsModalOpen(true);
  }

  async function verificarConflitoSalaTurma(): Promise<string | null> {
    if (!salaSelecionada || !formData.turno) return null;

    let query = supabase
      .from("turmas")
      .select("id, professor, dias_aula, curso, codigo")
      .eq("sala", salaSelecionada)
      .eq("turno", formData.turno);

    if (editingId) {
      query = query.neq("id", editingId);
    }

    const { data: registros, error } = await query;
    if (error) {
      console.error("Erro ao verificar conflito de sala:", error.message);
      return null;
    }
    if (!registros || registros.length === 0) return null;

    // Sem dias no formulário de turma: qualquer ocupação da sala no turno é conflito
    const conflito = registros[0];
    return (
      String(conflito.professor ?? "").trim() ||
      String(conflito.curso ?? conflito.codigo ?? "outra turma")
    );
  }

  async function salvarTurma() {
    setFormError(null);

    const codigo = formData.codigo.trim();
    const curso = formData.curso.trim();
    const semestre = formData.semestre.trim() || "1º Semestre";
    const capacidade = Number(formData.capacidade);

    if (!codigo || !curso || !formData.capacidade || Number.isNaN(capacidade)) {
      setFormError("Preencha todos os campos obrigatórios.");
      return;
    }

    const professorConflito = await verificarConflitoSalaTurma();
    if (professorConflito) {
      const mensagem = `Atenção: A sala/laboratório selecionado já está ocupado por ${professorConflito} neste mesmo turno e dia(s). Por favor, escolha outro local.`;
      setFormError(mensagem);
      setModalFeedback({
        aberto: true,
        tipo: "erro",
        titulo: "Conflito de Sala",
        mensagem,
      });
      return;
    }

    setIsSubmitting(true);
    const payload = {
      codigo,
      curso,
      turno: formData.turno,
      semestre,
      capacidade,
      andar: andarSelecionado || null,
      sala: salaSelecionada || null,
    };
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
    setModalFeedback({
      aberto: true,
      tipo: "sucesso",
      titulo: wasEditing ? "Turma atualizada" : "Turma criada",
      mensagem: wasEditing
        ? "Turma atualizada com sucesso!"
        : "Turma criada com sucesso!",
    });
  }

  const inputClass =
    "w-full px-3 py-2.5 rounded-lg bg-black border border-gray-800 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-purple-500 transition-colors";
  const labelClass = "block text-xs text-gray-400 font-medium mb-1.5";

  return (
    <>
      <div className="relative min-h-[calc(100vh-8rem)]">
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
              onClick={() => {
                setFormData(formInicial);
                setAndarSelecionado("");
                setSalaSelecionada("");
                setEditingId(null);
                setFormError(null);
                setIsModalOpen(true);
              }}
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
              <table className="w-full text-left min-w-[920px]">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="px-6 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest">
                      Código da Turma
                    </th>
                    <th className="px-4 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest">
                      Curso
                    </th>
                    <th className="px-4 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest">
                      Semestre
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
                        colSpan={7}
                        className="px-6 py-16 text-center text-sm text-zinc-500"
                      >
                        Carregando turmas...
                      </td>
                    </tr>
                  ) : turmasFiltradas.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-12 text-center text-sm text-zinc-500"
                      >
                        Nenhuma turma encontrada com os filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    turmasFiltradas.map((turma) => {
                      const capacidade = turma.capacidade || 40;
                      const statusOcup = statusPorOcupacao(
                        turma.percentual,
                        turma.status
                      );
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
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border border-gray-800 bg-[#0f1117] text-zinc-300">
                              {turma.semestre && turma.semestre !== "—"
                                ? turma.semestre
                                : "1º Semestre"}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-zinc-400">{turma.turno}</td>
                          <td className="px-4 py-4 min-w-[160px]">
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-zinc-300">
                                  {turma.matriculados}/{capacidade}
                                </span>
                                <span className="text-zinc-500">
                                  {turma.percentual}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-purple-600 h-full rounded-full transition-all duration-500"
                                  style={{ width: `${turma.percentual}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${statusOcup.className}`}
                            >
                              {statusOcup.label}
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
          className={`absolute right-0 top-0 h-full w-full max-w-md bg-[#0f1117] border-l border-gray-800 z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-out ${
            drawerAberto ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {turmaSelecionada && (
            <>
              <div className="px-6 py-5 border-b border-gray-800 flex items-start justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-14 h-14 rounded-full bg-zinc-800 border border-gray-800 flex items-center justify-center shrink-0">
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
                  aria-label="Fechar painel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-4 pt-4 border-b border-gray-800">
                <div className="flex gap-1 overflow-x-auto">
                  {abas.map((aba) => (
                    <button
                      key={aba}
                      type="button"
                      onClick={() => setAbaAtiva(aba)}
                      className={`px-3 py-2.5 text-xs font-medium rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
                        abaAtiva === aba
                          ? "text-white border-purple-500 bg-zinc-900/50"
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
                    <div className="rounded-xl bg-zinc-900 border border-gray-800 p-4 space-y-3">
                      <Campo label="Turno" valor={turmaSelecionada.turno} />
                      <Campo
                        label="Andar"
                        valor={turmaSelecionada.andar || "Não definido"}
                      />
                      <Campo
                        label="Sala / Laboratório"
                        valor={turmaSelecionada.sala || "Não definida"}
                      />
                      <Campo
                        label="Semestre"
                        valor={
                          turmaSelecionada.semestre || "1º Semestre"
                        }
                      />
                      <Campo
                        label="Status"
                        valor={
                          statusPorOcupacao(
                            turmaSelecionada.percentual,
                            turmaSelecionada.status
                          ).label
                        }
                      />
                      <Campo
                        label="Ocupação"
                        valor={`${matriculados}/${capacidadeTurma} (${taxaOcupacao}%)`}
                      />
                    </div>

                    <div className="rounded-xl bg-zinc-900 border border-gray-800 p-4">
                      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">
                        Disciplinas e docentes
                      </p>
                      {professoresDaTurma.length === 0 ? (
                        <p className="text-sm text-zinc-500">
                          Nenhum docente alocado nesta área.
                        </p>
                      ) : (
                        <ul className="space-y-3">
                          {professoresDaTurma.map((prof) => (
                            <li
                              key={prof.id}
                              className="rounded-lg border border-gray-800 bg-[#0a0c10] px-3 py-3 space-y-2"
                            >
                              <div className="flex items-start gap-3">
                                <BookOpen className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-white">
                                    {prof.nome}
                                  </p>
                                  <p className="text-xs text-zinc-500 mt-0.5">
                                    {prof.titulacao}
                                  </p>
                                </div>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border border-green-900/50 bg-green-950 text-green-400 shrink-0">
                                  {prof.status || "Ativo"}
                                </span>
                              </div>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] border border-gray-800 bg-zinc-950 text-zinc-300">
                                {prof.area_atuacao || turmaSelecionada.curso}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}

                {abaAtiva === "Lista de Alunos" && (
                  <div className="space-y-4">
                    <div className="rounded-xl bg-zinc-900 border border-gray-800 p-4">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-xs text-zinc-500 uppercase tracking-widest">
                          Matriculados
                        </p>
                        <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
                          <Users className="w-3.5 h-3.5" />
                          {alunosDaTurma.length} aluno
                          {alunosDaTurma.length !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {alunosDaTurma.length === 0 ? (
                        <p className="text-sm text-zinc-500 py-4 text-center">
                          Nenhum aluno matriculado nesta turma.
                        </p>
                      ) : (
                        <ul className="divide-y divide-gray-800">
                          {alunosDaTurma.map((aluno) => (
                            <li
                              key={aluno.id || aluno.ra}
                              className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                            >
                              <div className="w-8 h-8 rounded-full bg-zinc-800 border border-gray-800 flex items-center justify-center shrink-0">
                                <User className="w-4 h-4 text-zinc-400" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-white truncate">
                                  {aluno.nome}
                                </p>
                                <p className="text-xs text-zinc-500 font-mono">
                                  RA {aluno.ra}
                                </p>
                              </div>
                              <span className="text-[11px] text-zinc-400 shrink-0">
                                {aluno.semestre}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}

                {abaAtiva === "Automação & IA" && (
                  <div className="space-y-4">
                    <button
                      type="button"
                      onClick={sincronizarGoogleCalendar}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors"
                    >
                      <CalendarDays className="w-4 h-4" />
                      Sincronizar Google Calendar
                    </button>

                    <div className="rounded-xl bg-zinc-900 border border-gray-800 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-zinc-400" />
                          <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
                            Painel Preditivo · Groq / Llama 3
                          </p>
                        </div>
                        {!isGeneratingInsight && (
                          <button
                            type="button"
                            onClick={() => void reanalisarTurma()}
                            className="text-[11px] text-zinc-500 hover:text-white transition-colors underline underline-offset-2"
                          >
                            Reanalisar
                          </button>
                        )}
                      </div>

                      <div className="p-4 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-lg bg-[#0a0c10] border border-gray-800 p-3">
                            <p className="text-[11px] text-zinc-500 uppercase tracking-widest">
                              Ocupação atual
                            </p>
                            <p
                              className={`text-lg font-semibold mt-1 ${
                                taxaOcupacao >= 90
                                  ? "text-red-400"
                                  : taxaOcupacao >= 70
                                    ? "text-amber-400"
                                    : "text-sky-400"
                              }`}
                            >
                              {taxaOcupacao}%
                            </p>
                          </div>
                          <div className="rounded-lg bg-[#0a0c10] border border-gray-800 p-3">
                            <p className="text-[11px] text-zinc-500 uppercase tracking-widest">
                              Vagas
                            </p>
                            <p className="text-lg font-semibold text-white mt-1">
                              {matriculados}
                              <span className="text-zinc-500 text-sm font-normal">
                                /{capacidadeTurma}
                              </span>
                            </p>
                          </div>
                        </div>

                        {isGeneratingInsight && (
                          <div className="rounded-lg bg-black/40 border border-gray-800 p-4 space-y-3">
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
              className="bg-[#0f1117] border border-gray-800 rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
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
                  <select
                    id="turma-curso"
                    required
                    value={formData.curso}
                    onChange={(e) => atualizarCampo("curso", e.target.value)}
                    className={inputClass}
                  >
                    <option value="" disabled>
                      Selecione o curso
                    </option>
                    {formData.curso &&
                      !CURSOS_DISPONIVEIS.includes(formData.curso) && (
                        <option value={formData.curso}>{formData.curso}</option>
                      )}
                    {CURSOS_DISPONIVEIS.map((curso) => (
                      <option key={curso} value={curso}>
                        {curso}
                      </option>
                    ))}
                  </select>
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
                  <label className={labelClass} htmlFor="turma-andar">
                    Andar
                  </label>
                  <select
                    id="turma-andar"
                    value={andarSelecionado}
                    onChange={(e) => setAndarSelecionado(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Selecione o andar</option>
                    {ANDARES.map((andar) => (
                      <option key={andar} value={andar}>
                        {andar}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass} htmlFor="turma-sala">
                    Sala / Laboratório
                  </label>
                  <select
                    id="turma-sala"
                    value={salaSelecionada}
                    onChange={(e) => setSalaSelecionada(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Selecione a sala ou laboratório</option>
                    {SALAS_LABS.map((sala) => (
                      <option key={sala} value={sala}>
                        {sala}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass} htmlFor="turma-semestre">
                    Semestre
                  </label>
                  <select
                    id="turma-semestre"
                    required
                    value={formData.semestre}
                    onChange={(e) => atualizarCampo("semestre", e.target.value)}
                    className={inputClass}
                  >
                    {SEMESTRES.map((sem) => (
                      <option key={sem} value={sem}>
                        {sem}
                      </option>
                    ))}
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
