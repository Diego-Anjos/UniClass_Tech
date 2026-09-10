"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  BookOpen,
  UserCheck,
  Sparkles,
  MessageSquare,
  LogOut,
  GraduationCap,
  ChevronDown,
  Search,
  AlertTriangle,
  Check,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ProfessorSettingsControl } from "@/components/professor/config-modal";
import { ModalFeedback } from "@/components/ModalFeedback";
import { PaginationFooter } from "@/components/ui/pagination-footer";
import {
  iniciaisDoProfessor,
  limparSessaoProfessor,
  useProfessorSession,
} from "@/lib/professor-session";

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral",    href: "/professor/dashboard",       active: false },
  { icon: BookOpen,        label: "Turmas e Notas", href: "/professor/dashboard/notas", active: true  },
  { icon: UserCheck,       label: "Chamada Rápida", href: "/professor/dashboard/chamada", active: false },
  { icon: Sparkles,        label: "Insights IA",    href: "/professor/dashboard/insights", active: false },
  { icon: MessageSquare,   label: "Mensagens",      href: "/professor/dashboard/mensagens", active: false },
];

type AlunoLinha = {
  id: string;
  nome: string;
  ra: string;
};

type Criterios = {
  ativ1: number;
  ativ2: number;
  ativ3: number;
  ativ4: number;
  prova: number;
};

type DatasAvaliacoes = {
  ativ1: string;
  ativ2: string;
  ativ3: string;
  ativ4: string;
  prova: string;
};

type TurmaOption = {
  id: string;
  codigo: string;
  curso: string;
  turno?: string;
  status?: string;
  criterios_notas?: Criterios | null;
  datas_avaliacoes?: DatasAvaliacoes | null;
};

type NotasParciais = {
  a1: string;
  a2: string;
  a3: string;
  a4: string;
  prova: string;
};

type CampoNota = keyof NotasParciais;

type StatusSalvamentoCampo = "salvando" | "sucesso" | "erro";

type StatusNota = "Aprovado" | "Exame Final" | "Reprovado" | "Pendente";

const CRITERIO_PARA_CAMPO: Record<keyof Criterios, CampoNota> = {
  ativ1: "a1",
  ativ2: "a2",
  ativ3: "a3",
  ativ4: "a4",
  prova: "prova",
};

const CRITERIOS_PADRAO: Criterios = {
  ativ1: 1,
  ativ2: 1,
  ativ3: 1,
  ativ4: 1,
  prova: 6,
};

const DATAS_AVALIACOES_PADRAO: DatasAvaliacoes = {
  ativ1: "",
  ativ2: "",
  ativ3: "",
  ativ4: "",
  prova: "",
};

const hoje = new Date();
const anoAtual = hoje.getFullYear();
const isPrimeiroSemestre = hoje.getMonth() < 6;
const minDate = isPrimeiroSemestre
  ? `${anoAtual}-01-01`
  : `${anoAtual}-07-01`;
const maxDate = isPrimeiroSemestre
  ? `${anoAtual}-06-30`
  : `${anoAtual}-12-31`;

const NOTAS_VAZIAS: NotasParciais = {
  a1: "",
  a2: "",
  a3: "",
  a4: "",
  prova: "",
};

const CAMPOS_NOTA: {
  key: CampoNota;
  criterioKey: keyof Criterios;
  label: string;
}[] = [
  { key: "a1", criterioKey: "ativ1", label: "Ativ. 1" },
  { key: "a2", criterioKey: "ativ2", label: "Ativ. 2" },
  { key: "a3", criterioKey: "ativ3", label: "Ativ. 3" },
  { key: "a4", criterioKey: "ativ4", label: "Ativ. 4" },
  { key: "prova", criterioKey: "prova", label: "Prova" },
];

const statusStyles: Record<StatusNota, string> = {
  Aprovado: "bg-emerald-900 text-emerald-300",
  "Exame Final": "bg-yellow-900 text-yellow-300",
  Reprovado: "bg-red-900 text-red-300",
  Pendente: "bg-zinc-800 text-zinc-400",
};

function iniciaisDoNome(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .join("");
}

