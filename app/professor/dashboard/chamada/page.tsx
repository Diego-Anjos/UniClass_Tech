"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Check,
  X,
  Search,
  Calendar,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { registrarLogAuditoria } from "@/lib/logs-auditoria";
import { ModalFeedback } from "@/components/ModalFeedback";
import { Button } from "@/components/ui/button";
import { PaginationFooter } from "@/components/ui/pagination-footer";
import { useProfessorSession } from "@/lib/professor-session";

type TurmaOption = {
  id: string;
  codigo: string;
  curso: string;
  turno?: string;
  professor_id?: string | null;
};

type AlunoChamada = {
  id: string;
  nome: string;
  ra: string;
  email_institucional?: string;
  email_pessoal?: string;
  email?: string;
};

type StatusChamada = "presente" | "falta";

type RegistroHistorico = {
  aluno_ra: string;
  status: string;
  data_aula: string;
};

type AiInsightChamada = {
  tipoAlerta: string;
  mensagem: string;
};

/** Mesmos limiares da coluna "Frequência Atual" na tabela de chamada. */
function getCorFrequencia(porcentagem: number): string {
  if (porcentagem >= 25) return "#ef4444"; // text-red-500
  if (porcentagem >= 15) return "#eab308"; // text-yellow-500
  return "#22c55e"; // text-green-500
}

function getMensagemFrequencia(porcentagem: number): {
  html: string;
  texto: string;
} {
  if (porcentagem >= 25) {
    return {
      html: "⚠️ <strong>Atenção:</strong> Você atingiu ou ultrapassou o limite de faltas permitido. O risco de reprovação por ausência é alto. Procure a secretaria ou seu professor imediatamente.",
      texto:
        "Atenção: Você atingiu ou ultrapassou o limite de faltas permitido. O risco de reprovação por ausência é alto.",
    };
  }
  if (porcentagem >= 15) {
    return {
      html: "⚠️ <strong>Aviso:</strong> Sua frequência está se aproximando do limite de faltas. Evite novas ausências para não correr risco de reprovação.",
      texto:
        "Aviso: Sua frequência está se aproximando do limite de faltas. Evite novas ausências.",
    };
  }
  return {
    html: "✅ Sua frequência está dentro do limite aceitável. Continue participando das aulas!",
    texto: "Sua frequência está dentro do limite aceitável.",
  };
}

function formatarDataBR(iso: string) {
  const [yyyy, mm, dd] = iso.split("-");
  if (!yyyy || !mm || !dd) return iso;
  return `${dd}/${mm}/${yyyy}`;
}

