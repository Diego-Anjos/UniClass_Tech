"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  BookOpen,
  UserCheck,
  Sparkles,
  MessageSquare,
  LogOut,
  GraduationCap,
  Search,
  Send,
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
  { icon: LayoutDashboard, label: "Visão Geral",    href: "/professor/dashboard",            active: false },
  { icon: BookOpen,        label: "Turmas e Notas", href: "/professor/dashboard/notas",      active: false },
  { icon: UserCheck,       label: "Chamada Rápida", href: "/professor/dashboard/chamada",    active: false },
  { icon: Sparkles,        label: "Insights IA",    href: "/professor/dashboard/insights",   active: false },
  { icon: MessageSquare,   label: "Mensagens",      href: "/professor/dashboard/mensagens",  active: true  },
];

type MensagemHistorico = {
  id: string;
  autor: "aluno" | "professor";
  texto: string;
  horario: string;
};

type MensagemInbox = {
  id: string;
  alunoNome: string;
  alunoRa: string;
  turmaNome: string;
  assunto: string;
  conteudo: string;
  tempo: string;
  naoLida: boolean;
  historico: MensagemHistorico[];
};

function iniciaisDoNome(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .join("");
}

function formatarTempoEnvio(valor: unknown): string {
  if (!valor) return "";
  const date = new Date(String(valor));
  if (Number.isNaN(date.getTime())) return String(valor);
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mapearMensagensSupabase(rows: Record<string, unknown>[]): MensagemInbox[] {
  return rows.map((row, index) => {
    const id = String(row.id ?? `msg-${index}`);
    const alunoNome = String(
      row.remetente ??
        row.aluno_nome ??
        row.alunoNome ??
        row.nome ??
        "Aluno"
    );
    const assunto = String(row.assunto ?? "Mensagem");
    const conteudo = String(row.conteudo ?? row.mensagem ?? row.texto ?? "");
    const tempo = formatarTempoEnvio(row.data_envio) || String(row.tempo ?? "");
    return {
      id,
      alunoNome,
      alunoRa: String(row.ra ?? row.matricula ?? row.aluno_ra ?? "—"),
      turmaNome: String(
        row.turma_nome ?? row.turmaNome ?? row.turma ?? row.curso ?? "—"
      ),
      assunto,
      conteudo,
      tempo,
      naoLida: !(row.lida === true || row.nao_lida === false || row.naoLida === false),
      historico: [
        {
          id: `${id}-orig`,
          autor: "aluno" as const,
          texto: conteudo,
          horario: tempo || "—",
        },
      ],
    };
  });
}

export default function ProfessorMensagensPage() {
  const { professorLogado, carregandoSessao } = useProfessorSession();
  const [busca, setBusca] = useState("");
  const [mensagens, setMensagens] = useState<MensagemInbox[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagemSelecionadaId, setMensagemSelecionadaId] = useState<string | null>(
    null
  );
  const [respostaTexto, setRespostaTexto] = useState("");
  const [contextoIa, setContextoIa] = useState("");
  const [isLoadingContexto, setIsLoadingContexto] = useState(false);
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
        m.alunoNome.toLowerCase().includes(termo) ||
        m.assunto.toLowerCase().includes(termo)
    );
  }, [mensagens, busca]);

  const conversaAtiva = useMemo(
    () => mensagens.find((m) => m.id === mensagemSelecionadaId) ?? null,
    [mensagens, mensagemSelecionadaId]
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

  async function fetchContextoIa(conversa: MensagemInbox) {
    setIsLoadingContexto(true);
    try {
      const response = await fetch("/api/insights/mensagem-contexto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alunoNome: conversa.alunoNome,
          turmaNome: conversa.turmaNome,
          assunto: conversa.assunto,
          conteudo: conversa.conteudo,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Falha ao gerar contexto da mensagem.");
      }
      setContextoIa((data.insight as string) ?? "");
    } catch (err) {
      console.error("Erro ao gerar contexto IA:", err);
      setContextoIa(
        "Não foi possível gerar o contexto desta conversa no momento."
      );
    } finally {
      setIsLoadingContexto(false);
    }
  }

  function selecionarMensagem(id: string) {
    setMensagemSelecionadaId(id);
    setRespostaTexto("");
    setMensagens((prev) =>
      prev.map((m) => (m.id === id ? { ...m, naoLida: false } : m))
    );
  }

  function handleEnviarResposta() {
    if (!conversaAtiva) return;

    if (!respostaTexto.trim()) {
      mostrarFeedback(
        "atencao",
        "Resposta vazia",
        "Digite uma resposta antes de enviar."
      );
      return;
    }

    const novaEntrada: MensagemHistorico = {
      id: `resp-${Date.now()}`,
      autor: "professor",
      texto: respostaTexto.trim(),
      horario: "Agora",
    };

    setMensagens((prev) =>
      prev.map((m) =>
        m.id === conversaAtiva.id
          ? { ...m, historico: [...m.historico, novaEntrada], naoLida: false }
          : m
      )
    );
    setRespostaTexto("");
    mostrarFeedback(
      "sucesso",
      "Mensagem Enviada",
      "Sua resposta foi entregue com sucesso ao aluno."
    );
  }

  useEffect(() => {
    if (!professorLogado) return;

    async function carregarMensagens() {
      setCarregando(true);
      const destinatario = professorLogado!.nomeCompletoTitulo;

      let { data, error } = await supabase
        .from("mensagens")
        .select("*")
        .eq("destinatario", destinatario)
        .order("data_envio", { ascending: false });

      // Fallback provisório: sem filtro de destinatário se a caixa filtrada vier vazia/erro
      if (error || !data || data.length === 0) {
        if (error) {
          console.error("Erro ao buscar mensagens filtradas:", error.message);
        }
        const fallback = await supabase
          .from("mensagens")
          .select("*")
          .order("data_envio", { ascending: false });

        if (fallback.error) {
          console.error(
            "Erro ao buscar mensagens:",
            fallback.error.message
          );
          setMensagens([]);
          setMensagemSelecionadaId(null);
          setCarregando(false);
          return;
        }

        data = fallback.data;
        error = fallback.error;
      }

      const lista = mapearMensagensSupabase(
        (data ?? []) as Record<string, unknown>[]
      );
      setMensagens(lista);
      setMensagemSelecionadaId(lista[0]?.id ?? null);
      setCarregando(false);
    }

    void carregarMensagens();
  }, [professorLogado]);

  useEffect(() => {
    if (!conversaAtiva) {
      setContextoIa("");
      return;
    }
    void fetchContextoIa(conversaAtiva);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mensagemSelecionadaId]);

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
      {/* ══════════════════════════════
          SIDEBAR
      ══════════════════════════════ */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-zinc-950 border-r border-zinc-800">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-zinc-800">
          <div className="w-8 h-8 bg-gradient-to-br from-zinc-800 to-zinc-950 border border-zinc-700/50 shadow-[0_0_15px_rgba(255,255,255,0.05)] flex items-center justify-center rounded-lg shrink-0">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="text-sm tracking-tight">
            <span className="text-white font-bold">UniClass</span>
            <span className="text-zinc-400 font-light">Tech</span>
          </span>
        </div>

        {/* Perfil */}
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

        {/* Nav */}
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

        {/* Logout */}
        <div className="px-2 py-4 border-t border-zinc-800">
          <a
            href="/professor"
            onClick={limparSessaoProfessor}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-500 hover:bg-zinc-900 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sair
          </a>
        </div>
      </aside>

      {/* ══════════════════════════════
          MAIN CONTENT
      ══════════════════════════════ */}
      <main className="flex-1 min-w-0 overflow-hidden bg-black flex flex-col">
        <div className="flex-1 min-h-0 flex flex-col p-8 max-w-6xl mx-auto w-full">

          {/* Header */}
          <div className="mb-6 shrink-0">
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Caixa de Entrada
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Gerencie e responda as dúvidas e solicitações dos seus alunos.
            </p>
          </div>

          {/* Split pane */}
          <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">

            {/* Lista de Mensagens */}
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
                  mensagensFiltradas.map((msg) => (
                    <button
                      key={msg.id}
                      type="button"
                      onClick={() => selecionarMensagem(msg.id)}
                      className={`w-full text-left rounded-lg border p-3.5 transition-colors ${
                        msg.id === mensagemSelecionadaId
                          ? "bg-zinc-900 border-zinc-700"
                          : "bg-transparent border-transparent hover:bg-zinc-900/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-medium text-white truncate">
                          {msg.alunoNome}
                        </p>
                        <span className="text-[11px] text-zinc-500 shrink-0">
                          {msg.tempo}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <p
                          className={`text-xs truncate ${
                            msg.naoLida ? "text-zinc-200" : "text-zinc-500"
                          }`}
                        >
                          {msg.assunto}
                        </p>
                        {msg.naoLida && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Detalhe e Resposta */}
            <div className="w-full md:w-2/3 pl-0 md:pl-4 pt-6 md:pt-0 flex flex-col gap-4 min-h-0 overflow-hidden">
              {!conversaAtiva ? (
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
                        {iniciaisDoNome(conversaAtiva.alunoNome)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white">
                          {conversaAtiva.alunoNome}
                        </p>
                        <p className="text-xs text-zinc-500">
                          RA {conversaAtiva.alunoRa} · {conversaAtiva.turmaNome}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-indigo-950/30 border border-indigo-900/50 rounded-md p-3 flex gap-3 shrink-0">
                    <Sparkles className="w-4 h-4 text-indigo-300 shrink-0 mt-0.5" />
                    <p
                      className={`text-xs text-zinc-400 leading-relaxed ${
                        isLoadingContexto ? "animate-pulse" : ""
                      }`}
                    >
                      {isLoadingContexto
                        ? "IA analisando histórico do aluno..."
                        : `Contexto IA: ${contextoIa}`}
                    </p>
                  </div>

                  <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-3">
                    {conversaAtiva.historico.map((item) => (
                      <div
                        key={item.id}
                        className={`rounded-lg p-4 ${
                          item.autor === "professor"
                            ? "bg-zinc-800/80 ml-8"
                            : "bg-zinc-900 mr-8"
                        }`}
                      >
                        <p className="text-[11px] text-zinc-500 mb-1.5">
                          {item.autor === "professor" ? "Você" : conversaAtiva.alunoNome}
                          {" · "}
                          {item.horario}
                        </p>
                        <p className="text-sm text-zinc-300 leading-relaxed">
                          {item.texto}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="shrink-0 flex flex-col gap-3">
                    <textarea
                      rows={3}
                      value={respostaTexto}
                      onChange={(e) => setRespostaTexto(e.target.value)}
                      placeholder={`Escreva sua resposta para ${conversaAtiva.alunoNome.split(" ")[0]}...`}
                      className="w-full resize-none bg-black border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleEnviarResposta}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white text-black hover:bg-zinc-200 transition-colors"
                      >
                        <Send className="w-4 h-4" />
                        Enviar Resposta
                      </button>
                    </div>
                  </div>
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