function labelTurma(turma: TurmaOption) {
  return `${turma.curso} - Turma ${turma.codigo} (${turma.turno})`;
}

function parseNota(valor: string): number | null {
  if (valor.trim() === "") return null;
  const num = Number(valor.replace(",", "."));
  if (Number.isNaN(num)) return null;
  return num;
}

function somaCriterios(criterios: Criterios): number {
  return (
    Number(criterios.ativ1) +
    Number(criterios.ativ2) +
    Number(criterios.ativ3) +
    Number(criterios.ativ4) +
    Number(criterios.prova)
  );
}

function calcularMediaEStatus(notas: NotasParciais): {
  media: number | null;
  status: StatusNota;
} {
  const valores = [
    parseNota(notas.a1),
    parseNota(notas.a2),
    parseNota(notas.a3),
    parseNota(notas.a4),
    parseNota(notas.prova),
  ];

  const preenchidas = valores.filter((v) => v !== null);
  if (preenchidas.length === 0) {
    return { media: null, status: "Pendente" };
  }

  const media = Number(
    valores.reduce<number>((acc, v) => acc + (v ?? 0), 0).toFixed(1)
  );

  if (media >= 7.0) return { media, status: "Aprovado" };
  if (media >= 4.0) return { media, status: "Exame Final" };
  return { media, status: "Reprovado" };
}

function notaToInput(valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "";
  const num = Number(valor);
  if (!Number.isNaN(num)) return String(num);
  return String(valor);
}

function notasCompletas(notas: NotasParciais): boolean {
  return CAMPOS_NOTA.every(({ key }) => notas[key].trim() !== "");
}

function normalizarCriterios(raw: unknown): Criterios {
  if (!raw || typeof raw !== "object") {
    return { ...CRITERIOS_PADRAO };
  }

  const c = raw as Partial<Record<keyof Criterios, unknown>>;
  const ativ1 = Number(c.ativ1);
  const ativ2 = Number(c.ativ2);
  const ativ3 = Number(c.ativ3);
  const ativ4 = Number(c.ativ4);
  const prova = Number(c.prova);

  const temAlgumValor = [ativ1, ativ2, ativ3, ativ4, prova].some(
    (v) => !Number.isNaN(v)
  );

  if (!temAlgumValor) {
    return { ...CRITERIOS_PADRAO };
  }

  return {
    ativ1: Number.isNaN(ativ1) ? CRITERIOS_PADRAO.ativ1 : ativ1,
    ativ2: Number.isNaN(ativ2) ? CRITERIOS_PADRAO.ativ2 : ativ2,
    ativ3: Number.isNaN(ativ3) ? CRITERIOS_PADRAO.ativ3 : ativ3,
    ativ4: Number.isNaN(ativ4) ? CRITERIOS_PADRAO.ativ4 : ativ4,
    prova: Number.isNaN(prova) ? CRITERIOS_PADRAO.prova : prova,
  };
}

function normalizarDatasAvaliacoes(raw: unknown): DatasAvaliacoes {
  if (!raw || typeof raw !== "object") {
    return { ...DATAS_AVALIACOES_PADRAO };
  }

  const d = raw as Partial<Record<keyof DatasAvaliacoes, unknown>>;
  return {
    ativ1: typeof d.ativ1 === "string" ? d.ativ1 : "",
    ativ2: typeof d.ativ2 === "string" ? d.ativ2 : "",
    ativ3: typeof d.ativ3 === "string" ? d.ativ3 : "",
    ativ4: typeof d.ativ4 === "string" ? d.ativ4 : "",
    prova: typeof d.prova === "string" ? d.prova : "",
  };
}

function formatarData(iso: string): string {
  const [, mes, dia] = iso.split("-");
  if (!mes || !dia) return iso;
  return `${dia}/${mes}`;
}

function limitarNotaAoMaximo(valor: string, maximo: number): string {
  if (valor.trim() === "") return "";
  const num = parseNota(valor);
  if (num === null) return "";
  if (num > maximo) return String(maximo);
  if (num < 0) return "0";
  return valor;
}