function paraISOLocal(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const DIAS_SEMANA_LABEL = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"] as const;

const diasMapa: Record<string, number> = {
  Domingo: 0,
  Segunda: 1,
  Terça: 2,
  Quarta: 3,
  Quinta: 4,
  Sexta: 5,
  Sábado: 6,
};

/** Último dia de aula permitido até hoje (inclusive). */
function getUltimoDiaDeAula(diasPermitidos: number[]): Date {
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  for (let i = 0; i < 366; i++) {
    if (diasPermitidos.includes(cursor.getDay())) {
      return cursor;
    }
    cursor.setDate(cursor.getDate() - 1);
  }

  return new Date();
}

function dataDesabilitada(date: Date, diasPermitidos: number[]) {
  return !diasPermitidos.includes(date.getDay()) || date > new Date();
}

function cellsDoMes(ano: number, mes: number) {
  const primeiro = new Date(ano, mes, 1);
  const totalDias = new Date(ano, mes + 1, 0).getDate();
  const offset = primeiro.getDay(); // 0 = Domingo
  const cells: (Date | null)[] = [];

  for (let i = 0; i < offset; i++) cells.push(null);
  for (let dia = 1; dia <= totalDias; dia++) {
    cells.push(new Date(ano, mes, dia));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
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

function escaparHtml(texto: string) {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function emailDoAluno(aluno: AlunoChamada) {
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

export default function ProfessorChamadaPage() {
  const { professorLogado, carregandoSessao } = useProfessorSession();
  const [turmas, setTurmas] = useState<TurmaOption[]>([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState("");
  const [dataChamada, setDataChamada] = useState(() =>
    paraISOLocal(getUltimoDiaDeAula([1, 2, 3, 4, 5]))
  );
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [mesCalendario, setMesCalendario] = useState(() => {
    const inicial = getUltimoDiaDeAula([1, 2, 3, 4, 5]);
    return new Date(inicial.getFullYear(), inicial.getMonth(), 1);
  });
  const [chamadaStatus, setChamadaStatus] = useState<
    Record<string, StatusChamada>
  >({});
  const [alunosTurma, setAlunosTurma] = useState<AlunoChamada[]>([]);
  const [historicoTurma, setHistoricoTurma] = useState<RegistroHistorico[]>([]);
  const [termoBusca, setTermoBusca] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [aiInsight, setAiInsight] = useState<AiInsightChamada | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [salvandoChamada, setSalvandoChamada] = useState(false);
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
  const alunosRasKey = alunosTurma.map((a) => a.ra).join("|");
  // Contagem alinhada à lista atual da turma (evita chaves stale em chamadaStatus)
  const presentes = alunosTurma.filter(
    (aluno) => (chamadaStatus[aluno.ra] ?? "presente") === "presente"
  ).length;
  const faltas = alunosTurma.filter(
    (aluno) => (chamadaStatus[aluno.ra] ?? "presente") === "falta"
  ).length;

  const engajamentoAlto =
    aiInsight?.tipoAlerta?.toUpperCase().includes("ENGAJAMENTO") ?? false;

  const diasMapeados = (professorLogado?.dias_aula ?? [])
    .map((dia: string) => diasMapa[dia])
    .filter((n): n is number => typeof n === "number");
  const diasPermitidos =
    diasMapeados.length > 0 ? diasMapeados : [1, 2, 3, 4, 5];

  // Quando a sessão carrega, posiciona no último dia de aula válido
  useEffect(() => {
    if (!professorLogado) return;
    const ultimo = getUltimoDiaDeAula(diasPermitidos);
    setDataChamada(paraISOLocal(ultimo));
    setMesCalendario(new Date(ultimo.getFullYear(), ultimo.getMonth(), 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [professorLogado?.id, JSON.stringify(professorLogado?.dias_aula ?? [])]);

  const celulasCalendario = useMemo(
    () =>
      cellsDoMes(mesCalendario.getFullYear(), mesCalendario.getMonth()),
    [mesCalendario]
  );

  const labelMesCalendario = useMemo(
    () =>
      mesCalendario.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      }),
    [mesCalendario]
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

  function setStatusAluno(ra: string, status: StatusChamada) {
    setChamadaStatus((prev) => ({ ...prev, [ra]: status }));
  }

  function selecionarDataCalendario(dia: Date) {
    if (dataDesabilitada(dia, diasPermitidos)) return;
    setDataChamada(paraISOLocal(dia));
    setMostrarCalendario(false);
  }

  function navegarMes(delta: number) {
    setMesCalendario(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1)
    );
  }

  async function carregarHistoricoTurma(turmaId: string) {
    const { data, error } = await supabase
      .from("registro_chamada")
      .select("aluno_ra, status, data_aula")
      .eq("turma_curso", turmaId);

    if (error) {
      console.error("Erro ao buscar histórico de chamadas:", error.message);
      setHistoricoTurma([]);
      return;
    }

    setHistoricoTurma(
      (data ?? []).map((row) => ({
        aluno_ra: String(row.aluno_ra ?? ""),
        status: String(row.status ?? ""),
        data_aula: String(row.data_aula ?? ""),
      }))
    );
  }

  function calcularFrequencia(ra: string): number {
    const totalAulas = new Set(
      historicoTurma.map((c) => c.data_aula).filter(Boolean)
    ).size;
    const faltasAluno = historicoTurma.filter(
      (c) =>
        c.aluno_ra === ra && c.status.toLowerCase() === "falta"
    ).length;
    return totalAulas > 0
      ? Math.round((faltasAluno / totalAulas) * 100)
      : 0;
  }

  async function notificarFrequencia(aluno: AlunoChamada) {
    let destinatario = emailDoAluno(aluno);

    if (!destinatario && aluno.ra) {
      const { data, error } = await supabase
        .from("alunos")
        .select("email_institucional, email_pessoal")
        .eq("ra", aluno.ra)
        .maybeSingle();

      if (error) {
        console.error("Erro ao buscar e-mail do aluno:", error.message);
        toast.error("Não foi possível buscar o e-mail do aluno.");
        return;
      }

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

    const turma = turmas.find((t) => t.id === turmaSelecionada);
    const nomeTurma = turma ? labelTurma(turma) : "Turma não informada";
    const porcentagemFaltas = calcularFrequencia(aluno.ra);
    const nomeSeguro = escaparHtml(aluno.nome || "aluno(a)");
    const turmaSegura = escaparHtml(nomeTurma);
    const dataEnvio = new Date().toLocaleDateString("pt-BR");
    const corFrequencia = getCorFrequencia(porcentagemFaltas);
    const mensagemFrequencia = getMensagemFrequencia(porcentagemFaltas);

    const html = `
<div style="background-color: #000000; padding: 40px 20px; font-family: sans-serif; color: #ffffff;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #141414; border: 1px solid #333; border-radius: 8px; padding: 30px;">
    <h2 style="margin-top: 0; font-size: 24px; font-weight: bold;">UniClassTech</h2>
    <h3 style="font-size: 18px; font-weight: 600; margin-top: 20px;">Olá, ${nomeSeguro}! Aqui está o seu extrato de frequência.</h3>
    <p style="font-size: 15px; color: #cccccc;">Turma: <strong>${turmaSegura}</strong></p>
    
    <div style="background-color: #1e1e1e; padding: 20px; border-radius: 6px; margin-top: 20px;">
      <p style="margin: 5px 0; color: #ccc;">Frequência Atual (Faltas): <span style="color: ${corFrequencia}; font-weight: bold;">${porcentagemFaltas}%</span></p>
      <hr style="border: 0; border-top: 1px solid #333; margin: 15px 0;" />
      <p style="margin: 5px 0; color: #ccc; font-size: 14px; line-height: 1.5;">
        ${mensagemFrequencia.html}
      </p>
    </div>
    
    <p style="font-size: 13px; color: #888; margin-top: 25px;">
      Este é um alerta automático enviado pelo seu professor via UniClassTech em ${dataEnvio}.
    </p>
  </div>
</div>
    `.trim();

    const promise = fetch("/api/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: destinatario,
        subject: "Extrato de Frequência - UniClassTech",
        html,
        text:
          `Olá, ${aluno.nome}!\n\n` +
          `Turma: ${nomeTurma}\n` +
          `Frequência Atual (Faltas): ${porcentagemFaltas}%\n` +
          mensagemFrequencia.texto,
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
      loading: "Disparando e-mail...",
      success: "Alerta enviado!",
      error: (err: unknown) =>
        err instanceof Error ? err.message : "Erro ao enviar",
    });

    try {
      await promise;
    } catch {
      // feedback já tratado pelo toast.promise
    }
  }

  async function salvarChamada() {
    if (!turmaSelecionada) {
      mostrarFeedback(
        "atencao",
        "Turma obrigatória",
        "Selecione uma turma antes de salvar a chamada."
      );
      return;
    }

    if (alunosTurma.length === 0) {
      mostrarFeedback(
        "atencao",
        "Sem alunos",
        "Nenhum aluno nesta turma para registrar chamada."
      );
      return;
    }

    setSalvandoChamada(true);
    try {
      const registros = alunosTurma.map((aluno) => ({
        turma_curso: turmaSelecionada,
        data_aula: dataChamada,
        aluno_ra: aluno.ra,
        status: chamadaStatus[aluno.ra] ?? "presente",
      }));

      const { error } = await supabase
        .from("registro_chamada")
        .upsert(registros, {
          onConflict: "turma_curso,data_aula,aluno_ra",
        });

      if (error) {
        console.error("Erro ao salvar chamada:", error.message);
        mostrarFeedback(
          "erro",
          "Falha ao salvar",
          "Não foi possível salvar a chamada. Tente novamente."
        );
        return;
      }

      const turmaLog = turmas.find((t) => t.id === turmaSelecionada);
      const nomeTurmaLog = turmaLog
        ? labelTurma(turmaLog)
        : turmaSelecionada;

      await registrarLogAuditoria({
        usuario:
          professorLogado?.nomeCompletoTitulo ||
          professorLogado?.nome ||
          "Professor",
        acao: `Registro de chamada para a turma ${nomeTurmaLog}`,
        tipo_acao: "REGISTRO_CHAMADA",
      });

      await carregarHistoricoTurma(turmaSelecionada);

      mostrarFeedback(
        "sucesso",
        "Chamada Registrada",
        `Chamada do dia ${formatarDataBR(dataChamada)} salva com sucesso!`
      );
    } catch (err) {
      console.error("Erro ao salvar chamada:", err);
      mostrarFeedback(
        "erro",
        "Falha ao salvar",
        "Não foi possível salvar a chamada. Tente novamente."
      );
    } finally {
      setSalvandoChamada(false);
    }
  }

  useEffect(() => {
    if (!professorLogado?.id) return;

    let cancelado = false;
    const professorId = professorLogado.id;

    async function fetchTurmas() {
      const selectCols = "id, codigo, curso, turno, professor_id";

      const { data, error } = await supabase
        .from("turmas")
        .select(selectCols)
        .eq("professor_id", professorId);

      if (cancelado) return;

      if (error) {
        console.error("Erro ao buscar turmas:", error.message);
        setTurmas([]);
        setTurmaSelecionada("");
        return;
      }

      const lista = ((data ?? []) as Record<string, unknown>[]).map(
        (turma) => ({
          id: String(turma.id),
          codigo: String(turma.codigo ?? ""),
          curso: String(turma.curso ?? ""),
          turno: turma.turno ? String(turma.turno) : undefined,
          professor_id: turma.professor_id
            ? String(turma.professor_id)
            : null,
        })
      );

      setTurmas(lista);

      // Auto-select se só houver uma turma; senão preserva seleção válida
      if (lista.length === 1) {
        setTurmaSelecionada(lista[0].id);
      } else {
        setTurmaSelecionada((prev) =>
          prev && lista.some((t) => t.id === prev) ? prev : ""
        );
      }
    }

    void fetchTurmas();

    return () => {
      cancelado = true;
    };
  }, [professorLogado?.id]);

  useEffect(() => {
    let cancelado = false;

    // Feedback visual imediato ao trocar a turma
    setAlunosTurma([]);
    setHistoricoTurma([]);
    setChamadaStatus({});

    async function buscarAlunosDaTurma(turmaId: string) {
      const turma = turmas.find((t) => t.id === turmaId);
      if (!turma || !professorLogado?.id) {
        if (!cancelado) {
          setAlunosTurma([]);
          setHistoricoTurma([]);
        }
        return;
      }

      const codigoTurma = turma.codigo.trim();
      const selectCols =
        "id, nome, ra, professor, curso, email_institucional, email_pessoal";

      // Somente alunos matriculados na turma (sem fallback por curso)
      const { data, error } = await supabase
        .from("alunos")
        .select(selectCols)
        .eq("turma", codigoTurma)
        .order("nome", { ascending: true });

      if (cancelado) return;

      // Histórico completo de chamadas da turma (frequência real)
      await carregarHistoricoTurma(turmaId);

      if (cancelado) return;

      if (error) {
        console.error("Erro ao buscar alunos:", error.message);
        setAlunosTurma([]);
        return;
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
          email_institucional: aluno.email_institucional
            ? String(aluno.email_institucional).trim()
            : undefined,
          email_pessoal: aluno.email_pessoal
            ? String(aluno.email_pessoal).trim()
            : undefined,
        };
      });

      setAlunosTurma(mapeados);
    }

    if (turmaSelecionada) {
      void buscarAlunosDaTurma(turmaSelecionada);
    }

    return () => {
      cancelado = true;
    };
  }, [turmaSelecionada, professorLogado?.id, turmas]);

  // Carrega status da chamada para a turma + data selecionadas
  useEffect(() => {
    if (!turmaSelecionada || alunosTurma.length === 0) {
      setChamadaStatus({});
      return;
    }

    let cancelado = false;

    async function carregarChamadaDoDia() {
      const { data: registros, error } = await supabase
        .from("registro_chamada")
        .select("aluno_ra, status, data_aula")
        .eq("turma_curso", turmaSelecionada)
        .eq("data_aula", dataChamada);

      if (cancelado) return;

      if (error) {
        console.error("Erro ao buscar chamada do dia:", error.message);
      }

      const statusInicial: Record<string, StatusChamada> = {};
      for (const aluno of alunosTurma) {
        statusInicial[aluno.ra] = "presente";
      }

      if (registros && registros.length > 0) {
        for (const registro of registros) {
          const ra = String(registro.aluno_ra ?? "");
          if (!ra) continue;
          const status = String(registro.status ?? "").toLowerCase();
          statusInicial[ra] = status === "falta" ? "falta" : "presente";
        }
      }

      setChamadaStatus(statusInicial);
    }

    void carregarChamadaDoDia();

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turmaSelecionada, dataChamada, alunosRasKey]);

  useEffect(() => {
    setPaginaAtual(1);
  }, [turmaSelecionada, termoBusca, dataChamada]);

  useEffect(() => {
    if (paginaAtual > totalPaginas) {
      setPaginaAtual(totalPaginas);
    }
  }, [paginaAtual, totalPaginas]);

  async function gerarInsightIA(dados: {
    turma: string;
    totalAlunos: number;
    presentes: number;
    faltas: number;
    disciplina?: string;
    turno?: string;
    alunosDestaque?: {
      nome: string;
      percFaltas: number;
      totalAulas: number;
    }[];
  }) {
    const response = await fetch("/api/insights/chamada", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        turma: dados.turma,
        presentes: dados.presentes,
        faltas: dados.faltas,
        total: dados.totalAlunos,
        professorId: professorLogado?.id,
        professorNome:
          professorLogado?.nomeCompletoTitulo || professorLogado?.nome,
        disciplina: dados.disciplina || professorLogado?.disciplina,
        turno: dados.turno || professorLogado?.turno_aula,
        alunosDestaque: dados.alunosDestaque ?? [],
      }),
    });

    const data = await response.json();
    return {
      tipoAlerta: (data.tipoAlerta as string) || "ALERTA DE FREQUÊNCIA",
      mensagem:
        (data.mensagem as string) ||
        "Presença registrada. Acompanhe os alunos recorrentemente ausentes para evitar evasão.",
    } satisfies AiInsightChamada;
  }

  // Análise de IA com debounce (1.5s) — deps primitivas para evitar tempestade de requests
  useEffect(() => {
    const statusSincronizado =
      totalAlunos > 0 &&
      Object.keys(chamadaStatus).length >= totalAlunos;

    if (!turmaSelecionada || !statusSincronizado) {
      setAiInsight(null);
      setIsLoadingAi(false);
      return;
    }

    const turma = turmas.find((t) => t.id === turmaSelecionada);
    const nomeTurma = turma ? labelTurma(turma) : turmaSelecionada;
    const totalAulasHistorico = new Set(
      historicoTurma.map((c) => c.data_aula).filter(Boolean)
    ).size;
    const alunosDestaque = alunosTurma
      .map((aluno) => {
        const percFaltas = calcularFrequencia(aluno.ra);
        return {
          nome: aluno.nome,
          percFaltas,
          totalAulas: totalAulasHistorico,
        };
      })
      .filter((a) => a.percFaltas >= 15)
      .sort((a, b) => b.percFaltas - a.percFaltas)
      .slice(0, 5);

    const payload = {
      turma: nomeTurma,
      totalAlunos,
      presentes,
      faltas,
      disciplina: turma?.curso || professorLogado?.disciplina,
      turno: turma?.turno || professorLogado?.turno_aula,
      alunosDestaque,
    };

    const timeoutId = window.setTimeout(async () => {
      setIsLoadingAi(true);
      try {
        const insight = await gerarInsightIA(payload);
        setAiInsight(insight);
      } catch (err) {
        console.error("Erro ao gerar insight da chamada:", err);
        setAiInsight({
          tipoAlerta: "ALERTA DE FREQUÊNCIA",
          mensagem:
            "Presença registrada. Acompanhe os alunos recorrentemente ausentes para evitar evasão.",
        });
      } finally {
        setIsLoadingAi(false);
      }
    }, 1500);

    return () => {
      window.clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turmaSelecionada, totalAlunos, presentes, faltas]);

  if (carregandoSessao || !professorLogado) {
    return (
      <div className="p-8 text-center text-zinc-400 text-sm">
        Carregando sessão...
      </div>
    );
  }

  return (
    <>
      <div className="max-w-6xl mx-auto px-4 py-6 sm:p-8">

          {/* Header de Contexto */}
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                Chamada Rápida
              </h1>
              <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <span className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded shrink-0">
                  Turno: {professorLogado.turno_aula || "—"}
                </span>
                <div className="relative inline-block">
                  <select
                    value={turmaSelecionada}
                    onChange={(e) => {
                      const value = e.target.value;
                      setTurmaSelecionada(value);
                      setAlunosTurma([]);
                      setHistoricoTurma([]);
                      setChamadaStatus({});
                      setTermoBusca("");
                      setPaginaAtual(1);
                    }}
                    className="appearance-none bg-zinc-950 border border-zinc-700 text-sm text-white font-medium rounded-lg pl-4 pr-10 py-2.5 focus:outline-none focus:ring-1 focus:ring-zinc-500 cursor-pointer hover:border-zinc-600 transition-colors w-full sm:w-auto sm:min-w-[260px]"
                  >
                    {turmas.length === 0 ? (
                      <option value="">Nenhuma turma da sua área</option>
                    ) : (
                      <>
                        {turmas.length > 1 && (
                          <option value="">Selecione uma turma</option>
                        )}
                        {turmas.map((turma) => (
                          <option key={turma.id} value={turma.id}>
                            {labelTurma(turma)}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                </div>
                <div className="relative inline-block">
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarCalendario((prev) => {
                        const abrir = !prev;
                        if (abrir) {
                          const [yyyy, mm] = dataChamada.split("-").map(Number);
                          if (yyyy && mm) {
                            setMesCalendario(new Date(yyyy, mm - 1, 1));
                          }
                        }
                        return abrir;
                      });
                    }}
                    className="inline-flex items-center gap-2 bg-[#0f1117] border border-gray-800 text-gray-300 rounded-lg px-4 py-2.5 text-sm hover:border-purple-500 focus:outline-none focus:border-purple-500 transition-colors min-w-[160px]"
                  >
                    <Calendar className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span>{formatarDataBR(dataChamada)}</span>
                  </button>

                  {mostrarCalendario && (
                    <div className="absolute z-50 bg-[#0f1117] border border-gray-800 rounded-lg p-4 shadow-xl mt-2 w-[300px]">
                      <div className="flex items-center justify-between mb-3">
                        <button
                          type="button"
                          onClick={() => navegarMes(-1)}
                          className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                          aria-label="Mês anterior"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <p className="text-sm font-medium text-white capitalize">
                          {labelMesCalendario}
                        </p>
                        <button
                          type="button"
                          onClick={() => navegarMes(1)}
                          className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                          aria-label="Próximo mês"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {DIAS_SEMANA_LABEL.map((label) => (
                          <div
                            key={label}
                            className="text-[10px] font-medium text-zinc-500 text-center py-1"
                          >
                            {label}
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-7 gap-1">
                        {celulasCalendario.map((dia, idx) => {
                          if (!dia) {
                            return <div key={`empty-${idx}`} className="h-9" />;
                          }

                          const desabilitado = dataDesabilitada(
                            dia,
                            diasPermitidos
                          );
                          const iso = paraISOLocal(dia);
                          const selecionado = iso === dataChamada;

                          return (
                            <button
                              key={iso}
                              type="button"
                              disabled={desabilitado}
                              onClick={() => selecionarDataCalendario(dia)}
                              className={`h-9 rounded-md text-sm transition-colors ${
                                desabilitado
                                  ? "opacity-30 cursor-not-allowed text-gray-500 bg-transparent"
                                  : selecionado
                                    ? "bg-purple-600 text-white cursor-pointer"
                                    : "hover:bg-purple-600 text-white cursor-pointer"
                              }`}
                            >
                              {dia.getDate()}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void salvarChamada()}
              disabled={salvandoChamada}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-black hover:bg-zinc-200 transition-colors shrink-0 self-start lg:self-auto disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {salvandoChamada ? "Salvando..." : "Salvar Chamada"}
            </button>
          </div>

          {/* AI Insight Card */}
          <div
            className={`mb-4 rounded-xl bg-zinc-950 p-5 flex gap-4 border ${
              engajamentoAlto
                ? "border-emerald-900/50"
                : "border-orange-900/50"
            }`}
          >
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                engajamentoAlto
                  ? "bg-emerald-950/60 border-emerald-900/50"
                  : "bg-orange-950/60 border-orange-900/50"
              }`}
            >
              {engajamentoAlto ? (
                <Check className="w-4 h-4 text-emerald-300" />
              ) : (
                <Sparkles className="w-4 h-4 text-orange-300" />
              )}
            </div>
            <div className="min-w-0">
              <p
                className={`text-xs font-medium uppercase tracking-widest mb-1.5 ${
                  engajamentoAlto
                    ? "text-emerald-300/80"
                    : "text-orange-300/80"
                }`}
              >
                {aiInsight?.tipoAlerta || "Alerta de Frequência"}
              </p>
              <p
                className={`text-sm text-zinc-300 leading-relaxed ${
                  isLoadingAi ? "animate-pulse text-zinc-400" : ""
                }`}
              >
                {isLoadingAi
                  ? "Analisando frequência da turma..."
                  : aiInsight?.mensagem ||
                    "Selecione uma turma para gerar o alerta."}
              </p>
            </div>
          </div>

          {/* Barra de Resumo */}
          <div className="mb-8 px-4 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 tracking-wide">
            Total de Alunos:{" "}
            <span className="text-white font-medium">{totalAlunos}</span>
            <span className="mx-2 text-zinc-700">|</span>
            Presentes:{" "}
            <span className="text-emerald-500 font-medium">{presentes}</span>
            <span className="mx-2 text-zinc-700">|</span>
            Faltas:{" "}
            <span className="text-red-500 font-medium">{faltas}</span>
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
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left min-w-[720px]">
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
                        {!turmaSelecionada
                          ? "Selecione uma turma para carregar os alunos"
                          : alunosTurma.length === 0
                            ? "Nenhum aluno nesta turma"
                            : "Nenhum aluno encontrado para a busca"}
                      </td>
                    </tr>
                  ) : (
                    alunosExibidos.map((aluno) => {
                      const percFaltas = calcularFrequencia(aluno.ra);
                      const alertaCritico = percFaltas >= 25;
                      const status = chamadaStatus[aluno.ra] ?? "presente";
                      const estaPresente = status === "presente";
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
                                  {alertaCritico && (
                                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
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
                              className={`text-sm font-medium ${
                                percFaltas >= 25
                                  ? "text-red-500"
                                  : percFaltas >= 15
                                    ? "text-yellow-500"
                                    : "text-green-500"
                              }`}
                            >
                              {percFaltas}% de faltas
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2 items-center justify-end">
                              <div className="inline-flex rounded-lg overflow-hidden border border-zinc-800">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setStatusAluno(aluno.ra, "presente")
                                  }
                                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                                    estaPresente
                                      ? "bg-green-900/40 text-green-500"
                                      : "bg-zinc-950 text-zinc-500 hover:text-zinc-300"
                                  }`}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Presente
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setStatusAluno(aluno.ra, "falta")
                                  }
                                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-l border-zinc-800 transition-colors ${
                                    !estaPresente
                                      ? "bg-red-900/40 text-red-500"
                                      : "bg-zinc-950 text-zinc-500 hover:text-zinc-300"
                                  }`}
                                >
                                  <X className="w-3.5 h-3.5" />
                                  Falta
                                </button>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                title="Enviar relatório de presença"
                                aria-label={`Enviar relatório de presença para ${aluno.nome}`}
                                className="h-8 w-8 size-auto"
                                onClick={() => void notificarFrequencia(aluno)}
                              >
                                <Mail className="h-4 w-4 text-gray-400 hover:text-white" />
                              </Button>
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

      <ModalFeedback
        aberto={modalFeedback.aberto}
        onClose={fecharFeedback}
        tipo={modalFeedback.tipo}
        titulo={modalFeedback.titulo}
        mensagem={modalFeedback.mensagem}
      />
    </>
  );
}
