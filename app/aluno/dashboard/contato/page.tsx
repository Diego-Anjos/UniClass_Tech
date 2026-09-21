"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  ClipboardList,
  CalendarCheck,
  CalendarDays,
  BookOpen,
  Map as MapIcon,
  LogOut,
  Camera,
  GraduationCap,
  Settings,
  MessageSquare,
  Headphones,
  User,
  Ticket,
  Clock,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AlunoAvatar } from "@/components/aluno/aluno-avatar";
import { ModalFeedback } from "@/components/ModalFeedback";
import { toast } from "sonner";
import {
  limparSessaoAluno,
  useAlunoSession,
} from "@/lib/aluno-session";
import {
  extrairAtendimentoSalvo,
  type AtendimentoPreferencias,
} from "@/lib/professor-preferencias";

type PreferenciasContato = {
  atendimento?: AtendimentoPreferencias;
};

type ProfessorContato = {
  id: string;
  nome: string;
  preferencias: PreferenciasContato | null;
};

type DisciplinaAluno = {
  id: string;
  nomeDisciplina: string;
  professor: ProfessorContato;
};

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral", href: "/aluno/dashboard", active: false },
  { icon: ClipboardList, label: "Boletim e Notas", href: "/aluno/dashboard/notas", active: false },
  { icon: CalendarDays, label: "Meu Calendário", href: "/aluno/dashboard/calendario", active: false },
  { icon: CalendarCheck, label: "Frequência", href: "/aluno/dashboard/frequencia", active: false },
  { icon: BookOpen, label: "Grade e Matérias", href: "/aluno/dashboard/grade", active: false },
  { icon: MapIcon, label: "Mapa de Salas e Labs", href: "/aluno/dashboard/mapa", active: false },
  { icon: MessageSquare, label: "Contato", href: "/aluno/dashboard/contato", active: true },
];

const inputClass =
  "w-full bg-black border border-zinc-800 rounded-md text-sm text-white px-3 py-2.5 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors";

const assuntosSuporte: Record<string, string> = {
  financeiro: "Financeiro",
  documentos: "Documentos",
  tecnico: "Problema Técnico",
  outros: "Outros",
};

function nomeDisciplinaTurma(row: Record<string, unknown>): string {
  return String(
    row.nome ?? row.disciplina ?? row.curso ?? row.codigo ?? "Disciplina sem nome"
  ).trim();
}

function normalizarTurmaJoin(raw: unknown): Record<string, unknown> | null {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    return raw[0] ? normalizarTurmaJoin(raw[0]) : null;
  }
  if (typeof raw !== "object") return null;
  return raw as Record<string, unknown>;
}

function preferenciasDoProfessor(row: {
  preferencias?: unknown;
  dias_atendimento?: unknown;
  atendimento_de?: unknown;
  atendimento_ate?: unknown;
}): PreferenciasContato | null {
  const doJson = extrairAtendimentoSalvo(row.preferencias);
  if (doJson) return { atendimento: doJson };

  const diasColuna = Array.isArray(row.dias_atendimento)
    ? (row.dias_atendimento as string[]).filter(Boolean)
    : [];
  const deColuna =
    typeof row.atendimento_de === "string" ? row.atendimento_de.trim() : "";
  const ateColuna =
    typeof row.atendimento_ate === "string" ? row.atendimento_ate.trim() : "";

  if (diasColuna.length > 0 && deColuna && ateColuna) {
    const legado = extrairAtendimentoSalvo({
      dias_atendimento: diasColuna,
      atendimento_de: deColuna,
      atendimento_ate: ateColuna,
    });
    return legado ? { atendimento: legado } : null;
  }

  return null;
}

const SELECT_TURMA_CONTATO =
  "id, curso, codigo, professor_id, professores!professor_id(id, nome, preferencias, dias_atendimento, atendimento_de, atendimento_ate)";

function professorContatoDoJoin(
  turma: Record<string, unknown>
): ProfessorContato {
  const nested = turma.professores;
  const obj = Array.isArray(nested)
    ? (nested[0] as Record<string, unknown> | undefined)
    : (nested as Record<string, unknown> | null | undefined);

  if (obj && typeof obj === "object") {
    const nome = String(obj.nome ?? "").trim();
    return {
      id: String(obj.id ?? turma.professor_id ?? ""),
      nome: nome || "Professor não informado",
      preferencias: preferenciasDoProfessor(obj),
    };
  }

  return {
    id: turma.professor_id != null ? String(turma.professor_id) : "",
    nome: "Professor não informado",
    preferencias: null,
  };
}

