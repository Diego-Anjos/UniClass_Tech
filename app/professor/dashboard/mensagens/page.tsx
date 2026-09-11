"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  BookOpen,
  UserCheck,
  Sparkles,
  MessageSquare,
  Map as MapIcon,
  LogOut,
  GraduationCap,
  Search,
  Send,
  Clock,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ProfessorSettingsControl } from "@/components/professor/config-modal";
import { ModalFeedback } from "@/components/ModalFeedback";
import {
  iniciaisDoProfessor,
  limparSessaoProfessor,
  useProfessorSession,
} from "@/lib/professor-session";

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral", href: "/professor/dashboard", active: false },
  { icon: BookOpen, label: "Turmas e Notas", href: "/professor/dashboard/notas", active: false },
  { icon: UserCheck, label: "Chamada Rápida", href: "/professor/dashboard/chamada", active: false },
  { icon: MapIcon, label: "Mapa de Salas", href: "/professor/dashboard/mapa", active: false },
  { icon: Sparkles, label: "Insights IA", href: "/professor/dashboard/insights", active: false },
  { icon: MessageSquare, label: "Mensagens", href: "/professor/dashboard/mensagens", active: true },
];

type StatusChamado = "aberto" | "respondido";

type MensagemChamado = {
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

function iniciaisDoNome(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .join("");
}

function formatarDataHora(valor: unknown): string {
  if (!valor) return "—";
  const date = new Date(String(valor));
  if (Number.isNaN(date.getTime())) return String(valor);
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

function mapearChamado(row: Record<string, unknown>): MensagemChamado {
  return {
    id: String(row.id),
    nome_aluno: String(row.nome_aluno ?? "Aluno"),
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

export default function ProfessorMensagensPage() {
  const { professorLogado, carregandoSessao } = useProfessorSession();
  const [busca, setBusca] = useState("");
  const [mensagens, setMensagens] = useState<MensagemChamado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagemSelecionada, setMensagemSelecionada] =
    useState<MensagemChamado | null>(null);
  const [textoResposta, setTextoResposta] = useState("");
  const [enviandoResposta, setEnviandoResposta] = useState(false);
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

  const mensagensFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return mensagens;
    return mensagens.filter(
      (m) =>
        m.nome_aluno.toLowerCase().includes(termo) ||
        m.assunto.toLowerCase().includes(termo) ||
        m.ra_aluno.toLowerCase().includes(termo)
    );
  }, [mensagens, busca]);

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

  async function carregarMensagens(manterSelecionadoId?: string | null) {
    const professor = professorLogado;
    if (!professor?.nome) {
      setMensagens([]);
      setMensagemSelecionada(null);
      return;
    }

    setCarregando(true);
    try {
      // Sessão já vem do localStorage via useProfessorSession (uniclass_prof_session)
      const { data, error } = await supabase
        .from("chamados")
        .select("*")
        .eq("destinatario_tipo", "Professor")
        .ilike("destinatario_nome", `%${professor.nome}%`)
        .order("data_abertura", { ascending: false });

      if (error) {
        console.error("Erro ao buscar chamados do professor:", error.message);
        setMensagens([]);
        setMensagemSelecionada(null);
        return;
      }

      const lista = ((data ?? []) as Record<string, unknown>[]).map(
        mapearChamado
      );
      setMensagens(lista);

      if (lista.length === 0) {
        setMensagemSelecionada(null);
        return;
      }

      const aindaExiste = manterSelecionadoId
        ? lista.find((m) => m.id === manterSelecionadoId) ?? null
        : null;
      setMensagemSelecionada(aindaExiste ?? lista[0]);
    } catch (err) {
      console.error("Falha ao carregar mensagens:", err);
      setMensagens([]);
      setMensagemSelecionada(null);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (!professorLogado) return;
    void carregarMensagens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [professorLogado]);

  function handleSelecionarMensagem(msg: MensagemChamado) {
    setMensagemSelecionada(msg);
    setTextoResposta("");
  }

  async function handleEnviarResposta() {
    if (!mensagemSelecionada) return;

    const resposta = textoResposta.trim();
    if (!resposta) {
      mostrarFeedback(
        "atencao",
        "Resposta vazia",
        "Digite uma resposta antes de enviar."
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
        .eq("id", mensagemSelecionada.id);

      if (error) {
        throw new Error(error.message);
      }

      setTextoResposta("");
      await carregarMensagens(mensagemSelecionada.id);
      mostrarFeedback(
        "sucesso",
        "Mensagem Enviada",
        "Sua resposta foi entregue com sucesso ao aluno."
      );
    } catch (err) {
      console.error("Erro ao enviar resposta:", err);
      mostrarFeedback(
        "erro",
        "Falha no envio",
        "Não foi possível registrar a resposta. Tente novamente."
      );
    } finally {
      setEnviandoResposta(false);
    }
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

      <main className="flex-1 min-w-0 overflow-hidden bg-black flex flex-col">
        <div className="flex-1 min-h-0 flex flex-col p-8 max-w-6xl mx-auto w-full">
          <div className="mb-6 shrink-0">
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Caixa de Entrada
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Gerencie e responda as dúvidas e solicitações dos seus alunos.
            </p>
          </div>

          <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
            <div className="w-full md:w-1/3 border-r border-zinc-800 pr-4 flex flex-col min-h-0 overflow-hidden">
              <div className="relative mb-4 shrink-0">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar aluno ou assunto..."
                  className="w-full h-9 bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                />
              </div>

              <div className="flex-1 overflow-y-auto flex flex-col gap-2 pb-2">
                {carregando ? (
                  <p className="text-sm text-zinc-500 px-2 py-6 text-center animate-pulse">
                    Carregando mensagens...
                  </p>
                ) : mensagens.length === 0 ? (
                  <p className="text-sm text-zinc-500 px-2 py-6 text-center">
                    Nenhuma mensagem na caixa de entrada.
                  </p>
                ) : mensagensFiltradas.length === 0 ? (
                  <p className="text-sm text-zinc-500 px-2 py-6 text-center">
                    Nenhuma mensagem encontrada para a busca.
                  </p>
                ) : (
                  mensagensFiltradas.map((msg) => {
                    const ativo = msg.id === mensagemSelecionada?.id;
                    return (
                      <button
                        key={msg.id}
                        type="button"
                        onClick={() => handleSelecionarMensagem(msg)}
                        className={`w-full text-left rounded-lg border p-3.5 transition-colors ${
                          ativo
                            ? "bg-zinc-900 border-zinc-700"
                            : "bg-transparent border-transparent hover:bg-zinc-900/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <p className="text-sm font-medium text-white truncate">
                            {msg.nome_aluno}
                          </p>
                          <span
                            className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${statusBadgeClasses(msg.status)}`}
                          >
                            {msg.status === "aberto" ? "Aberto" : "Respondido"}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 truncate">
                          {msg.assunto}
                        </p>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="w-full md:w-2/3 pl-0 md:pl-4 pt-6 md:pt-0 flex flex-col gap-4 min-h-0 overflow-hidden">
              {!mensagemSelecionada ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-zinc-500 text-center px-4">
                    Selecione uma mensagem para visualizar e responder.
                  </p>
                </div>
              ) : (
                <>
                  <div className="border-b border-zinc-800 pb-4 shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-semibold text-white shrink-0">
                        {iniciaisDoNome(mensagemSelecionada.nome_aluno)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-white">
                            {mensagemSelecionada.nome_aluno}
                          </p>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${statusBadgeClasses(mensagemSelecionada.status)}`}
                          >
                            {mensagemSelecionada.status === "aberto"
                              ? "Aberto"
                              : "Respondido"}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500">
                          RA {mensagemSelecionada.ra_aluno} ·{" "}
                          {mensagemSelecionada.assunto}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-3">
                    <div className="rounded-lg bg-zinc-900 mr-8 p-4">
                      <p className="flex items-center gap-1.5 text-[11px] text-zinc-500 mb-1.5">
                        <Clock className="w-3 h-3" />
                        {mensagemSelecionada.nome_aluno} ·{" "}
                        {formatarDataHora(mensagemSelecionada.data_abertura)}
                      </p>
                      <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                        {mensagemSelecionada.mensagem}
                      </p>
                    </div>

                    {mensagemSelecionada.status === "respondido" &&
                    mensagemSelecionada.resposta ? (
                      <div className="rounded-lg bg-zinc-800/80 ml-8 p-4">
                        <p className="flex items-center gap-1.5 text-[11px] text-zinc-500 mb-1.5">
                          <Clock className="w-3 h-3" />
                          Você ·{" "}
                          {formatarDataHora(mensagemSelecionada.data_resposta)}
                        </p>
                        <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                          {mensagemSelecionada.resposta}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  {mensagemSelecionada.status === "aberto" ? (
                    <div className="shrink-0 flex flex-col gap-3">
                      <textarea
                        rows={3}
                        value={textoResposta}
                        onChange={(e) => setTextoResposta(e.target.value)}
                        placeholder={`Escreva sua resposta para ${mensagemSelecionada.nome_aluno.split(" ")[0]}...`}
                        className="w-full resize-none bg-black border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleEnviarResposta}
                          disabled={enviandoResposta}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white text-black hover:bg-zinc-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <Send className="w-4 h-4" />
                          {enviandoResposta ? "Enviando..." : "Enviar Resposta"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>
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
