"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  BookOpen,
  UserCheck,
  Sparkles,
  MessageSquare,
  Map as MapIcon,
  CalendarDays,
  LogOut,
  GraduationCap,
  Save,
  Loader2,
  ChevronDown,
  ChevronUp,
  Mail,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { ProfessorSettingsControl } from "@/components/professor/config-modal";
import { ModalFeedback } from "@/components/ModalFeedback";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import {
  iniciaisDoProfessor,
  limparSessaoProfessor,
  lerSessaoProfessor,
  normalizarPesosAvaliacao,
  PESOS_AVALIACAO_PADRAO,
  useProfessorSession,
  type PesosAvaliacao,
} from "@/lib/professor-session";

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral", href: "/professor/dashboard", active: false },
  { icon: BookOpen, label: "Turmas e Notas", href: "/professor/dashboard/notas", active: true },
  { icon: UserCheck, label: "Chamada Rápida", href: "/professor/dashboard/chamada", active: false },
  { icon: CalendarDays, label: "Agenda Semestral", href: "/professor/dashboard/agenda", active: false },
  { icon: MapIcon, label: "Mapa de Salas", href: "/professor/dashboard/mapa", active: false },
  { icon: Sparkles, label: "Insights IA", href: "/professor/dashboard/insights", active: false },
  { icon: MessageSquare, label: "Mensagens", href: "/professor/dashboard/mensagens", active: false },
];

type CampoNota = "atv1" | "atv2" | "atv3" | "atv4" | "prova";

type TurmaOption = {
  id: string;
  codigo: string;
  curso: string;
  turno?: string;
};

type AlunoTurma = {
  ra: string;
  nome: string;
  atv1: number;
  atv2: number;
  atv3: number;
  atv4: number;
  prova: number;
  faltas: number;
  email_institucional?: string;
  email_pessoal?: string;
  email?: string;
};

const LABELS_COMPOSICAO: Record<CampoNota, string> = {
  atv1: "Atividade 1",
  atv2: "Atividade 2",
  atv3: "Atividade 3",
  atv4: "Atividade 4",
  prova: "Prova Semestral",
};

const CAMPOS_PESO: CampoNota[] = ["atv1", "atv2", "atv3", "atv4", "prova"];

function labelTurma(turma: TurmaOption) {
  const turno = turma.turno ? ` (${turma.turno})` : "";
  return `${turma.curso} - Turma ${turma.codigo}${turno}`;
}