type ChamadoAluno = {
  id: string;
  assunto: string;
  mensagem: string;
  status: string;
  resposta: string | null;
  data_abertura: string;
  destinatario_tipo: string | null;
  destinatario_nome: string | null;
};

function normalizarStatusChamado(valor: unknown): "aberto" | "respondido" {
  const raw = String(valor ?? "").trim().toLowerCase();
  if (
    raw === "respondido" ||
    raw === "respondida" ||
    raw === "concluido" ||
    raw === "concluído"
  ) {
    return "respondido";
  }
  return "aberto";
}

function formatarDataChamado(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function rotuloAssunto(assunto: string) {
  return assuntosSuporte[assunto] ?? assunto;
}

function mapearChamadoAluno(row: Record<string, unknown>): ChamadoAluno {
  return {
    id: String(row.id),
    assunto: String(row.assunto ?? "Sem assunto"),
    mensagem: String(row.mensagem ?? ""),
    status: String(row.status ?? "Aberto"),
    resposta: row.resposta != null ? String(row.resposta) : null,
    data_abertura: String(row.data_abertura ?? row.created_at ?? ""),
    destinatario_tipo:
      row.destinatario_tipo != null ? String(row.destinatario_tipo) : null,
    destinatario_nome:
      row.destinatario_nome != null ? String(row.destinatario_nome) : null,
  };
}

function destinoChamado(chamado: ChamadoAluno) {
  return chamado.destinatario_tipo === "Professor"
    ? chamado.destinatario_nome || "Professor"
    : "Suporte / Secretaria";
}

export default function AlunoContatoPage() {
  const { alunoLogado, carregandoSessao } = useAlunoSession();
  // Preferir primitivos (RA) nas deps dos effects — nunca um objeto recriado por render
  const alunoRa = alunoLogado?.ra ?? "";
  const alunoNome = alunoLogado?.nome ?? "";
  const alunoCurso = alunoLogado?.curso ?? "";
  const aluno = alunoLogado ? { nome: alunoNome, ra: alunoRa } : null;

  const [assuntoSuporte, setAssuntoSuporte] = useState("");
  const [mensagemSuporte, setMensagemSuporte] = useState("");
  const [enviandoSuporte, setEnviandoSuporte] = useState(false);

  const [disciplinasAluno, setDisciplinasAluno] = useState<DisciplinaAluno[]>([]);
  const [turmaSelecionadaId, setTurmaSelecionadaId] = useState("");
  const [professorSelecionado, setProfessorSelecionado] =
    useState<ProfessorContato | null>(null);
  const [assuntoProfessor, setAssuntoProfessor] = useState("");
  const [mensagemProfessor, setMensagemProfessor] = useState("");
  const [enviandoProfessor, setEnviandoProfessor] = useState(false);

  const [meusChamados, setMeusChamados] = useState<ChamadoAluno[]>([]);
  const [carregandoChamados, setCarregandoChamados] = useState(false);

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

  useEffect(() => {
    if (carregandoSessao || !alunoRa) return;

    let cancelado = false;

    async function carregarDisciplinasAluno() {
      try {
        // 1) Matrículas via notas + join com turmas → professores (FK)
        const { data: notasJoin, error: notasJoinError } = await supabase
          .from("notas")
          .select(`turma, turmas(${SELECT_TURMA_CONTATO})`)
          .eq("ra_aluno", alunoRa);

        if (cancelado) return;

        if (notasJoinError) {
          console.warn(
            "Join notas→turmas indisponível, tentando buscas separadas:",
            notasJoinError.message
          );
        }

        let turmasRows: Record<string, unknown>[] = [];
        const idsVistos = new Set<string>();

        for (const nota of (notasJoin ?? []) as Record<string, unknown>[]) {
          const turmaJoin = normalizarTurmaJoin(nota.turmas);
          if (turmaJoin) {
            const id = String(turmaJoin.id ?? "").trim();
            if (id && !idsVistos.has(id)) {
              idsVistos.add(id);
              turmasRows.push(turmaJoin);
            }
            continue;
          }
        }

        // 2) Busca por IDs/refs quando o join não trouxe linhas
        const turmaRefs = [
          ...new Set(
            ((notasJoin ?? []) as Record<string, unknown>[])
              .map((n) => String(n.turma ?? "").trim())
              .filter(Boolean)
          ),
        ];

        if (turmasRows.length === 0 && turmaRefs.length > 0) {
          const { data: turmasPorId, error: turmasIdError } = await supabase
            .from("turmas")
            .select(SELECT_TURMA_CONTATO)
            .in("id", turmaRefs);

          if (cancelado) return;

          if (turmasIdError) {
            console.error("Erro ao carregar turmas:", turmasIdError.message);
          } else {
            for (const t of (turmasPorId ?? []) as Record<string, unknown>[]) {
              const id = String(t.id ?? "").trim();
              if (id && !idsVistos.has(id)) {
                idsVistos.add(id);
                turmasRows.push(t);
              }
            }
          }

          if (turmasRows.length === 0) {
            const { data: turmasPorCodigo, error: codigoError } = await supabase
              .from("turmas")
              .select(SELECT_TURMA_CONTATO)
              .in("codigo", turmaRefs);

            if (cancelado) return;

            if (codigoError) {
              console.warn(
                "Erro ao buscar turmas por codigo:",
                codigoError.message
              );
            } else {
              for (const t of (turmasPorCodigo ?? []) as Record<
                string,
                unknown
              >[]) {
                const id = String(t.id ?? "").trim();
                if (id && !idsVistos.has(id)) {
                  idsVistos.add(id);
                  turmasRows.push(t);
                }
              }
            }
          }
        }

        // 3) Fallback: turmas do curso do aluno
        if (turmasRows.length === 0 && alunoCurso) {
          const { data: turmasCurso, error: turmasCursoError } = await supabase
            .from("turmas")
            .select(SELECT_TURMA_CONTATO)
            .ilike("curso", `%${alunoCurso}%`);

          if (cancelado) return;

          if (turmasCursoError) {
            console.error(
              "Erro ao carregar turmas do curso:",
              turmasCursoError.message
            );
            toast.error("Erro ao carregar disciplinas.");
            setDisciplinasAluno([]);
            return;
          }

          turmasRows = (turmasCurso ?? []) as Record<string, unknown>[];
        }

        if (turmasRows.length === 0) {
          setDisciplinasAluno([]);
          return;
        }

        if (cancelado) return;

        // Nome/preferências vêm do join relacional — sem busca por texto do nome
        const disciplinas: DisciplinaAluno[] = turmasRows.map((t, index) => {
          const id = String(t.id ?? `turma-${index}`);
          return {
            id,
            nomeDisciplina: nomeDisciplinaTurma(t),
            professor: professorContatoDoJoin(t),
          };
        });

        setDisciplinasAluno(disciplinas);
      } catch (err) {
        if (cancelado) return;
        console.error("Falha ao carregar disciplinas do aluno:", err);
        setDisciplinasAluno([]);
      }
    }

    void carregarDisciplinasAluno();

    return () => {
      cancelado = true;
    };
  }, [alunoRa, alunoCurso, carregandoSessao]);

  useEffect(() => {
    if (carregandoSessao || !alunoRa) return;

    let cancelado = false;

    async function carregarMeusChamados() {
      setCarregandoChamados(true);
      try {
        const { data, error } = await supabase
          .from("chamados")
          .select("*")
          .eq("ra_aluno", alunoRa)
          .order("data_abertura", { ascending: false });

        if (cancelado) return;

        if (error) {
          console.error(
            "Erro ao buscar chamados (verifique se a tabela 'chamados' existe no Supabase):",
            error.message,
            error
          );
          toast.error("Erro ao carregar seus chamados.");
          setMeusChamados([]);
          return;
        }

        setMeusChamados(
          ((data ?? []) as Record<string, unknown>[]).map(mapearChamadoAluno)
        );
      } catch (err) {
        if (cancelado) return;
        console.error(
          "Falha ao carregar chamados (tabela ausente ou erro de rede):",
          err
        );
        setMeusChamados([]);
      } finally {
        if (!cancelado) {
          setCarregandoChamados(false);
        }
      }
    }

    void carregarMeusChamados();

    return () => {
      cancelado = true;
    };
  }, [alunoRa, carregandoSessao]);

  async function atualizarListaChamados(ra: string) {
    const { data, error } = await supabase
      .from("chamados")
      .select("*")
      .eq("ra_aluno", ra)
      .order("data_abertura", { ascending: false });

    if (error) {
      toast.error("Erro ao atualizar lista de chamados.");
      return;
    }

    if (data) {
      setMeusChamados(
        (data as Record<string, unknown>[]).map(mapearChamadoAluno)
      );
    }
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

  async function handleEnviarSuporte(e: React.FormEvent) {
    e.preventDefault();

    if (!aluno?.ra || !aluno?.nome) {
      abrirFeedback(
        "atencao",
        "Sessão inválida",
        "Não foi possível identificar o aluno logado. Faça login novamente."
      );
      return;
    }

    if (!assuntoSuporte || !mensagemSuporte.trim()) {
      abrirFeedback(
        "atencao",
        "Campos incompletos",
        "Preencha o assunto e descreva sua solicitação para a secretaria."
      );
      return;
    }

    const assuntoSelecionado =
      assuntosSuporte[assuntoSuporte] ?? assuntoSuporte;
    const textoMensagem = mensagemSuporte.trim();

    setEnviandoSuporte(true);
    try {
      const { error } = await supabase.from("chamados").insert([
        {
          ra_aluno: aluno.ra,
          nome_aluno: aluno.nome,
          assunto: assuntoSelecionado,
          mensagem: textoMensagem,
          destinatario_tipo: "Secretaria",
          destinatario_nome: "Suporte / Secretaria",
        },
      ]);

      if (error) {
        console.error("Erro ao inserir chamado:", error.message);
        abrirFeedback(
          "erro",
          "Falha no envio",
          "Não foi possível protocolar sua solicitação. Tente novamente em instantes."
        );
        return;
      }

      setAssuntoSuporte("");
      setMensagemSuporte("");
      abrirFeedback(
        "sucesso",
        "Ticket Criado",
        "Sua solicitação foi protocolada junto à secretaria acadêmica. O prazo de resposta é de até 48 horas úteis."
      );
      await atualizarListaChamados(aluno.ra);
    } catch (err) {
      console.error("Erro ao enviar suporte:", err);
      abrirFeedback(
        "erro",
        "Falha no envio",
        "Não foi possível protocolar sua solicitação. Tente novamente em instantes."
      );
    } finally {
      setEnviandoSuporte(false);
    }
  }

  async function handleEnviarProfessor(e: React.FormEvent) {
    e.preventDefault();

    if (!aluno?.ra || !aluno?.nome) {
      abrirFeedback(
        "atencao",
        "Sessão inválida",
        "Não foi possível identificar o aluno logado. Faça login novamente."
      );
      return;
    }

    if (
      !professorSelecionado?.nome ||
      !turmaSelecionadaId ||
      !assuntoProfessor.trim() ||
      !mensagemProfessor.trim()
    ) {
      abrirFeedback(
        "atencao",
        "Campos incompletos",
        "Selecione a disciplina e preencha o assunto e a mensagem para o professor."
      );
      return;
    }

    const assuntoSelecionado = assuntoProfessor.trim();
    const textoMensagem = mensagemProfessor.trim();

    setEnviandoProfessor(true);
    try {
      const { error } = await supabase.from("chamados").insert([
        {
          ra_aluno: aluno.ra,
          nome_aluno: aluno.nome,
          assunto: assuntoSelecionado,
          mensagem: textoMensagem,
          destinatario_tipo: "Professor",
          destinatario_nome: professorSelecionado.nome,
        },
      ]);

      if (error) {
        console.error("Erro ao inserir chamado para professor:", error.message);
        abrirFeedback(
          "erro",
          "Falha no envio",
          "Não foi possível enviar a mensagem ao professor. Tente novamente."
        );
        return;
      }

      setTurmaSelecionadaId("");
      setProfessorSelecionado(null);
      setAssuntoProfessor("");
      setMensagemProfessor("");
      abrirFeedback(
        "sucesso",
        "Mensagem Enviada",
        "Sua dúvida foi entregue diretamente na caixa de entrada do docente."
      );
      await atualizarListaChamados(aluno.ra);
    } catch (err) {
      console.error("Erro ao enviar mensagem ao professor:", err);
      abrirFeedback(
        "erro",
        "Falha no envio",
        "Não foi possível enviar a mensagem ao professor. Tente novamente."
      );
    } finally {
      setEnviandoProfessor(false);
    }
  }

  if (carregandoSessao || !aluno) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-zinc-400 text-sm">
        Carregando sessão...
      </div>
    );
  }

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
              <div className="relative shrink-0">
                <AlunoAvatar
                  nome={aluno?.nome || alunoLogado?.nome || "Estudante"}
                  fotoUrl={alunoLogado?.foto_url}
                  className="w-10 h-10 text-base"
                  fallback="UN"
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-zinc-700 border border-zinc-900 rounded-full flex items-center justify-center cursor-pointer hover:bg-zinc-600 transition-colors">
                  <Camera className="w-2.5 h-2.5 text-zinc-300" />
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {aluno?.nome || "Carregando..."}
                </p>
                <p className="text-xs text-zinc-500">
                  RA: {aluno?.ra || "---"}
                </p>
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

        <div className="px-2 py-4 border-t border-zinc-800">
          <a
            href="/"
            onClick={() => limparSessaoAluno()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-500 hover:bg-zinc-900 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sair
          </a>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 py-10">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">
              Central de Atendimento
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Precisa de ajuda? Fale com o suporte institucional ou diretamente com
              seus professores.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/50 flex items-center justify-center shrink-0">
                  <Headphones className="w-4 h-4 text-zinc-300" />
                </div>
                <h2 className="text-sm font-semibold">Suporte / Secretaria</h2>
              </div>
              <p className="text-sm text-zinc-400 mb-6">
                Para dúvidas financeiras, documentos, matrículas ou problemas
                técnicos.
              </p>

              <form className="flex flex-col gap-4" onSubmit={handleEnviarSuporte}>
                <div>
                  <label
                    htmlFor="assunto-suporte"
                    className="block text-xs text-zinc-500 uppercase tracking-widest mb-1.5"
                  >
                    Assunto
                  </label>
                  <select
                    id="assunto-suporte"
                    name="assunto"
                    className={inputClass}
                    value={assuntoSuporte}
                    onChange={(e) => setAssuntoSuporte(e.target.value)}
                  >
                    <option value="" disabled>
                      Selecione o assunto
                    </option>
                    <option value="financeiro">Financeiro</option>
                    <option value="documentos">Documentos</option>
                    <option value="tecnico">Problema Técnico</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="mensagem-suporte"
                    className="block text-xs text-zinc-500 uppercase tracking-widest mb-1.5"
                  >
                    Sua mensagem
                  </label>
                  <textarea
                    id="mensagem-suporte"
                    name="mensagem"
                    placeholder="Descreva sua solicitação..."
                    className={`${inputClass} min-h-[120px] resize-y`}
                    value={mensagemSuporte}
                    onChange={(e) => setMensagemSuporte(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={enviandoSuporte}
                  className="w-full bg-white text-black text-sm font-medium rounded-md py-2.5 hover:bg-zinc-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {enviandoSuporte ? "Enviando..." : "Enviar para Suporte"}
                </button>
              </form>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/50 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-zinc-300" />
                </div>
                <h2 className="text-sm font-semibold">Falar com Professor</h2>
              </div>
              <p className="text-sm text-zinc-400 mb-6">
                Para dúvidas sobre matérias, notas, faltas ou trabalhos.
              </p>

              <form
                className="flex flex-col gap-4"
                onSubmit={handleEnviarProfessor}
              >
                <div>
                  <label
                    htmlFor="disciplina-professor"
                    className="block text-xs text-zinc-500 uppercase tracking-widest mb-1.5"
                  >
                    Selecione a Disciplina/Professor
                  </label>
                  <select
                    id="disciplina-professor"
                    name="disciplina"
                    className={inputClass}
                    value={turmaSelecionadaId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setTurmaSelecionadaId(id);
                      const disciplina = disciplinasAluno.find(
                        (item) => String(item.id) === id
                      );
                      setProfessorSelecionado(disciplina?.professor ?? null);
                    }}
                  >
                    <option value="" disabled>
                      Selecione a disciplina
                    </option>
                    {disciplinasAluno.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nomeDisciplina} - Prof. {item.professor.nome}
                      </option>
                    ))}
                  </select>
                  {professorSelecionado?.preferencias?.atendimento && (
                    <div className="mt-2 p-3 bg-zinc-950/80 rounded-md border border-zinc-800 text-sm">
                      <p className="text-zinc-400 font-medium mb-1 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        Horário de Atendimento do Professor:
                      </p>
                      <p className="text-zinc-500">
                        Dias:{" "}
                        {professorSelecionado.preferencias.atendimento.dias.join(
                          ", "
                        )}
                        <br />
                        Horário: das{" "}
                        {professorSelecionado.preferencias.atendimento.inicio} às{" "}
                        {professorSelecionado.preferencias.atendimento.fim}
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="assunto-professor"
                    className="block text-xs text-zinc-500 uppercase tracking-widest mb-1.5"
                  >
                    Assunto da Mensagem
                  </label>
                  <input
                    id="assunto-professor"
                    name="assunto"
                    type="text"
                    placeholder="Ex.: Dúvida sobre a prova"
                    className={inputClass}
                    value={assuntoProfessor}
                    onChange={(e) => setAssuntoProfessor(e.target.value)}
                  />
                </div>
                <div>
                  <label
                    htmlFor="mensagem-professor"
                    className="block text-xs text-zinc-500 uppercase tracking-widest mb-1.5"
                  >
                    Sua mensagem
                  </label>
                  <textarea
                    id="mensagem-professor"
                    name="mensagem"
                    placeholder="Escreva sua mensagem..."
                    className={`${inputClass} min-h-[120px] resize-y`}
                    value={mensagemProfessor}
                    onChange={(e) => setMensagemProfessor(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={enviandoProfessor}
                  className="w-full bg-white text-black text-sm font-medium rounded-md py-2.5 hover:bg-zinc-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {enviandoProfessor ? "Enviando..." : "Enviar para Professor"}
                </button>
              </form>
            </div>
          </div>

          <section className="mt-8">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/50 flex items-center justify-center shrink-0">
                <Ticket className="w-4 h-4 text-zinc-300" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">Meus Chamados</h2>
                <p className="text-xs text-zinc-500">
                  Acompanhe o status das solicitações enviadas ao suporte e aos
                  professores.
                </p>
              </div>
            </div>

            {carregandoChamados ? (
              <p className="text-sm text-zinc-500 py-6">Carregando chamados...</p>
            ) : meusChamados.length === 0 ? (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl px-6 py-8 text-center">
                <p className="text-sm text-zinc-400">
                  Nenhum chamado ou mensagem em aberto no momento.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {meusChamados.map((chamado) => {
                  const statusNorm = normalizarStatusChamado(chamado.status);
                  const respondido = statusNorm === "respondido";

                  return (
                    <li
                      key={chamado.id}
                      className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white">
                            {rotuloAssunto(chamado.assunto)}
                          </p>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            Aberto em {formatarDataChamado(chamado.data_abertura)}
                          </p>
                          <p className="text-xs text-zinc-400 mt-1">
                            Destino: {destinoChamado(chamado)}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border ${
                            respondido
                              ? "bg-emerald-950/50 text-emerald-400 border-emerald-800"
                              : "bg-rose-950/50 text-rose-400 border-rose-800"
                          }`}
                        >
                          {respondido ? "Respondido" : "Aberto"}
                        </span>
                      </div>

                      {chamado.mensagem ? (
                        <p className="text-sm text-zinc-300 whitespace-pre-wrap">
                          {chamado.mensagem}
                        </p>
                      ) : null}

                      {respondido && chamado.resposta ? (
                        <div className="mt-4 pt-4 border-t border-zinc-800">
                          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1.5">
                            Resposta da faculdade
                          </p>
                          <p className="text-sm text-zinc-200 whitespace-pre-wrap">
                            {chamado.resposta}
                          </p>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
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
