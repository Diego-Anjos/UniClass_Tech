"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MessageSquareText,
  Paperclip,
  Image,
  Send,
  Clock,
  User,
  FileText,
  X,
  Search,
  GraduationCap,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ModalFeedback } from "@/components/ModalFeedback";

type StatusChamado = "aberto" | "respondido";
type FiltroStatus = "todos" | "aberto" | "respondido";
type Prioridade = "Alta" | "Média" | "Baixa";

type AnexoLocal = {
  id: string;
  nome: string;
  tamanho: string;
  tipo: string;
  file?: File;
};

type Chamado = {
  id: string;
  alunoNome: string;
  alunoRa: string;
  alunoEmail: string;
  alunoCurso: string;
  alunoSemestre: string;
  alunoStatus: string;
  assunto: string;
  mensagem: string;
  resposta: string;
  status: StatusChamado;
  prioridade: Prioridade;
  abertoEm: string;
  abertoEmLabel: string;
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

function formatarTamanho(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizarStatus(valor: unknown): StatusChamado {
  const raw = String(valor ?? "").trim().toLowerCase();
  if (raw === "respondido" || raw === "respondida" || raw === "concluido" || raw === "concluído") {
    return "respondido";
  }
  return "aberto";
}

function normalizarPrioridade(valor: unknown): Prioridade {
  const raw = String(valor ?? "").trim().toLowerCase();
  if (raw === "alta") return "Alta";
  if (raw === "baixa") return "Baixa";
  return "Média";
}

function mapearMensagemParaChamado(row: Record<string, unknown>): Chamado {
  const abertoEm = String(row.data_envio ?? row.created_at ?? "");
  return {
    id: String(row.id),
    alunoNome: String(
      row.remetente ?? row.aluno_nome ?? row.alunoNome ?? row.nome ?? "Estudante"
    ),
    alunoRa: String(row.ra ?? row.matricula ?? row.aluno_ra ?? "—"),
    alunoEmail: String(row.email ?? row.aluno_email ?? "—"),
    alunoCurso: String(row.curso ?? row.turma_nome ?? row.turma ?? "—"),
    alunoSemestre: String(row.semestre ?? "—"),
    alunoStatus: String(row.aluno_status ?? row.status_aluno ?? "Ativo"),
    assunto: String(row.assunto ?? "Sem assunto"),
    mensagem: String(row.conteudo ?? row.mensagem ?? row.texto ?? ""),
    resposta: String(row.resposta ?? ""),
    status: normalizarStatus(row.status),
    prioridade: normalizarPrioridade(row.prioridade),
    abertoEm,
    abertoEmLabel: abertoEm ? formatarDataHora(abertoEm) : "—",
  };
}

function statusBadgeClasses(status: StatusChamado) {
  if (status === "aberto") {
    return "bg-amber-950/50 text-amber-400 border border-amber-800";
  }
  return "bg-emerald-950/50 text-emerald-400 border border-emerald-800";
}

function prioridadeClasses(prioridade: Prioridade) {
  if (prioridade === "Alta") return "text-rose-400";
  if (prioridade === "Média") return "text-amber-400";
  return "text-zinc-400";
}

export default function AdmChamadosPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [chamadoSelecionado, setChamadoSelecionado] = useState<Chamado | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todos");
  const [busca, setBusca] = useState("");
  const [respostaTexto, setRespostaTexto] = useState("");
  const [anexos, setAnexos] = useState<AnexoLocal[]>([]);
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
        .from("mensagens")
        .select("*")
        .or("destinatario.eq.Secretaria,tipo.eq.Secretaria")
        .order("data_envio", { ascending: false });

      if (error) {
        console.error("Erro ao buscar chamados:", error.message);
        setChamados([]);
        setChamadoSelecionado(null);
        return;
      }

      const lista = ((data ?? []) as Record<string, unknown>[]).map(
        mapearMensagemParaChamado
      );
      setChamados(lista);

      if (lista.length === 0) {
        setChamadoSelecionado(null);
        return;
      }

      const aindaExiste = manterSelecionadoId
        ? lista.find((c) => c.id === manterSelecionadoId) ?? null
        : null;
      setChamadoSelecionado(aindaExiste ?? lista[0]);
    } catch (err) {
      console.error("Falha ao carregar chamados:", err);
      setChamados([]);
      setChamadoSelecionado(null);
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
        c.alunoNome.toLowerCase().includes(termo) ||
        c.assunto.toLowerCase().includes(termo) ||
        c.alunoRa.toLowerCase().includes(termo);
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

  function handleSelecionarArquivos(files: FileList | null) {
    if (!files || files.length === 0) return;
    const novos: AnexoLocal[] = Array.from(files).map((file) => ({
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      nome: file.name,
      tamanho: formatarTamanho(file.size),
      tipo: file.type,
      file,
    }));
    setAnexos((prev) => [...prev, ...novos]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removerAnexo(id: string) {
    setAnexos((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleEnviarResposta() {
    if (!chamadoSelecionado) return;

    const textoResposta = respostaTexto.trim();
    if (!textoResposta) {
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
        .from("mensagens")
        .update({ resposta: textoResposta, status: "Respondido" })
        .eq("id", chamadoSelecionado.id);

      if (error) {
        throw new Error(error.message);
      }

      setRespostaTexto("");
      setAnexos([]);
      await carregarChamados(chamadoSelecionado.id);
      abrirFeedback(
        "sucesso",
        "Resposta Registrada",
        "A resposta e os documentos anexados foram enviados para a central do aluno."
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
                    const ativo = chamado.id === chamadoSelecionado?.id;
                    return (
                      <button
                        key={chamado.id}
                        type="button"
                        onClick={() => {
                          setChamadoSelecionado(chamado);
                          setRespostaTexto(chamado.resposta || "");
                          setAnexos([]);
                        }}
                        className={`w-full text-left rounded-lg border p-3.5 transition-colors ${
                          ativo
                            ? "border-blue-500/80 bg-[#131722]"
                            : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <p className="text-sm font-medium text-white truncate">
                            {chamado.alunoNome}
                          </p>
                          <span
                            className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${statusBadgeClasses(chamado.status)}`}
                          >
                            {chamado.status === "aberto" ? "Aberto" : "Respondido"}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-300 truncate mb-2">
                          {chamado.assunto}
                        </p>
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                            <Clock className="w-3 h-3" />
                            {chamado.abertoEmLabel}
                          </span>
                          <span
                            className={`text-[11px] font-medium ${prioridadeClasses(chamado.prioridade)}`}
                          >
                            {chamado.prioridade}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Detalhe */}
            <div className="flex-1 min-w-0 rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden flex flex-col min-h-[420px]">
              {!chamadoSelecionado ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 text-sm">
                  Selecione um chamado na lista ao lado para visualizar os detalhes.
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                  {/* Perfil do aluno */}
                  <div className="rounded-xl border border-zinc-800 bg-[#0c0e14] p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-sm font-semibold text-white shrink-0">
                        {iniciaisDe(chamadoSelecionado.alunoNome)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h2 className="text-lg font-semibold text-white truncate">
                            {chamadoSelecionado.alunoNome}
                          </h2>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950/50 text-emerald-400 border border-emerald-800">
                            {chamadoSelecionado.alunoStatus}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-3">
                          <div className="flex items-center gap-2 text-sm text-zinc-400">
                            <User className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                            RA:{" "}
                            <span className="text-zinc-200">
                              {chamadoSelecionado.alunoRa}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-zinc-400">
                            <GraduationCap className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                            <span className="text-zinc-200 truncate">
                              {chamadoSelecionado.alunoCurso}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-zinc-400">
                            <FileText className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                            Semestre:{" "}
                            <span className="text-zinc-200">
                              {chamadoSelecionado.alunoSemestre}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-zinc-400 min-w-0">
                            <MessageSquareText className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                            <span className="text-zinc-200 truncate">
                              {chamadoSelecionado.alunoEmail}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Solicitação original */}
                  <div className="rounded-xl border border-zinc-800 bg-[#0c0e14] p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">
                          Solicitação do estudante
                        </p>
                        <h3 className="text-base font-semibold text-white">
                          {chamadoSelecionado.assunto}
                        </h3>
                      </div>
                      <span
                        className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusBadgeClasses(chamadoSelecionado.status)}`}
                      >
                        {chamadoSelecionado.status === "aberto"
                          ? "Aberto"
                          : "Respondido"}
                      </span>
                    </div>
                    <p className="flex items-center gap-1.5 text-xs text-zinc-500 mb-3">
                      <Clock className="w-3.5 h-3.5" />
                      Aberto em {chamadoSelecionado.abertoEmLabel}
                    </p>
                    <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                      {chamadoSelecionado.mensagem}
                    </p>
                  </div>

                  {/* Caixa de resposta */}
                  <div className="rounded-xl border border-zinc-800 bg-[#0c0e14] p-5">
                    <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">
                      Resposta da secretaria
                    </p>
                    <textarea
                      value={respostaTexto}
                      onChange={(e) => setRespostaTexto(e.target.value)}
                      placeholder="Escreva a tratativa da secretaria para o aluno..."
                      className="w-full min-h-[140px] bg-black border border-zinc-800 rounded-md text-sm text-white px-3 py-2.5 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 resize-y"
                      disabled={chamadoSelecionado.status === "respondido"}
                    />

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        hidden
                        accept="image/*,.pdf"
                        multiple
                        onChange={(e) => handleSelecionarArquivos(e.target.files)}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={chamadoSelecionado.status === "respondido"}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-zinc-400 border border-zinc-800 hover:text-white hover:border-zinc-600 transition-colors disabled:opacity-50"
                      >
                        <Image className="w-3.5 h-3.5" />
                        Imagem
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={chamadoSelecionado.status === "respondido"}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-zinc-400 border border-zinc-800 hover:text-white hover:border-zinc-600 transition-colors disabled:opacity-50"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                        Documento PDF
                      </button>
                    </div>

                    {anexos.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {anexos.map((anexo) => (
                          <span
                            key={anexo.id}
                            className="inline-flex items-center gap-2 max-w-full px-2.5 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-300"
                          >
                            <FileText className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                            <span className="truncate">{anexo.nome}</span>
                            <span className="text-zinc-600 shrink-0">{anexo.tamanho}</span>
                            <button
                              type="button"
                              onClick={() => removerAnexo(anexo.id)}
                              className="text-zinc-500 hover:text-white shrink-0"
                              aria-label={`Remover ${anexo.nome}`}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleEnviarResposta}
                      disabled={
                        enviandoResposta || chamadoSelecionado.status === "respondido"
                      }
                      className="mt-4 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" />
                      {enviandoResposta
                        ? "Enviando..."
                        : chamadoSelecionado.status === "respondido"
                          ? "Chamado já concluído"
                          : "Enviar Resposta e Concluir Chamado"}
                    </button>
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