export default function ProfessorNotasPage() {
  const { professorLogado, carregandoSessao } = useProfessorSession();
  const [turmas, setTurmas] = useState<TurmaOption[]>([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState("");
  const [alunosTurma, setAlunosTurma] = useState<AlunoLinha[]>([]);
  const [criterios, setCriterios] = useState<Criterios>(CRITERIOS_PADRAO);
  const [datasAvaliacoes, setDatasAvaliacoes] = useState<DatasAvaliacoes>(
    DATAS_AVALIACOES_PADRAO
  );
  const [notasAlunos, setNotasAlunos] = useState<Record<string, NotasParciais>>(
    {}
  );
  const [termoBusca, setTermoBusca] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [aiInsight, setAiInsight] = useState("");
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [statusSalvarRegras, setStatusSalvarRegras] = useState<
    "idle" | "salvando" | "salvo"
  >("idle");
  const [statusSalvamento, setStatusSalvamento] = useState<
    Record<string, StatusSalvamentoCampo>
  >({});
  const timeoutsSalvamento = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {}
  );
  const timeoutSalvarRegras = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [modalFeedback, setModalFeedback] = useState<{
    aberto: boolean;
    tipo: "sucesso" | "erro" | "atencao";
    titulo: string;
    mensagem: string;
  }>({ aberto: false, tipo: "sucesso", titulo: "", mensagem: "" });

  const totalCriterios = useMemo(
    () => Number(somaCriterios(criterios).toFixed(1)),
    [criterios]
  );
  const criteriosValidos = Math.abs(totalCriterios - 10) < 0.001;

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

  async function fetchAiTurmaInsight(turmaId: string) {
    setIsLoadingAi(true);
    try {
      const turma = turmas.find((t) => t.id === turmaId);
      const context = turma
        ? `Turma ${labelTurma(turma)}`
        : `Turma ${turmaId}`;

      const response = await fetch("/api/insights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          context,
          turmasAtivas: 1,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha na requisição da IA");
      setAiInsight((data.insight as string) ?? "");
    } catch (err) {
      console.error("Erro ao gerar insight da turma:", err);
      setAiInsight(
        "Não foi possível gerar a análise da turma no momento. Tente novamente."
      );
    } finally {
      setIsLoadingAi(false);
    }
  }

  function handleCriterioChange(campo: keyof Criterios, valor: string) {
    const num = valor === "" ? 0 : Number(valor.replace(",", "."));
    if (Number.isNaN(num) || num < 0) return;

    const proximos = { ...criterios, [campo]: num };
    setCriterios(proximos);

    // Cascata: limita notas já digitadas ao novo máximo da coluna
    const maxPorCampo: Record<CampoNota, number> = {
      a1: proximos.ativ1,
      a2: proximos.ativ2,
      a3: proximos.ativ3,
      a4: proximos.ativ4,
      prova: proximos.prova,
    };

    setNotasAlunos((prev) => {
      let mudou = false;
      const next: Record<string, NotasParciais> = {};
      for (const [ra, notas] of Object.entries(prev)) {
        const ajustadas: NotasParciais = {
          a1: limitarNotaAoMaximo(notas.a1, maxPorCampo.a1),
          a2: limitarNotaAoMaximo(notas.a2, maxPorCampo.a2),
          a3: limitarNotaAoMaximo(notas.a3, maxPorCampo.a3),
          a4: limitarNotaAoMaximo(notas.a4, maxPorCampo.a4),
          prova: limitarNotaAoMaximo(notas.prova, maxPorCampo.prova),
        };
        if (
          ajustadas.a1 !== notas.a1 ||
          ajustadas.a2 !== notas.a2 ||
          ajustadas.a3 !== notas.a3 ||
          ajustadas.a4 !== notas.a4 ||
          ajustadas.prova !== notas.prova
        ) {
          mudou = true;
        }
        next[ra] = ajustadas;
      }
      return mudou ? next : prev;
    });
  }

  async function salvarCriteriosTurma() {
    if (!turmaSelecionada || !criteriosValidos) return;

    if (timeoutSalvarRegras.current) {
      clearTimeout(timeoutSalvarRegras.current);
      timeoutSalvarRegras.current = null;
    }

    setStatusSalvarRegras("salvando");
    try {
      const { error } = await supabase
        .from("turmas")
        .update({
          criterios_notas: criterios,
          datas_avaliacoes: datasAvaliacoes,
        })
        .eq("id", turmaSelecionada);

      if (error) {
        throw new Error(error.message);
      }

      setTurmas((prev) =>
        prev.map((turma) =>
          turma.id === turmaSelecionada
            ? {
                ...turma,
                criterios_notas: { ...criterios },
                datas_avaliacoes: { ...datasAvaliacoes },
              }
            : turma
        )
      );

      setStatusSalvarRegras("salvo");
      timeoutSalvarRegras.current = setTimeout(() => {
        setStatusSalvarRegras("idle");
        timeoutSalvarRegras.current = null;
      }, 2000);
    } catch (err) {
      console.error("Erro ao salvar critérios da turma:", err);
      setStatusSalvarRegras("idle");
      mostrarFeedback(
        "erro",
        "Falha ao salvar regras",
        "Não foi possível salvar a distribuição de pontos da turma."
      );
    }
  }

  function handleNotaChange(ra: string, campo: CampoNota, valor: string) {
    if (!criteriosValidos) return;

    const maxMap: Record<CampoNota, number> = {
      a1: criterios.ativ1,
      a2: criterios.ativ2,
      a3: criterios.ativ3,
      a4: criterios.ativ4,
      prova: criterios.prova,
    };

    let valorFinal = valor;
    if (valor.trim() !== "") {
      const num = Number(valor.replace(",", "."));
      if (Number.isNaN(num)) return;
      if (num < 0) valorFinal = "0";
      else if (num > maxMap[campo]) valorFinal = String(maxMap[campo]);
    }

    setNotasAlunos((prev) => ({
      ...prev,
      [ra]: {
        ...(prev[ra] ?? NOTAS_VAZIAS),
        [campo]: valorFinal,
      },
    }));
  }

  async function salvarNotaParcial(
    ra: string,
    campo: keyof Criterios,
    valor: string
  ) {
    if (!turmaSelecionada || !criteriosValidos) return;

    const statusKey = `${ra}-${campo}`;
    const campoNota = CRITERIO_PARA_CAMPO[campo];
    const notasAtuais: NotasParciais = {
      ...(notasAlunos[ra] ?? NOTAS_VAZIAS),
      [campoNota]: valor,
    };
    const { media, status } = calcularMediaEStatus(notasAtuais);
    const valorNumerico = parseNota(valor);

    if (timeoutsSalvamento.current[statusKey]) {
      clearTimeout(timeoutsSalvamento.current[statusKey]);
      delete timeoutsSalvamento.current[statusKey];
    }

    setStatusSalvamento((prev) => ({ ...prev, [statusKey]: "salvando" }));

    try {
      const valoresDb = {
        ativ1: parseNota(notasAtuais.a1),
        ativ2: parseNota(notasAtuais.a2),
        ativ3: parseNota(notasAtuais.a3),
        ativ4: parseNota(notasAtuais.a4),
        prova: parseNota(notasAtuais.prova),
      };

      const patch = {
        [campo]: valorNumerico,
        media_final: media,
        status,
      };

      const { data, error } = await supabase
        .from("notas")
        .update(patch)
        .eq("ra_aluno", ra)
        .eq("turma", turmaSelecionada)
        .select("id");

      if (error) {
        throw new Error(error.message);
      }

      if (!data || data.length === 0) {
        const { error: insertError } = await supabase.from("notas").insert({
          ra_aluno: ra,
          turma: turmaSelecionada,
          ...valoresDb,
          media_final: media,
          status,
        });

        if (insertError) {
          throw new Error(insertError.message);
        }
      }

      setStatusSalvamento((prev) => ({ ...prev, [statusKey]: "sucesso" }));
      timeoutsSalvamento.current[statusKey] = setTimeout(() => {
        setStatusSalvamento((prev) => {
          const next = { ...prev };
          delete next[statusKey];
          return next;
        });
        delete timeoutsSalvamento.current[statusKey];
      }, 2000);
    } catch (err) {
      console.error("Erro no auto-save da nota:", err);
      setStatusSalvamento((prev) => ({ ...prev, [statusKey]: "erro" }));
      timeoutsSalvamento.current[statusKey] = setTimeout(() => {
        setStatusSalvamento((prev) => {
          const next = { ...prev };
          delete next[statusKey];
          return next;
        });
        delete timeoutsSalvamento.current[statusKey];
      }, 2000);
    }
  }

  useEffect(() => {
    const timeouts = timeoutsSalvamento.current;
    return () => {
      Object.values(timeouts).forEach(clearTimeout);
      if (timeoutSalvarRegras.current) {
        clearTimeout(timeoutSalvarRegras.current);
      }
    };
  }, []);

  async function persistirNotas(publicado: boolean) {
    if (!turmaSelecionada) {
      mostrarFeedback(
        "atencao",
        "Turma obrigatória",
        "Selecione uma turma antes de salvar as notas."
      );
      return;
    }

    if (!criteriosValidos) {
      mostrarFeedback(
        "atencao",
        "Critérios inválidos",
        "A soma dos critérios deve ser exatamente 10 antes de salvar."
      );
      return;
    }

    if (alunosTurma.length === 0) {
      mostrarFeedback(
        "atencao",
        "Sem alunos",
        "Nenhum aluno nesta turma para lançar notas."
      );
      return;
    }

    if (publicado) {
      const incompletos = alunosTurma.some((aluno) => {
        const notas = notasAlunos[aluno.ra] ?? NOTAS_VAZIAS;
        return !notasCompletas(notas);
      });
      if (incompletos) {
        mostrarFeedback(
          "atencao",
          "Pendências encontradas",
          "Preencha todas as 5 avaliações de cada aluno antes de publicar."
        );
        return;
      }
    }

    setSalvando(true);
    try {
      for (const aluno of alunosTurma) {
        const notas = notasAlunos[aluno.ra] ?? NOTAS_VAZIAS;
        const { media, status } = calcularMediaEStatus(notas);
        const registro = {
          ra_aluno: aluno.ra,
          turma: turmaSelecionada,
          ativ1: parseNota(notas.a1),
          ativ2: parseNota(notas.a2),
          ativ3: parseNota(notas.a3),
          ativ4: parseNota(notas.a4),
          prova: parseNota(notas.prova),
          media_final: media,
          status,
        };

        const { data, error } = await supabase
          .from("notas")
          .update({
            ativ1: registro.ativ1,
            ativ2: registro.ativ2,
            ativ3: registro.ativ3,
            ativ4: registro.ativ4,
            prova: registro.prova,
            media_final: registro.media_final,
            status: registro.status,
          })
          .eq("ra_aluno", aluno.ra)
          .eq("turma", turmaSelecionada)
          .select("id");

        if (error) {
          throw new Error(error.message);
        }

        if (!data || data.length === 0) {
          const { error: insertError } = await supabase
            .from("notas")
            .insert(registro);

          if (insertError) {
            throw new Error(insertError.message);
          }
        }
      }

      mostrarFeedback(
        "sucesso",
        publicado ? "Notas publicadas" : "Rascunho salvo",
        publicado
          ? "Notas publicadas com sucesso para a turma!"
          : "Rascunho das notas salvo com sucesso!"
      );
    } catch (err) {
      console.error("Erro ao salvar notas:", err);
      mostrarFeedback(
        "erro",
        "Falha ao salvar",
        "Não foi possível salvar as notas. Tente novamente."
      );
    } finally {
      setSalvando(false);
    }
  }

  useEffect(() => {
    if (!professorLogado) return;

    async function fetchTurmas() {
      const areaAtuacao = professorLogado!.area_atuacao?.trim() ?? "";

      const { data: turmasFiltradas, error } = await supabase
        .from("turmas")
        .select("*")
        .ilike("curso", `%${areaAtuacao}%`);

      if (error) {
        console.error("Erro ao buscar turmas:", error.message);
        setTurmas([]);
        setTurmaSelecionada("");
        return;
      }

      const lista = ((turmasFiltradas ?? []) as Record<string, unknown>[]).map(
        (turma) => ({
          id: String(turma.id),
          codigo: String(turma.codigo ?? ""),
          curso: String(turma.curso ?? ""),
          turno: turma.turno ? String(turma.turno) : undefined,
          status: turma.status ? String(turma.status) : undefined,
          criterios_notas: normalizarCriterios(turma.criterios_notas),
          datas_avaliacoes: normalizarDatasAvaliacoes(turma.datas_avaliacoes),
        })
      );

      setTurmas(lista);

      // Auto-seleção apenas quando houver uma única disciplina do professor
      if (lista.length === 1) {
        setTurmaSelecionada(lista[0].id);
        setCriterios(lista[0].criterios_notas ?? { ...CRITERIOS_PADRAO });
        setDatasAvaliacoes(
          lista[0].datas_avaliacoes ?? { ...DATAS_AVALIACOES_PADRAO }
        );
      } else {
        setTurmaSelecionada("");
        setCriterios({ ...CRITERIOS_PADRAO });
        setDatasAvaliacoes({ ...DATAS_AVALIACOES_PADRAO });
      }
    }

    void fetchTurmas();
  }, [professorLogado]);

  useEffect(() => {
    if (!turmaSelecionada) {
      setCriterios({ ...CRITERIOS_PADRAO });
      setDatasAvaliacoes({ ...DATAS_AVALIACOES_PADRAO });
      return;
    }

    const turma = turmas.find((t) => t.id === turmaSelecionada);
    if (!turma) return;

    setCriterios(normalizarCriterios(turma.criterios_notas));
    setDatasAvaliacoes(normalizarDatasAvaliacoes(turma.datas_avaliacoes));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turmaSelecionada]);

  useEffect(() => {
    if (!turmaSelecionada || !professorLogado) {
      setAlunosTurma([]);
      setNotasAlunos({});
      return;
    }

    const turma = turmas.find((t) => t.id === turmaSelecionada);
    if (!turma) {
      setAlunosTurma([]);
      setNotasAlunos({});
      return;
    }

    async function fetchAlunosDaTurma() {
      const vinculoProfessor = professorLogado!.nomeCompletoTitulo;
      const cursoTurma = turma!.curso;

      let { data, error } = await supabase
        .from("alunos")
        .select("id, nome, ra, professor, curso")
        .eq("professor", vinculoProfessor)
        .ilike("curso", `%${cursoTurma}%`)
        .order("nome", { ascending: true });

      if (error || !data || data.length === 0) {
        const fallback = await supabase
          .from("alunos")
          .select("id, nome, ra, professor, curso")
          .ilike("curso", `%${cursoTurma}%`)
          .order("nome", { ascending: true });

        if (fallback.error) {
          console.error(
            "Erro ao buscar alunos:",
            error?.message || fallback.error.message
          );
          setAlunosTurma([]);
          setNotasAlunos({});
          return;
        }

        data = fallback.data;
      }

      const mapeados: AlunoLinha[] = (data ?? []).map((aluno) => ({
        id: String(aluno.id),
        nome: String(aluno.nome ?? ""),
        ra: String(
          aluno.ra ||
            (aluno as { matricula?: string }).matricula ||
            "RA-"
        ),
      }));

      setAlunosTurma(mapeados);

      const iniciaisNotas: Record<string, NotasParciais> = {};
      for (const aluno of mapeados) {
        iniciaisNotas[aluno.ra] = { ...NOTAS_VAZIAS };
      }

      const { data: notasSalvas, error: notasError } = await supabase
        .from("notas")
        .select("*")
        .eq("turma", turmaSelecionada);

      if (notasError) {
        console.error("Erro ao carregar notas salvas:", notasError.message);
      }

      if (notasSalvas && notasSalvas.length > 0) {
        for (const row of notasSalvas) {
          const ra = String(row.ra_aluno ?? "");
          if (!ra || !(ra in iniciaisNotas)) continue;

          iniciaisNotas[ra] = {
            a1: notaToInput(row.ativ1),
            a2: notaToInput(row.ativ2),
            a3: notaToInput(row.ativ3),
            a4: notaToInput(row.ativ4),
            prova: notaToInput(row.prova),
          };
        }
      }

      setNotasAlunos(iniciaisNotas);
      await fetchAiTurmaInsight(turmaSelecionada);
    }

    void fetchAlunosDaTurma();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turmaSelecionada, professorLogado]);

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

  useEffect(() => {
    setPaginaAtual(1);
  }, [turmaSelecionada, termoBusca]);

  useEffect(() => {
    if (paginaAtual > totalPaginas) {
      setPaginaAtual(totalPaginas);
    }
  }, [paginaAtual, totalPaginas]);

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

  const inputNotaClass =
    "w-16 bg-[#1a1d24] border border-gray-700 text-center rounded text-sm text-white h-8 block focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

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
          {navItems.map(({ icon: Icon, label, href, active }) =>
            href.startsWith("/professor/dashboard") ? (
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
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                Lançamento de Notas
              </h1>
              <div className="mt-3 relative inline-block">
                <select
                  value={turmaSelecionada}
                  onChange={(e) => setTurmaSelecionada(e.target.value)}
                  className="appearance-none bg-zinc-950 border border-zinc-700 text-sm text-white font-medium rounded-lg pl-4 pr-10 py-2.5 focus:outline-none focus:ring-1 focus:ring-zinc-500 cursor-pointer hover:border-zinc-600 transition-colors min-w-[280px]"
                >
                  {turmas.length === 0 ? (
                    <option value="">Nenhuma turma vinculada</option>
                  ) : (
                    <>
                      {turmas.length > 1 && (
                        <option value="">Selecione uma disciplina</option>
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
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                disabled={salvando || !criteriosValidos}
                onClick={() => void persistirNotas(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-zinc-700 text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {salvando ? "Salvando..." : "Salvar Rascunho"}
              </button>
              <button
                type="button"
                disabled={salvando || !criteriosValidos}
                onClick={() => void persistirNotas(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-black hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {salvando ? "Publicando..." : "Publicar Notas"}
              </button>
            </div>
          </div>

          <div className="mb-8 rounded-xl bg-zinc-950 border border-indigo-900/50 p-5 flex gap-4">
            <div className="w-9 h-9 rounded-lg bg-indigo-950/60 border border-indigo-900/50 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-indigo-300" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-widest text-indigo-300/80 mb-1.5">
                Análise da Turma
              </p>
              <p
                className={`text-sm text-zinc-300 leading-relaxed ${isLoadingAi ? "animate-pulse text-zinc-400" : ""}`}
              >
                {isLoadingAi
                  ? "Analisando desempenho da turma..."
                  : aiInsight}
              </p>
            </div>
          </div>

          {/* Distribuição de Pontos */}
          <div className="mb-6 rounded-xl bg-zinc-950 border border-zinc-800 p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  Distribuição de Pontos do Semestre
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Defina o valor máximo de cada avaliação (soma = 10)
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <p
                  className={`text-sm font-medium ${
                    criteriosValidos ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  Total: {totalCriterios.toFixed(1)} / 10.0
                </p>
                <button
                  type="button"
                  onClick={() => void salvarCriteriosTurma()}
                  disabled={!criteriosValidos || statusSalvarRegras === "salvando" || !turmaSelecionada}
                  className="bg-[#9333ea] hover:bg-purple-600 text-white px-3 py-1 rounded text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#9333ea]"
                >
                  {statusSalvarRegras === "salvando"
                    ? "Salvando..."
                    : statusSalvarRegras === "salvo"
                      ? "Salvo!"
                      : "Salvar Regras"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {(
                [
                  { key: "ativ1", label: "Atividade 1" },
                  { key: "ativ2", label: "Atividade 2" },
                  { key: "ativ3", label: "Atividade 3" },
                  { key: "ativ4", label: "Atividade 4" },
                  { key: "prova", label: "Prova Semestral" },
                ] as const
              ).map((item) => (
                <div key={item.key} className="flex flex-col gap-1.5">
                  <span className="text-xs text-zinc-400">{item.label}</span>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    value={criterios[item.key]}
                    onChange={(e) =>
                      handleCriterioChange(item.key, e.target.value)
                    }
                    className="w-full bg-[#1a1d24] border border-gray-700 rounded-md text-sm text-white text-center px-2 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <input
                    type="date"
                    min={minDate}
                    max={maxDate}
                    value={datasAvaliacoes[item.key]}
                    onChange={(e) =>
                      setDatasAvaliacoes((prev) => ({
                        ...prev,
                        [item.key]: e.target.value,
                      }))
                    }
                    className="w-full mt-2 bg-[#1a1d24] border border-gray-700 text-gray-400 text-xs rounded p-1.5 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                  />
                </div>
              ))}
            </div>

            {!criteriosValidos && (
              <div className="mt-4 flex items-center gap-2 text-sm text-red-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                A soma dos critérios deve ser exatamente 10
              </div>
            )}
          </div>

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
            <div
              className="overflow-x-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-[#0f1117] [&::-webkit-scrollbar-thumb]:bg-gray-700 hover:[&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full"
              style={{ scrollbarWidth: "thin", scrollbarColor: "#374151 #0f1117" }}
            >
              <table className="w-full text-left min-w-[900px]">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="px-6 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest">
                      Aluno
                    </th>
                    {CAMPOS_NOTA.map(({ key, criterioKey, label }) => (
                      <th
                        key={key}
                        className="px-3 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest text-center whitespace-nowrap"
                      >
                        <div>
                          {label} (Máx: {criterios[criterioKey]})
                        </div>
                        <div className="text-[10px] text-gray-500 font-normal mt-0.5 normal-case tracking-normal">
                          {datasAvaliacoes[criterioKey]
                            ? formatarData(datasAvaliacoes[criterioKey])
                            : "Data não definida"}
                        </div>
                      </th>
                    ))}
                    <th className="px-4 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest text-center">
                      Média Final
                    </th>
                    <th className="px-6 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest text-center">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {alunosExibidos.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-6 py-10 text-center text-sm text-zinc-500"
                      >
                        {alunosTurma.length === 0
                          ? "Nenhum aluno matriculado nesta turma"
                          : "Nenhum aluno encontrado para a busca"}
                      </td>
                    </tr>
                  ) : (
                    alunosExibidos.map((aluno) => {
                      const notas = notasAlunos[aluno.ra] ?? NOTAS_VAZIAS;
                      const { media, status } = calcularMediaEStatus(notas);

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
                                <p className="text-sm font-medium text-white truncate">
                                  {aluno.nome}
                                </p>
                                <p className="text-xs text-zinc-500">
                                  RA {aluno.ra}
                                </p>
                              </div>
                            </div>
                          </td>
                          {CAMPOS_NOTA.map(({ key, criterioKey }) => {
                            const statusKey = `${aluno.ra}-${criterioKey}`;
                            const statusCampo = statusSalvamento[statusKey];

                            return (
                              <td key={key} className="px-3 py-4 text-center">
                                <div className="relative inline-block">
                                  <input
                                    type="number"
                                    min={0}
                                    max={criterios[criterioKey]}
                                    step={0.1}
                                    value={notas[key]}
                                    disabled={!criteriosValidos}
                                    onChange={(e) =>
                                      handleNotaChange(
                                        aluno.ra,
                                        key,
                                        e.target.value
                                      )
                                    }
                                    onBlur={(e) =>
                                      void salvarNotaParcial(
                                        aluno.ra,
                                        criterioKey,
                                        e.target.value
                                      )
                                    }
                                    className={`${inputNotaClass} ${
                                      statusCampo === "sucesso"
                                        ? "border-emerald-400"
                                        : statusCampo === "erro"
                                          ? "border-red-500"
                                          : ""
                                    }`}
                                  />
                                  {statusCampo === "salvando" && (
                                    <Loader2 className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 animate-spin" />
                                  )}
                                  {statusCampo === "sucesso" && (
                                    <Check className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-emerald-400" />
                                  )}
                                </div>
                              </td>
                            );
                          })}
                          <td className="px-4 py-4 text-center">
                            <span className="text-base font-semibold tracking-tight text-white">
                              {media !== null ? media.toFixed(1) : "—"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${statusStyles[status]}`}
                            >
                              {status}
                            </span>
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