function toNumber(valor: unknown): number {
  const n = Number(valor ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function mapAlunoTurma(row: Record<string, unknown>): AlunoTurma {
  return {
    ra: String(row.ra ?? ""),
    nome: String(row.nome ?? ""),
    atv1: toNumber(row.atv1),
    atv2: toNumber(row.atv2),
    atv3: toNumber(row.atv3),
    atv4: toNumber(row.atv4),
    prova: toNumber(row.prova),
    faltas: toNumber(row.faltas),
    email_institucional: row.email_institucional
      ? String(row.email_institucional).trim()
      : undefined,
    email_pessoal: row.email_pessoal
      ? String(row.email_pessoal).trim()
      : undefined,
    email: row.email ? String(row.email).trim() : undefined,
  };
}

function escaparHtml(texto: string) {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function emailDoAluno(aluno: AlunoTurma) {
  const candidatos = [
    aluno.email_pessoal,
    aluno.email_institucional,
    aluno.email,
  ];
  for (const valor of candidatos) {
    const email = (valor ?? "").trim();
    if (email && email !== "—") return email;
  }
  return "";
}

function totalN1(aluno: AlunoTurma): number {
  const soma = aluno.atv1 + aluno.atv2 + aluno.atv3 + aluno.atv4 + aluno.prova;
  return Math.round(soma * 10) / 10;
}

function formatNota(valor: number): string {
  return valor.toFixed(1);
}

function somaPesos(p: PesosAvaliacao): number {
  return Math.round((p.atv1 + p.atv2 + p.atv3 + p.atv4 + p.prova) * 10) / 10;
}

function atualizarSessaoPesos(novosPesos: PesosAvaliacao) {
  const sessao = lerSessaoProfessor();
  if (!sessao) return;
  localStorage.setItem(
    "uniclass_prof_session",
    JSON.stringify({ ...sessao, pesos: novosPesos })
  );
}

function limitarNotasAosPesos(
  alunos: AlunoTurma[],
  limites: PesosAvaliacao
): AlunoTurma[] {
  return alunos.map((aluno) => ({
    ...aluno,
    atv1: Math.min(aluno.atv1, limites.atv1),
    atv2: Math.min(aluno.atv2, limites.atv2),
    atv3: Math.min(aluno.atv3, limites.atv3),
    atv4: Math.min(aluno.atv4, limites.atv4),
    prova: Math.min(aluno.prova, limites.prova),
  }));
}

const inputComposicaoClass =
  "w-full rounded-md bg-zinc-950 border border-zinc-700 text-white text-sm text-center px-2 py-2 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

const inputComposicaoErroClass =
  "w-full rounded-md bg-zinc-950 border border-red-500/70 text-white text-sm text-center px-2 py-2 outline-none focus:border-red-400 focus:ring-1 focus:ring-red-500/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

const inputNotaComCheckClass =
  "w-full rounded-md bg-zinc-950 border border-zinc-700 text-white text-sm text-center pl-2 pr-8 py-2 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

const inputNotaComCheckErroClass =
  "w-full rounded-md bg-zinc-950 border border-red-500/70 text-white text-sm text-center pl-2 pr-8 py-2 outline-none focus:border-red-400 focus:ring-1 focus:ring-red-500/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

const inputDisabledClass =
  "w-full appearance-none bg-zinc-900/80 border border-zinc-800 text-sm text-zinc-300 rounded-lg px-4 py-2.5 cursor-not-allowed";

export default function DiarioDeClassePage() {
  const { professorLogado, carregandoSessao } = useProfessorSession();
  const [turmaSelecionada, setTurmaSelecionada] = useState("");
  const [turmas, setTurmas] = useState<TurmaOption[]>([]);
  const [carregandoTurmas, setCarregandoTurmas] = useState(true);
  const [alunosTurma, setAlunosTurma] = useState<AlunoTurma[]>([]);
  const [loadingAlunos, setLoadingAlunos] = useState(false);
  const [alunoExpandido, setAlunoExpandido] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [salvandoNotaKey, setSalvandoNotaKey] = useState<string | null>(null);
  const [pesos, setPesos] = useState<PesosAvaliacao>(PESOS_AVALIACAO_PADRAO);
  const [isConfigurandoPesos, setIsConfigurandoPesos] = useState(false);
  const [salvandoPesos, setSalvandoPesos] = useState(false);
  const [errosNota, setErrosNota] = useState<Record<string, string>>({});
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

  const disciplinaProfessor = professorLogado?.disciplina?.trim() || "";
  const totalDistribuicao = somaPesos(pesos);
  const pesosValidos = totalDistribuicao === 10;

  // Mesma lógica estrutural de chamada/page.tsx: turmas da área do professor
  useEffect(() => {
    if (!professorLogado) {
      setTurmas([]);
      setCarregandoTurmas(false);
      return;
    }

    let cancelado = false;

    async function fetchTurmas() {
      setCarregandoTurmas(true);
      const areaAtuacao = professorLogado!.area_atuacao?.trim() ?? "";

      const { data, error } = await supabase
        .from("turmas")
        .select("*")
        .ilike("curso", `%${areaAtuacao}%`);

      if (cancelado) return;

      if (error) {
        console.error("Erro ao buscar turmas:", error.message);
        setTurmas([]);
        setTurmaSelecionada("");
        setCarregandoTurmas(false);
        return;
      }

      const lista = ((data ?? []) as Record<string, unknown>[]).map(
        (turma) => ({
          id: String(turma.id),
          codigo: String(turma.codigo ?? ""),
          curso: String(turma.curso ?? ""),
          turno: turma.turno ? String(turma.turno) : undefined,
        })
      );

      setTurmas(lista);

      // Auto-select apenas quando houver uma única turma do professor
      if (lista.length === 1) {
        setTurmaSelecionada(lista[0].codigo);
      } else {
        setTurmaSelecionada((prev) =>
          prev && lista.some((t) => t.codigo === prev) ? prev : ""
        );
      }
      setCarregandoTurmas(false);
    }

    void fetchTurmas();

    return () => {
      cancelado = true;
    };
  }, [professorLogado]);

  useEffect(() => {
    if (!professorLogado) return;

    setPesos(normalizarPesosAvaliacao(professorLogado.pesos));

    let cancelado = false;

    async function carregarPesosDoBanco() {
      const { data, error } = await supabase
        .from("professores")
        .select("pesos")
        .eq("id", professorLogado!.id)
        .maybeSingle();

      if (cancelado) return;

      if (error) {
        console.warn("Não foi possível carregar pesos do professor:", error.message);
        return;
      }

      if (data?.pesos != null) {
        const normalizados = normalizarPesosAvaliacao(data.pesos);
        setPesos(normalizados);
        atualizarSessaoPesos(normalizados);
      }
    }

    void carregarPesosDoBanco();

    return () => {
      cancelado = true;
    };
  }, [professorLogado]);

  useEffect(() => {
    let cancelado = false;

    // Feedback visual imediato ao trocar a turma
    setAlunosTurma([]);
    setAlunoExpandido(null);
    setErrosNota({});

    async function buscarAlunosDaTurma(codigoTurma: string) {
      const turma = turmas.find((t) => t.codigo === codigoTurma);
      if (!turma) {
        if (!cancelado) {
          setAlunosTurma([]);
          setLoadingAlunos(false);
        }
        return;
      }

      setLoadingAlunos(true);

      // Prioriza alunos vinculados ao código da turma (ex: GTI-5A-N)
      let { data, error } = await supabase
        .from("alunos")
        .select(
          "ra, nome, atv1, atv2, atv3, atv4, prova, faltas, n1, email_institucional, email_pessoal"
        )
        .eq("turma", codigoTurma)
        .order("nome", { ascending: true });

      // Fallback: alunos do mesmo curso da turma
      if (error || !data || data.length === 0) {
        const porCurso = await supabase
          .from("alunos")
          .select(
            "ra, nome, atv1, atv2, atv3, atv4, prova, faltas, n1, email_institucional, email_pessoal"
          )
          .eq("curso", turma.curso)
          .order("nome", { ascending: true });

        if (porCurso.error) {
          if (!cancelado) {
            console.error(
              "Erro ao buscar alunos da turma:",
              error?.message ?? porCurso.error.message
            );
            setAlunosTurma([]);
            setLoadingAlunos(false);
          }
          return;
        }

        data = porCurso.data;
        error = porCurso.error;
      }

      if (cancelado) return;

      if (error) {
        console.error("Erro ao buscar alunos da turma:", error.message);
        setAlunosTurma([]);
        setLoadingAlunos(false);
        return;
      }

      const alunosUnicos = Array.from(
        new Map((data ?? []).map((item) => [item.ra, item])).values()
      );

      setAlunosTurma(
        alunosUnicos.map((row) =>
          mapAlunoTurma(row as Record<string, unknown>)
        )
      );
      setLoadingAlunos(false);
    }

    if (turmaSelecionada) {
      void buscarAlunosDaTurma(turmaSelecionada.trim());
    } else {
      setLoadingAlunos(false);
    }

    return () => {
      cancelado = true;
    };
  }, [turmaSelecionada, turmas]);

  function atualizarPeso(campo: CampoNota, valor: string) {
    const numerico = valor === "" ? 0 : Number(valor);
    if (Number.isNaN(numerico) || numerico < 0) return;
    setPesos((prev) => ({ ...prev, [campo]: numerico }));
  }

  function atualizarAluno(ra: string, campo: CampoNota, valor: string) {
    const chaveErro = `${ra}-${campo}`;
    const numerico = valor === "" ? 0 : Number(valor);
    if (Number.isNaN(numerico)) return;

    const max = pesos[campo];

    if (numerico > max) {
      setErrosNota((prev) => ({
        ...prev,
        [chaveErro]: `Máximo permitido: ${formatNota(max)}`,
      }));
      setAlunosTurma((prev) =>
        prev.map((aluno) =>
          aluno.ra !== ra ? aluno : { ...aluno, [campo]: max }
        )
      );
      return;
    }

    setErrosNota((prev) => {
      if (!prev[chaveErro]) return prev;
      const proximo = { ...prev };
      delete proximo[chaveErro];
      return proximo;
    });

    setAlunosTurma((prev) =>
      prev.map((aluno) => {
        if (aluno.ra !== ra) return aluno;
        const ajustado = Math.min(max, Math.max(0, numerico));
        return { ...aluno, [campo]: ajustado };
      })
    );
  }

  function toggleExpandir(ra: string) {
    setAlunoExpandido((prev) => (prev === ra ? null : ra));
  }

  async function notificarNotas(aluno: AlunoTurma) {
    let destinatario = emailDoAluno(aluno);

    // Garante e-mail atualizado do banco caso a lista tenha vindo sem o campo
    if (!destinatario && aluno.ra) {
      const { data } = await supabase
        .from("alunos")
        .select("email_institucional, email_pessoal")
        .eq("ra", aluno.ra)
        .maybeSingle();

      if (data) {
        destinatario = emailDoAluno({
          ...aluno,
          email_institucional: data.email_institucional
            ? String(data.email_institucional).trim()
            : undefined,
          email_pessoal: data.email_pessoal
            ? String(data.email_pessoal).trim()
            : undefined,
        });
      }
    }

    if (!destinatario) {
      toast.error("Este aluno não possui e-mail cadastrado.");
      return;
    }

    const nomeDaDisciplina =
      disciplinaProfessor.trim() || "Disciplina não informada";
    const notaTotal = formatNota(totalN1(aluno));
    const nomeSeguro = escaparHtml(aluno.nome || "aluno(a)");
    const disciplinaSegura = escaparHtml(nomeDaDisciplina);
    const dataEnvio = new Date().toLocaleDateString("pt-BR");

    const html = `
<div style="background-color: #000000; padding: 40px 20px; font-family: sans-serif; color: #ffffff;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #141414; border: 1px solid #333; border-radius: 8px; padding: 30px;">
    <h2 style="margin-top: 0; font-size: 24px; font-weight: bold;">UniClassTech</h2>
    <h3 style="font-size: 18px; font-weight: 600; margin-top: 20px;">Olá, ${nomeSeguro}! Aqui está o seu extrato de notas.</h3>
    <p style="font-size: 15px; color: #cccccc;">Disciplina: <strong>${disciplinaSegura}</strong></p>
    
    <div style="background-color: #1e1e1e; padding: 20px; border-radius: 6px; margin-top: 20px;">
      <p style="margin: 5px 0; color: #ccc;">Atividade 1: <strong style="color: #fff;">${formatNota(aluno.atv1)}</strong></p>
      <p style="margin: 5px 0; color: #ccc;">Atividade 2: <strong style="color: #fff;">${formatNota(aluno.atv2)}</strong></p>
      <p style="margin: 5px 0; color: #ccc;">Atividade 3: <strong style="color: #fff;">${formatNota(aluno.atv3)}</strong></p>
      <p style="margin: 5px 0; color: #ccc;">Atividade 4: <strong style="color: #fff;">${formatNota(aluno.atv4)}</strong></p>
      <p style="margin: 5px 0; color: #ccc;">Prova Semestral: <strong style="color: #fff;">${formatNota(aluno.prova)}</strong></p>
      <hr style="border: 0; border-top: 1px solid #333; margin: 15px 0;" />
      <p style="margin: 5px 0; color: #ccc;">Faltas Registradas: <strong style="color: #fff;">${aluno.faltas}</strong></p>
      <hr style="border: 0; border-top: 1px solid #333; margin: 15px 0;" />
      <p style="margin: 5px 0; color: #ccc;">Soma das Atividades + Prova: <strong style="color: #4ade80;">${notaTotal} / 10.0</strong></p>
    </div>
    
    <p style="font-size: 13px; color: #888; margin-top: 25px;">
      Este é um e-mail automático enviado pelo seu professor via UniClassTech em ${dataEnvio}.
    </p>
  </div>
</div>
    `.trim();

    const promise = fetch("/api/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: destinatario,
        subject: `Atualização de Notas: ${nomeDaDisciplina}`,
        html,
        text:
          `Olá, ${aluno.nome}!\n\n` +
          `Disciplina: ${nomeDaDisciplina}\n` +
          `Atividade 1: ${formatNota(aluno.atv1)}\n` +
          `Atividade 2: ${formatNota(aluno.atv2)}\n` +
          `Atividade 3: ${formatNota(aluno.atv3)}\n` +
          `Atividade 4: ${formatNota(aluno.atv4)}\n` +
          `Prova Semestral: ${formatNota(aluno.prova)}\n` +
          `Faltas: ${aluno.faltas}\n` +
          `Total N1: ${notaTotal} / 10.0\n`,
      }),
    }).then(async (res) => {
      const payload = (await res.json().catch(() => ({}))) as {
        error?: unknown;
      };
      if (!res.ok) {
        const msg =
          typeof payload.error === "string"
            ? payload.error
            : "Erro ao enviar e-mail.";
        throw new Error(msg);
      }
      return payload;
    });

    toast.promise(promise, {
      loading: "Enviando e-mail...",
      success: "E-mail enviado!",
      error: (err: unknown) =>
        err instanceof Error ? err.message : "Erro ao enviar",
    });

    try {
      await promise;
    } catch {
      // feedback já tratado pelo toast.promise
    }
  }

  async function salvarNotaEspecifica(ra: string, campo: CampoNota) {
    if (!turmaSelecionada) {
      toast.error("Selecione a turma antes de salvar a nota.");
      return;
    }

    const chaveErro = `${ra}-${campo}`;
    if (errosNota[chaveErro]) {
      toast.error(errosNota[chaveErro]);
      return;
    }

    const aluno = alunosTurma.find((a) => a.ra === ra);
    if (!aluno) {
      toast.error("Aluno não encontrado na turma.");
      return;
    }

    const chaveSalvar = `${ra}-${campo}`;
    if (salvandoNotaKey === chaveSalvar) return;

    const valor = aluno[campo];
    const n1 = totalN1(aluno);
    const label = LABELS_COMPOSICAO[campo];

    setSalvandoNotaKey(chaveSalvar);

    const promise = (async () => {
      const { error } = await supabase
        .from("alunos")
        .update({
          [campo]: valor,
          n1,
        })
        .eq("ra", ra)
        .eq("turma", turmaSelecionada);

      if (error) throw new Error(error.message);
      return { label, valor };
    })();

    toast.promise(promise, {
      loading: `Salvando ${label}...`,
      success: (data) =>
        `${data.label} salva: ${formatNota(data.valor)}`,
      error: (err: unknown) =>
        err instanceof Error ? err.message : "Erro ao salvar nota.",
    });

    try {
      await promise;
    } catch {
      // feedback já tratado pelo toast.promise
    } finally {
      setSalvandoNotaKey(null);
    }
  }

  async function handleSalvarPesos() {
    if (!professorLogado?.id) {
      setModalFeedback({
        aberto: true,
        tipo: "erro",
        titulo: "Sessão inválida",
        mensagem: "Não foi possível identificar o professor logado.",
      });
      return;
    }

    if (!pesosValidos) {
      setModalFeedback({
        aberto: true,
        tipo: "atencao",
        titulo: "Distribuição inválida",
        mensagem: "A soma dos pesos deve ser exatamente 10.0.",
      });
      return;
    }

    setSalvandoPesos(true);

    const { error } = await supabase
      .from("professores")
      .update({ pesos })
      .eq("id", professorLogado.id);

    setSalvandoPesos(false);

    if (error) {
      console.error("Erro ao salvar pesos:", error.message);
      setModalFeedback({
        aberto: true,
        tipo: "erro",
        titulo: "Falha ao salvar regra",
        mensagem: error.message,
      });
      return;
    }

    atualizarSessaoPesos(pesos);
    setAlunosTurma((prev) => limitarNotasAosPesos(prev, pesos));
    setErrosNota({});
    setIsConfigurandoPesos(false);

    setModalFeedback({
      aberto: true,
      tipo: "sucesso",
      titulo: "Regra salva",
      mensagem: "A distribuição de pontos foi atualizada com sucesso.",
    });
  }

  async function handleSalvarLancamentos() {
    if (!turmaSelecionada) {
      setModalFeedback({
        aberto: true,
        tipo: "atencao",
        titulo: "Filtros pendentes",
        mensagem: "Selecione a turma antes de salvar os lançamentos.",
      });
      return;
    }

    if (alunosTurma.length === 0) {
      setModalFeedback({
        aberto: true,
        tipo: "atencao",
        titulo: "Sem alunos",
        mensagem: "Não há alunos para salvar nesta turma.",
      });
      return;
    }

    setSalvando(true);

    const resultados = await Promise.all(
      alunosTurma.map((aluno) =>
        supabase
          .from("alunos")
          .update({
            atv1: aluno.atv1,
            atv2: aluno.atv2,
            atv3: aluno.atv3,
            atv4: aluno.atv4,
            prova: aluno.prova,
            n1: totalN1(aluno),
          })
          .eq("ra", aluno.ra)
          .eq("turma", turmaSelecionada)
      )
    );

    setSalvando(false);

    const erro = resultados.find((r) => r.error)?.error;
    if (erro) {
      console.error("Erro ao salvar lançamentos:", erro.message);
      setModalFeedback({
        aberto: true,
        tipo: "erro",
        titulo: "Falha ao salvar",
        mensagem: erro.message,
      });
      return;
    }

    setModalFeedback({
      aberto: true,
      tipo: "sucesso",
      titulo: "Lançamentos salvos",
      mensagem: `Notas de ${alunosTurma.length} aluno(s) atualizadas para ${turmaSelecionada}${
        disciplinaProfessor ? ` — ${disciplinaProfessor}` : ""
      }.`,
    });
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
            href="/"
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
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Diário de Classe
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Gerencie notas e frequência dos alunos
            </p>
          </div>

          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] gap-3 items-end">
            <div>
              <label
                htmlFor="filtro-turma"
                className="block text-xs text-zinc-500 mb-1.5"
              >
                Selecione a Turma
              </label>
              <select
                id="filtro-turma"
                value={turmaSelecionada}
                onChange={(e) => {
                  const value = e.target.value;
                  setTurmaSelecionada(value);
                  setAlunosTurma([]);
                  setAlunoExpandido(null);
                  setErrosNota({});
                }}
                disabled={carregandoTurmas}
                className="w-full appearance-none bg-zinc-950 border border-zinc-700 text-sm text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-zinc-500 cursor-pointer hover:border-zinc-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {carregandoTurmas ? (
                  <option value="">Carregando turmas...</option>
                ) : turmas.length === 0 ? (
                  <option value="">Nenhuma turma da sua área</option>
                ) : (
                  <>
                    {turmas.length > 1 && (
                      <option value="">Selecione a Turma</option>
                    )}
                    {turmas.map((turma) => (
                      <option key={turma.id} value={turma.codigo}>
                        {labelTurma(turma)}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>
            <div>
              <label
                htmlFor="filtro-disciplina"
                className="block text-xs text-zinc-500 mb-1.5"
              >
                Disciplina
              </label>
              <input
                id="filtro-disciplina"
                type="text"
                value={disciplinaProfessor || "—"}
                disabled
                readOnly
                className={inputDisabledClass}
                aria-label="Disciplina do professor"
              />
            </div>
            <div>
              <button
                type="button"
                onClick={() => setIsConfigurandoPesos((prev) => !prev)}
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:border-zinc-500 hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <span aria-hidden>⚙️</span>
                Configurar Distribuição de Pontos
              </button>
            </div>
          </div>

          {isConfigurandoPesos && (
            <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-950/60 p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Distribuição de Pontos do Semestre
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    Defina o peso máximo de cada avaliação. A soma deve ser 10.0.
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-semibold ${
                      pesosValidos ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    Total: {formatNota(totalDistribuicao)} / 10.0
                  </p>
                  {!pesosValidos && (
                    <p className="mt-1 text-xs text-red-400">
                      A soma dos pesos deve ser exatamente 10.0
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {CAMPOS_PESO.map((campo) => (
                  <div key={campo}>
                    <label
                      className="mb-1.5 block text-[11px] text-zinc-500"
                      htmlFor={`peso-${campo}`}
                    >
                      {LABELS_COMPOSICAO[campo]}
                    </label>
                    <input
                      id={`peso-${campo}`}
                      type="number"
                      min={0}
                      max={10}
                      step={0.1}
                      value={pesos[campo]}
                      onChange={(e) => atualizarPeso(campo, e.target.value)}
                      className={inputComposicaoClass}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleSalvarPesos()}
                  disabled={!pesosValidos || salvandoPesos}
                  className="inline-flex items-center gap-2 rounded-lg bg-white text-black text-sm font-medium px-4 py-2.5 hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {salvandoPesos ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {salvandoPesos ? "Salvando..." : "Salvar Regra"}
                </button>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-950/40">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">
                Lista de Chamada e Notas
              </h2>
              <span className="text-xs text-zinc-600">
                {loadingAlunos
                  ? "Carregando..."
                  : `${alunosTurma.length} alunos`}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-zinc-500 uppercase bg-zinc-950 border-b border-zinc-800">
                    <th className="px-6 py-3 text-left font-medium tracking-wider">
                      RA
                    </th>
                    <th className="px-4 py-3 text-left font-medium tracking-wider">
                      Aluno
                    </th>
                    <th className="px-4 py-3 text-center font-medium tracking-wider">
                      N1
                    </th>
                    <th className="px-4 py-3 text-center font-medium tracking-wider">
                      Faltas
                    </th>
                    <th className="px-6 py-3 text-right font-medium tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {!turmaSelecionada ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-10 text-center text-sm text-zinc-500"
                      >
                        Selecione uma turma para carregar a lista de alunos.
                      </td>
                    </tr>
                  ) : loadingAlunos ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-10 text-center text-sm text-zinc-400"
                      >
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Buscando alunos da turma {turmaSelecionada}...
                        </span>
                      </td>
                    </tr>
                  ) : alunosTurma.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-10 text-center text-sm text-zinc-500"
                      >
                        Nenhum aluno encontrado para a turma {turmaSelecionada}.
                      </td>
                    </tr>
                  ) : (
                    alunosTurma.map((aluno) => {
                      const expandido = alunoExpandido === aluno.ra;
                      const n1 = totalN1(aluno);

                      return (
                        <Fragment key={aluno.ra}>
                          <tr className="border-b border-zinc-800/80 hover:bg-zinc-900/40 transition-colors">
                            <td className="px-6 py-3 text-zinc-400 font-mono text-xs">
                              {aluno.ra}
                            </td>
                            <td className="px-4 py-3 font-medium text-white">
                              {aluno.nome}
                            </td>
                            <td className="px-4 py-3 text-center text-white font-medium">
                              {formatNota(n1)}
                            </td>
                            <td className="px-4 py-3 text-center text-zinc-300">
                              {aluno.faltas}
                            </td>
                            <td className="px-6 py-3 text-right">
                              <div className="flex gap-2 items-center justify-end">
                                <button
                                  type="button"
                                  onClick={() => toggleExpandir(aluno.ra)}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:border-zinc-500 hover:bg-zinc-800 transition-colors cursor-pointer"
                                >
                                  Lançar Notas
                                  {expandido ? (
                                    <ChevronUp className="h-3.5 w-3.5" />
                                  ) : (
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  )}
                                </button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  title={`Enviar extrato de notas para ${aluno.nome}`}
                                  aria-label={`Enviar extrato de notas para ${aluno.nome}`}
                                  className="h-8 w-8 size-auto border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 hover:text-white"
                                  onClick={() => void notificarNotas(aluno)}
                                >
                                  <Mail className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>

                          {expandido && (
                            <tr className="border-b border-zinc-800 bg-zinc-900/50">
                              <td colSpan={5} className="px-6 py-4">
                                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                                  Composição da Nota — {aluno.nome}
                                </p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                                  {CAMPOS_PESO.map((campo) => {
                                    const max = pesos[campo];
                                    const chaveErro = `${aluno.ra}-${campo}`;
                                    const temErro = Boolean(errosNota[chaveErro]);
                                    const salvandoEste =
                                      salvandoNotaKey === `${aluno.ra}-${campo}`;

                                    return (
                                      <div key={campo}>
                                        <label
                                          className="mb-1.5 block text-[11px] text-zinc-500"
                                          htmlFor={`${aluno.ra}-${campo}`}
                                        >
                                          {LABELS_COMPOSICAO[campo]} (Máx{" "}
                                          {formatNota(max)})
                                        </label>
                                        <div className="relative flex items-center">
                                          <input
                                            id={`${aluno.ra}-${campo}`}
                                            type="number"
                                            min={0}
                                            max={max}
                                            step={0.1}
                                            value={aluno[campo]}
                                            onChange={(e) =>
                                              atualizarAluno(
                                                aluno.ra,
                                                campo,
                                                e.target.value
                                              )
                                            }
                                            className={
                                              temErro
                                                ? inputNotaComCheckErroClass
                                                : inputNotaComCheckClass
                                            }
                                          />
                                          <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            title={`Salvar ${LABELS_COMPOSICAO[campo]}`}
                                            aria-label={`Salvar ${LABELS_COMPOSICAO[campo]} de ${aluno.nome}`}
                                            disabled={salvandoEste || temErro}
                                            className="absolute right-1 h-6 w-6 size-auto text-green-500 hover:text-green-400 hover:bg-green-500/10 disabled:opacity-40"
                                            onClick={() =>
                                              void salvarNotaEspecifica(
                                                aluno.ra,
                                                campo
                                              )
                                            }
                                          >
                                            {salvandoEste ? (
                                              <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                              <Check className="h-4 w-4" />
                                            )}
                                          </Button>
                                        </div>
                                        {temErro && (
                                          <p className="mt-1 text-[10px] text-red-400">
                                            {errosNota[chaveErro]}
                                          </p>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                                <div className="mt-4 flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-3">
                                  <span className="text-xs text-zinc-500">
                                    Soma das atividades + prova
                                  </span>
                                  <span className="text-sm font-semibold text-white">
                                    Total N1:{" "}
                                    <span className="text-emerald-400">
                                      {formatNota(n1)}
                                    </span>
                                    <span className="text-zinc-600"> / 10.0</span>
                                  </span>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-zinc-800 flex justify-end">
              <button
                type="button"
                onClick={() => void handleSalvarLancamentos()}
                disabled={salvando || loadingAlunos || !turmaSelecionada}
                className="inline-flex items-center gap-2 rounded-lg bg-white text-black text-sm font-medium px-4 py-2.5 hover:bg-zinc-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {salvando ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {salvando ? "Salvando..." : "Salvar Lançamentos"}
              </button>
            </div>
          </div>
        </div>
      </main>

      <ModalFeedback
        aberto={modalFeedback.aberto}
        onClose={() =>
          setModalFeedback((prev) => ({ ...prev, aberto: false }))
        }
        tipo={modalFeedback.tipo}
        titulo={modalFeedback.titulo}
        mensagem={modalFeedback.mensagem}
      />
    </div>
  );
}
