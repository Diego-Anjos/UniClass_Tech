"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MessageSquareText,
  Send,
  Clock,
  User,
  Search,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ModalFeedback } from "@/components/ModalFeedback";

type StatusChamado = "aberto" | "respondido";
type FiltroStatus = "todos" | "aberto" | "respondido";

type Chamado = {
  id: string;
  nome_aluno: string;
  ra_aluno: string;
  assunto: string;
  mensagem: string;
  resposta: string;
  status: StatusChamado;
  data_abertura: string;
  data_resposta: string;
};

function iniciaisDe(nome: string) {
  return (
    nome
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "—"
  );
}

function formatarDataHora(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function normalizarStatus(valor: unknown): StatusChamado {
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

function mapearChamado(row: Record<string, unknown>): Chamado {
  return {
    id: String(row.id),
    nome_aluno: String(row.nome_aluno ?? "Estudante"),
    ra_aluno: String(row.ra_aluno ?? "—"),
    assunto: String(row.assunto ?? "Sem assunto"),
    mensagem: String(row.mensagem ?? ""),
    resposta: String(row.resposta ?? ""),
    status: normalizarStatus(row.status),
    data_abertura: String(row.data_abertura ?? row.created_at ?? ""),
    data_resposta: String(row.data_resposta ?? ""),
  };
}

function statusBadgeClasses(status: StatusChamado) {
  if (status === "aberto") {
    return "bg-rose-950/50 text-rose-400 border border-rose-800";
  }
  return "bg-emerald-950/50 text-emerald-400 border border-emerald-800";
}

export default function AdmChamadosPage() {
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [chamadoAtivo, setChamadoAtivo] = useState<Chamado | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todos");
  const [busca, setBusca] = useState("");
  const [textoResposta, setTextoResposta] = useState("");
  const [enviandoResposta, setEnviandoResposta] = useState(false);
  const [carregando, setCarregando] = useState(true);
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

  async function carregarChamados(manterSelecionadoId?: string | null) {
    setCarregando(true);
    try {
      const { data, error } = await supabase
        .from("chamados")
        .select("*")
        .order("data_abertura", { ascending: false });

      if (error) {
        console.error("Erro ao buscar chamados:", error.message);
        setChamados([]);
        setChamadoAtivo(null);
        return;
      }

      const lista = ((data ?? []) as Record<string, unknown>[]).map(mapearChamado);
      setChamados(lista);

      if (lista.length === 0) {
        setChamadoAtivo(null);
        return;
      }

      const aindaExiste = manterSelecionadoId
        ? lista.find((c) => c.id === manterSelecionadoId) ?? null
        : null;
      setChamadoAtivo(aindaExiste ?? lista[0]);
    } catch (err) {
      console.error("Falha ao carregar chamados:", err);
      setChamados([]);
      setChamadoAtivo(null);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void carregarChamados();
  }, []);

  const chamadosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return chamados.filter((c) => {
      const statusOk = filtroStatus === "todos" || c.status === filtroStatus;
      const buscaOk =
        !termo ||
        c.nome_aluno.toLowerCase().includes(termo) ||
        c.assunto.toLowerCase().includes(termo) ||
        c.ra_aluno.toLowerCase().includes(termo);
      return statusOk && buscaOk;
    });
  }, [chamados, filtroStatus, busca]);

  const contagens = useMemo(
    () => ({
      todos: chamados.length,
      aberto: chamados.filter((c) => c.status === "aberto").length,
      respondido: chamados.filter((c) => c.status === "respondido").length,
    }),
    [chamados]
  );

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

  function handleSelecionarChamado(chamado: Chamado) {
    setChamadoAtivo(chamado);
    setTextoResposta("");
  }

  async function handleEnviarResposta() {
    if (!chamadoAtivo) return;

    const resposta = textoResposta.trim();
    if (!resposta) {
      abrirFeedback(
        "atencao",
        "Campos incompletos",
        "Digite a resposta antes de enviar."
      );
      return;
    }

    setEnviandoResposta(true);
    try {
      const { error } = await supabase
        .from("chamados")
        .update({
          resposta,
          status: "Respondido",
          data_resposta: new Date().toISOString(),
        })
        .eq("id", chamadoAtivo.id);

      if (error) {
        throw new Error(error.message);
      }

      setTextoResposta("");
      await carregarChamados(chamadoAtivo.id);
      abrirFeedback(
        "sucesso",
        "Resposta Registrada",
        "A resposta foi enviada e o chamado foi marcado como respondido."
      );
    } catch (err) {
      console.error("Erro ao enviar resposta:", err);
      abrirFeedback(
        "erro",
        "Falha no envio",
        "Não foi possível registrar a resposta. Tente novamente."
      );
    } finally {
      setEnviandoResposta(false);
    }
  }

  return (
    <>
      <div className="flex flex-col min-h-[calc(100vh-8rem)]">
        <div className="pb-4 shrink-0">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Central de Atendimento e Chamados
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Gerencie tickets de suporte, secretaria e solicitações dos alunos.
          </p>
        </div>

        <div className="flex-1 min-h-0">
          <div className="h-full min-h-[calc(100vh-12rem)] flex flex-col lg:flex-row gap-4">
            {/* Fila lateral */}
            <div className="w-full lg:w-[380px] shrink-0 flex flex-col rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden min-h-[320px] lg:min-h-0">
              <div className="p-4 border-b border-zinc-800 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Buscar aluno, RA ou assunto..."
                    className="w-full bg-black border border-zinc-800 rounded-md text-sm text-white pl-9 pr-3 py-2.5 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      { id: "todos", label: "Todos", count: contagens.todos },
                      { id: "aberto", label: "Abertos", count: contagens.aberto },
                      {
                        id: "respondido",
                        label: "Respondidos",
                        count: contagens.respondido,
                      },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFiltroStatus(f.id)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                        filtroStatus === f.id
                          ? "bg-zinc-800 text-white border-zinc-700"
                          : "bg-transparent text-zinc-500 border-zinc-800 hover:text-zinc-300"
                      }`}
                    >
                      {f.label} ({f.count})
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {carregando ? (
                  <p className="text-sm text-zinc-500 text-center py-10">
                    Carregando chamados...
                  </p>
                ) : chamados.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 text-sm">
                    Nenhum chamado aberto na secretaria.
                  </div>
                ) : chamadosFiltrados.length === 0 ? (
                  <p className="text-sm text-zinc-500 text-center py-10">
                    Nenhum chamado encontrado.
                  </p>
                ) : (
                  chamadosFiltrados.map((chamado) => {
                    const ativo = chamado.id === chamadoAtivo?.id;
                    return (
                      <button
                        key={chamado.id}
                        type="button"
                        onClick={() => handleSelecionarChamado(chamado)}
                        className={`w-full text-left rounded-lg border p-3.5 transition-colors ${
                          ativo
                            ? "border-blue-500/80 bg-[#131722]"
                            : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <p className="text-sm font-medium text-white truncate">
                            {chamado.nome_aluno}
                          </p>
                          <span
                            className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${statusBadgeClasses(chamado.status)}`}
                          >
                            {chamado.status === "aberto" ? "Aberto" : "Respondido"}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mb-1">
                          RA: {chamado.ra_aluno}
                        </p>
                        <p className="text-xs text-zinc-300 truncate">
                          {chamado.assunto}
                        </p>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Detalhe */}
            <div className="flex-1 min-w-0 rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden flex flex-col min-h-[420px]">
              {!chamadoAtivo ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 text-sm">
                  Selecione um chamado na lista ao lado para visualizar os detalhes.
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                  <div className="rounded-xl border border-zinc-800 bg-[#0c0e14] p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-sm font-semibold text-white shrink-0">
                        {iniciaisDe(chamadoAtivo.nome_aluno)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h2 className="text-lg font-semibold text-white truncate">
                            {chamadoAtivo.nome_aluno}
                          </h2>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusBadgeClasses(chamadoAtivo.status)}`}
                          >
                            {chamadoAtivo.status === "aberto"
                              ? "Aberto"
                              : "Respondido"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-zinc-400 mt-2">
                          <User className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                          RA:{" "}
                          <span className="text-zinc-200">{chamadoAtivo.ra_aluno}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-[#0c0e14] p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">
                          Solicitação do estudante
                        </p>
                        <h3 className="text-base font-semibold text-white">
                          {chamadoAtivo.assunto}
                        </h3>
                      </div>
                      <span className="flex items-center gap-1.5 text-xs text-zinc-500 shrink-0">
                        <Clock className="w-3.5 h-3.5" />
                        {formatarDataHora(chamadoAtivo.data_abertura)}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                      {chamadoAtivo.mensagem}
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-[#0c0e14] p-5">
                    <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">
                      Resposta da secretaria
                    </p>

                    {chamadoAtivo.status === "aberto" ? (
                      <>
                        <textarea
                          value={textoResposta}
                          onChange={(e) => setTextoResposta(e.target.value)}
                          placeholder="Escreva a tratativa da secretaria para o aluno..."
                          className="w-full min-h-[140px] bg-black border border-zinc-800 rounded-md text-sm text-white px-3 py-2.5 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 resize-y"
                        />
                        <button
                          type="button"
                          onClick={handleEnviarResposta}
                          disabled={enviandoResposta}
                          className="mt-4 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <Send className="w-4 h-4" />
                          {enviandoResposta ? "Enviando..." : "Enviar Resposta"}
                        </button>
                      </>
                    ) : (
                      <div>
                        <p className="flex items-center gap-1.5 text-xs text-zinc-500 mb-3">
                          <Clock className="w-3.5 h-3.5" />
                          Respondido em{" "}
                          {formatarDataHora(chamadoAtivo.data_resposta)}
                        </p>
                        <div className="rounded-md border border-zinc-800 bg-black/40 px-3 py-3">
                          <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
                            {chamadoAtivo.resposta || "—"}
                          </p>
                        </div>
                        <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-emerald-400">
                          <MessageSquareText className="w-3.5 h-3.5" />
                          Chamado concluído
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
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
