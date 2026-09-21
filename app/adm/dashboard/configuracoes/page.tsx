"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { TIPOS_ACAO_LOGS_RECENTES } from "@/lib/logs-auditoria";
import {
  Unplug,
  ShieldAlert,
  Sparkles,
  Mail,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plug,
  Database,
} from "lucide-react";
import { toast } from "sonner";
import { ModalFeedback } from "@/components/ModalFeedback";

type AbaConfig = "Integrações e APIs" | "Segurança e Logs";

type StatusConexao = "Conectado" | "Desconectado";

type Integracao = {
  id: string;
  nome: string;
  descricao: string;
  status: StatusConexao;
  icon: typeof Sparkles;
};

const abas: { id: AbaConfig; label: string; icon: typeof Unplug }[] = [
  { id: "Integrações e APIs", label: "Integrações e APIs", icon: Unplug },
  { id: "Segurança e Logs", label: "Segurança e Logs", icon: ShieldAlert },
];

// Helper: formata ISO timestamp → DD/MM/YYYY HH:mm:ss (fuso local)
function formatarDataBR(isoString: string): string {
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

const UUID_REGEX =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/** Exibe ação legível; fallback para logs antigos vazios e UUIDs truncados. */
function formatarAcaoRealizada(acao: string | null | undefined): string {
  const texto = acao?.trim();
  if (!texto) return "Ação de sistema (Legado)";
  return texto.replace(UUID_REGEX, (uuid) => `${uuid.slice(0, 8)}…`);
}

type LogAuditoria = {
  id: string | number;
  created_at: string;
  usuario: string;
  acao_realizada: string | null;
  ip: string;
};

export default function ConfiguracoesSistemaPage() {
  const [abaAtiva, setAbaAtiva] = useState<AbaConfig>("Integrações e APIs");

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

  function fecharFeedback() {
    setModalFeedback((prev) => ({ ...prev, aberto: false }));
  }

  const [logs, setLogs] = useState<LogAuditoria[]>([]);
  const [carregandoLogs, setCarregandoLogs] = useState(false);

  // Buscar logs de auditoria: apenas lançamento de notas e registro de chamada
  async function fetchLogs() {
    setCarregandoLogs(true);
    const { data, error } = await supabase
      .from("logs_auditoria")
      .select("*")
      .in("tipo_acao", TIPOS_ACAO_LOGS_RECENTES)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar logs:", error.message);
    } else {
      setLogs(data ?? []);
    }
    setCarregandoLogs(false);
  }

  useEffect(() => {
    fetchLogs();
  }, []);

  // Gemini e Resend ficam separados: Gemini tem estado próprio
  const [integracoes, setIntegracoes] = useState<Integracao[]>([
    {
      id: "resend",
      nome: "Resend E-mails",
      descricao: "E-mails transacionais e alertas",
      status: "Conectado",
      icon: Mail,
    },
  ]);

  const [testando, setTestando] = useState<string | null>(null);

  const [supabaseStatus, setSupabaseStatus] = useState<
    "Conectado" | "Desconectado" | "Testando..."
  >("Conectado");

  const [geminiStatus, setGeminiStatus] = useState<
    "Conectado" | "Conectado (Sem Cota)" | "Desconectado" | "Testando..."
  >("Conectado");

  async function testarResend() {
    setTestando("resend");

    const promise = fetch("/api/settings/test-resend").then(async (res) => {
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        throw new Error(
          payload.error || "Falha ao conectar com o Resend. Verifique a chave."
        );
      }
      return payload;
    });

    toast.promise(promise, {
      loading: "Testando conexão com Resend...",
      success: (data) => {
        setIntegracoes((prev) =>
          prev.map((item) =>
            item.id === "resend" ? { ...item, status: "Conectado" } : item
          )
        );
        return (
          data.message || "Conexão com Resend estabelecida com sucesso!"
        );
      },
      error: (err: unknown) => {
        setIntegracoes((prev) =>
          prev.map((item) =>
            item.id === "resend" ? { ...item, status: "Desconectado" } : item
          )
        );
        return err instanceof Error
          ? err.message
          : "Falha ao conectar com o Resend.";
      },
    });

    try {
      await promise;
    } catch {
      // feedback já tratado pelo toast.promise
    } finally {
      setTestando(null);
    }
  }

  async function testarConexaoSupabase() {
    setSupabaseStatus("Testando...");
    const { error } = await supabase
      .from("configuracoes")
      .select("id")
      .limit(1);

    if (error) {
      console.error("Falha na conexão com Supabase:", error.message);
      setSupabaseStatus("Desconectado");
      setModalFeedback({
        aberto: true,
        tipo: "erro",
        titulo: "Falha na conexão",
        mensagem: "Falha na conexão com o Supabase.",
      });
    } else {
      setSupabaseStatus("Conectado");
      setModalFeedback({
        aberto: true,
        tipo: "sucesso",
        titulo: "Conexão estabelecida",
        mensagem: "Conexão com Supabase estável e respondendo!",
      });
    }
  }

  async function testarConexaoGemini() {
    setGeminiStatus("Testando...");
    try {
      const res = await fetch("/api/gemini/test");
      const payload = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        status?: string;
        message?: string;
        error?: string;
      };

      if (res.ok && payload.status === "rate_limited") {
        setGeminiStatus("Conectado (Sem Cota)");
        toast.warning(
          payload.message ||
            "Conexão com Gemini OK, mas a cota diária foi atingida."
        );
        setModalFeedback({
          aberto: true,
          tipo: "atencao",
          titulo: "Limite de cota atingido",
          mensagem:
            "A chave da API é válida e a rede responde, porém a cota gratuita do Gemini foi esgotada. Tente novamente mais tarde.",
        });
        return;
      }

      if (res.ok && (payload.success === true || payload.status === "ok")) {
        setGeminiStatus("Conectado");
        toast.success("Conexão com Google Gemini estabelecida com sucesso!");
        setModalFeedback({
          aberto: true,
          tipo: "sucesso",
          titulo: "Conexão estabelecida",
          mensagem:
            "Conexão com Google Gemini estabelecida com sucesso! Gemini Flash operacional.",
        });
        return;
      }

      setGeminiStatus("Desconectado");
      toast.error(
        payload.error ||
          "Falha na conexão com o Google Gemini. Verifique a chave de API."
      );
      setModalFeedback({
        aberto: true,
        tipo: "erro",
        titulo: "Falha na conexão",
        mensagem:
          "Falha na conexão com o Google Gemini. Verifique a chave de API.",
      });
    } catch (err) {
      console.error("Erro ao testar Gemini:", err);
      setGeminiStatus("Desconectado");
      toast.error(
        "Falha na conexão com o Google Gemini. Verifique a chave de API."
      );
      setModalFeedback({
        aberto: true,
        tipo: "erro",
        titulo: "Falha na conexão",
        mensagem:
          "Falha na conexão com o Google Gemini. Verifique a chave de API.",
      });
    }
  }

  return (
    <>
      <ModalFeedback
        aberto={modalFeedback.aberto}
        onClose={fecharFeedback}
        tipo={modalFeedback.tipo}
        titulo={modalFeedback.titulo}
        mensagem={modalFeedback.mensagem}
      />

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Configurações do Sistema
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Gerencie regras acadêmicas, integrações e segurança
            </p>
          </div>

          {/* Layout dividido: tabs verticais + conteúdo */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Tabs verticais */}
            <nav className="lg:w-56 shrink-0">
              <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-2 flex flex-row lg:flex-col gap-1 overflow-x-auto">
                {abas.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setAbaAtiva(id)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm whitespace-nowrap transition-colors text-left ${
                      abaAtiva === id
                        ? "bg-zinc-800 text-white font-medium"
                        : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {label}
                  </button>
                ))}
              </div>
            </nav>

            {/* Área de conteúdo */}
            <div className="flex-1 min-w-0">
              {abaAtiva === "Integrações e APIs" && (
                <section className="space-y-4">
                  <div className="mb-2">
                    <h2 className="text-sm font-semibold text-white">
                      Integrações Externas
                    </h2>
                    <p className="text-xs text-zinc-500 mt-1">
                      Credenciais gerenciadas pelo FastAPI — nunca expostas no front-end.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    {/* Card Supabase — status dinâmico via testarConexaoSupabase() */}
                    <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-11 h-11 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                          <Database className="w-5 h-5 text-zinc-300" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <p className="text-sm font-medium text-white">Supabase</p>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                                supabaseStatus === "Conectado"
                                  ? "bg-green-950 text-green-400 border-green-900/50"
                                  : supabaseStatus === "Desconectado"
                                  ? "bg-red-950 text-red-400 border-red-900/50"
                                  : "bg-zinc-800 text-zinc-400 border-zinc-700/50"
                              }`}
                            >
                              {supabaseStatus === "Conectado" ? (
                                <CheckCircle2 className="w-3 h-3" />
                              ) : supabaseStatus === "Desconectado" ? (
                                <XCircle className="w-3 h-3" />
                              ) : (
                                <span className="w-3 h-3 rounded-full border-2 border-zinc-400 border-t-transparent animate-spin inline-block" />
                              )}
                              {supabaseStatus}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 mt-1">
                            Banco de dados PostgreSQL e Autenticação
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={testarConexaoSupabase}
                        disabled={supabaseStatus === "Testando..."}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-zinc-200 hover:bg-zinc-800 hover:text-white transition-colors shrink-0 disabled:opacity-60"
                      >
                        <Plug className="w-4 h-4" />
                        {supabaseStatus === "Testando..." ? "Testando..." : "Testar Conexão"}
                      </button>
                    </div>

                    {/* Card Google Gemini — status dinâmico via testarConexaoGemini() */}
                    <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-11 h-11 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                          <Sparkles className="w-5 h-5 text-zinc-300" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <p className="text-sm font-medium text-white">Google Gemini</p>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                                geminiStatus === "Conectado"
                                  ? "bg-green-950 text-green-400 border-green-900/50"
                                  : geminiStatus === "Conectado (Sem Cota)"
                                  ? "bg-yellow-500/20 text-yellow-500 border-yellow-500/30"
                                  : geminiStatus === "Desconectado"
                                  ? "bg-red-950 text-red-400 border-red-900/50"
                                  : "bg-zinc-800 text-zinc-400 border-zinc-700/50"
                              }`}
                            >
                              {geminiStatus === "Conectado" ? (
                                <CheckCircle2 className="w-3 h-3" />
                              ) : geminiStatus === "Conectado (Sem Cota)" ? (
                                <AlertTriangle className="w-3 h-3" />
                              ) : geminiStatus === "Desconectado" ? (
                                <XCircle className="w-3 h-3" />
                              ) : (
                                <span className="w-3 h-3 rounded-full border-2 border-zinc-400 border-t-transparent animate-spin inline-block" />
                              )}
                              {geminiStatus}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 mt-1">
                            Insights preditivos via Gemini / Flash
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={testarConexaoGemini}
                        disabled={geminiStatus === "Testando..."}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-zinc-200 hover:bg-zinc-800 hover:text-white transition-colors shrink-0 disabled:opacity-60"
                      >
                        <Plug className="w-4 h-4" />
                        {geminiStatus === "Testando..." ? "Testando..." : "Testar Conexão"}
                      </button>
                    </div>

                    {/* Card Resend E-mails */}
                    {integracoes.map((item) => {
                      const Icon = item.icon;
                      const conectado = item.status === "Conectado";
                      const testandoResend = testando === "resend";
                      return (
                        <div
                          key={item.id}
                          className="rounded-xl bg-zinc-950 border border-zinc-800 p-5 flex flex-col sm:flex-row sm:items-center gap-4"
                        >
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="w-11 h-11 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                              <Icon className="w-5 h-5 text-zinc-300" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <p className="text-sm font-medium text-white">
                                  {item.nome}
                                </p>
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                                    conectado
                                      ? "bg-green-950 text-green-400 border-green-900/50"
                                      : "bg-red-950 text-red-400 border-red-900/50"
                                  }`}
                                >
                                  {conectado ? (
                                    <CheckCircle2 className="w-3 h-3" />
                                  ) : (
                                    <XCircle className="w-3 h-3" />
                                  )}
                                  {item.status}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-500 mt-1">{item.descricao}</p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => void testarResend()}
                            disabled={testandoResend}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-zinc-200 hover:bg-zinc-800 hover:text-white transition-colors shrink-0 disabled:opacity-60"
                          >
                            <Plug className="w-4 h-4" />
                            {testandoResend ? "Testando..." : "Testar Conexão"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {abaAtiva === "Segurança e Logs" && (
                <section className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
                  <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-sm font-semibold text-white">Logs Recentes</h2>
                      <p className="text-xs text-zinc-500 mt-1">
                        Somente lançamentos de notas e registros de chamada dos professores.
                      </p>
                    </div>
                    {carregandoLogs && (
                      <span className="text-xs text-zinc-500 animate-pulse">Carregando...</span>
                    )}
                  </div>

                  <div className="w-full overflow-x-auto">
                    <table className="w-full text-left min-w-[720px]">
                      <thead>
                        <tr className="border-b border-zinc-800">
                          <th className="px-6 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest">
                            Data/Hora
                          </th>
                          <th className="px-4 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest">
                            Usuário
                          </th>
                          <th className="px-4 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest">
                            Ação Realizada
                          </th>
                          <th className="px-6 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest">
                            IP
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {carregandoLogs ? (
                          // Skeleton rows enquanto carrega
                          Array.from({ length: 4 }).map((_, i) => (
                            <tr key={i} className="border-b border-zinc-800">
                              {Array.from({ length: 4 }).map((__, j) => (
                                <td key={j} className="px-6 py-4">
                                  <div className="h-3 rounded bg-zinc-800 animate-pulse w-3/4" />
                                </td>
                              ))}
                            </tr>
                          ))
                        ) : logs.length === 0 ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-6 py-10 text-center text-sm text-zinc-600"
                            >
                              Nenhum registro de auditoria encontrado.
                            </td>
                          </tr>
                        ) : (
                          logs.map((log) => (
                            <tr
                              key={log.id}
                              className="border-b border-zinc-800 last:border-b-0 hover:bg-zinc-900/40 transition-colors"
                            >
                              <td className="px-6 py-4 text-sm text-zinc-400 whitespace-nowrap font-mono">
                                {formatarDataBR(log.created_at)}
                              </td>
                              <td className="px-4 py-4 text-sm text-zinc-300 whitespace-nowrap">
                                {log.usuario}
                              </td>
                              <td className="px-4 py-4 text-sm text-zinc-400 max-w-[360px]">
                                {formatarAcaoRealizada(log.acao_realizada)}
                              </td>
                              <td className="px-6 py-4 text-sm text-zinc-500 font-mono">
                                {log.ip ?? "—"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>
          </div>
    </>
  );
}
