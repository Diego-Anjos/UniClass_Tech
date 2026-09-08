"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  Building,
  Sliders,
  Unplug,
  ShieldAlert,
  Upload,
  Save,
  Sparkles,
  Mail,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Plug,
  Database,
} from "lucide-react";
import { ModalFeedback } from "@/components/ModalFeedback";

type AbaConfig =
  | "Instituição"
  | "Regras Acadêmicas"
  | "Integrações e APIs"
  | "Segurança e Logs";

type StatusConexao = "Conectado" | "Desconectado";

type Integracao = {
  id: string;
  nome: string;
  descricao: string;
  status: StatusConexao;
  icon: typeof Sparkles;
};

const abas: { id: AbaConfig; label: string; icon: typeof Building }[] = [
  { id: "Instituição", label: "Instituição", icon: Building },
  { id: "Regras Acadêmicas", label: "Regras Acadêmicas", icon: Sliders },
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

type LogAuditoria = {
  id: string | number;
  created_at: string;
  usuario: string;
  acao: string;
  ip: string;
};

export default function ConfiguracoesSistemaPage() {
  const [abaAtiva, setAbaAtiva] = useState<AbaConfig>("Instituição");

  const [nomeInstituicao, setNomeInstituicao] = useState("UniClass Tech University");
  const [cnpj, setCnpj] = useState("12.345.678/0001-90");
  const [logoNome, setLogoNome] = useState<string | null>(null);

  const [mediaMinima, setMediaMinima] = useState("7.0");
  const [limiteFaltas, setLimiteFaltas] = useState("25");
  const [semestreVigente, setSemestreVigente] = useState("2026.1");

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
  const [salvando, setSalvando] = useState(false);

  function fecharFeedback() {
    setModalFeedback((prev) => ({ ...prev, aberto: false }));
  }

  const [logs, setLogs] = useState<LogAuditoria[]>([]);
  const [carregandoLogs, setCarregandoLogs] = useState(false);

  // Buscar logs de auditoria do Supabase
  async function fetchLogs() {
    setCarregandoLogs(true);
    const { data, error } = await supabase
      .from("logs_auditoria")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar logs:", error.message);
    } else {
      setLogs(data ?? []);
    }
    setCarregandoLogs(false);
  }

  // Carregar configurações e logs do Supabase ao montar a página
  useEffect(() => {
    async function carregarConfiguracoes() {
      const { data, error } = await supabase
        .from("configuracoes")
        .select("*")
        .eq("id", 1)
        .single();

      if (error) {
        console.error("Erro ao carregar configurações:", error.message);
        return;
      }

      if (data) {
        if (data.nome_instituicao) setNomeInstituicao(data.nome_instituicao);
        if (data.cnpj) setCnpj(data.cnpj);
        if (data.media_aprovacao !== undefined && data.media_aprovacao !== null)
          setMediaMinima(String(data.media_aprovacao));
        if (data.limite_faltas !== undefined && data.limite_faltas !== null)
          setLimiteFaltas(String(data.limite_faltas));
        if (data.semestre_vigente) setSemestreVigente(data.semestre_vigente);
      }
    }

    carregarConfiguracoes();
    fetchLogs();
  }, []);

  // Salvar configurações no Supabase
  async function salvarConfiguracoes(aba: AbaConfig) {
    setSalvando(true);

    let updatePayload: Record<string, unknown> = {};

    if (aba === "Instituição") {
      updatePayload = {
        nome_instituicao: nomeInstituicao,
        cnpj: cnpj,
      };
    } else if (aba === "Regras Acadêmicas") {
      updatePayload = {
        media_aprovacao: parseFloat(mediaMinima),
        limite_faltas: parseInt(limiteFaltas, 10),
        semestre_vigente: semestreVigente,
      };
    }

    const { error } = await supabase
      .from("configuracoes")
      .update(updatePayload)
      .eq("id", 1);

    setSalvando(false);

    if (error) {
      console.error("Erro ao salvar configurações:", error.message);
      return;
    }

    setModalFeedback({
      aberto: true,
      tipo: "sucesso",
      titulo: "Configurações salvas",
      mensagem:
        aba === "Instituição"
          ? "Dados da instituição salvos com sucesso!"
          : "Regras acadêmicas atualizadas!",
    });
  }

  // Groq e Resend/Google Calendar ficam separados: Groq tem estado próprio
  const [integracoes, setIntegracoes] = useState<Integracao[]>([
    {
      id: "resend",
      nome: "Resend E-mails",
      descricao: "E-mails transacionais e alertas",
      status: "Conectado",
      icon: Mail,
    },
    {
      id: "gcal",
      nome: "Google Calendar",
      descricao: "Eventos de provas e sincronização",
      status: "Desconectado",
      icon: CalendarDays,
    },
  ]);

  const [testando, setTestando] = useState<string | null>(null);

  const [supabaseStatus, setSupabaseStatus] = useState<
    "Conectado" | "Desconectado" | "Testando..."
  >("Conectado");

  const [groqStatus, setGroqStatus] = useState<
    "Conectado" | "Desconectado" | "Testando..."
  >("Conectado");

  function handleLogoChange(file: File | null) {
    setLogoNome(file ? file.name : null);
  }

  function testarConexao(id: string) {
    setTestando(id);
    window.setTimeout(() => {
      setIntegracoes((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: item.status === "Conectado" ? "Conectado" : "Conectado",
              }
            : item
        )
      );
      setTestando(null);
    }, 900);
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

  async function testarConexaoGroq() {
    setGroqStatus("Testando...");
    try {
      const res = await fetch("/api/groq/test");
      if (res.ok) {
        setGroqStatus("Conectado");
        setModalFeedback({
          aberto: true,
          tipo: "sucesso",
          titulo: "Conexão estabelecida",
          mensagem:
            "Conexão com Groq AI estabelecida com sucesso! Llama 3 operacional.",
        });
      } else {
        setGroqStatus("Desconectado");
        setModalFeedback({
          aberto: true,
          tipo: "erro",
          titulo: "Falha na conexão",
          mensagem:
            "Falha na conexão com a Groq AI. Verifique a chave de API.",
        });
      }
    } catch (err) {
      console.error("Erro ao testar Groq:", err);
      setGroqStatus("Desconectado");
      setModalFeedback({
        aberto: true,
        tipo: "erro",
        titulo: "Falha na conexão",
        mensagem:
          "Falha na conexão com a Groq AI. Verifique a chave de API.",
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
              {abaAtiva === "Instituição" && (
                <section className="rounded-xl bg-zinc-950 border border-zinc-800 p-6 space-y-6">
                  <div>
                    <h2 className="text-sm font-semibold text-white">Dados da Instituição</h2>
                    <p className="text-xs text-zinc-500 mt-1">
                      Informações exibidas em documentos e comunicações oficiais.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-zinc-500 uppercase tracking-widest mb-2">
                        Nome da Instituição
                      </label>
                      <input
                        type="text"
                        value={nomeInstituicao}
                        onChange={(e) => setNomeInstituicao(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white outline-none focus:border-zinc-600 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-zinc-500 uppercase tracking-widest mb-2">
                        CNPJ
                      </label>
                      <input
                        type="text"
                        value={cnpj}
                        onChange={(e) => setCnpj(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white outline-none focus:border-zinc-600 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-zinc-500 uppercase tracking-widest mb-2">
                        Logo da Instituição
                      </label>
                      <label className="flex flex-col items-center justify-center gap-3 w-full min-h-[140px] rounded-xl border border-dashed border-zinc-700 bg-zinc-900/60 hover:bg-zinc-900 hover:border-zinc-500 transition-colors cursor-pointer px-6 py-8">
                        <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center">
                          <Upload className="w-5 h-5 text-zinc-400" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-zinc-300">
                            Arraste e solte a logo aqui, ou{" "}
                            <span className="text-white font-medium underline underline-offset-2">
                              escolha um arquivo
                            </span>
                          </p>
                          <p className="text-xs text-zinc-500 mt-1">
                            PNG ou SVG · máx. 2 MB
                          </p>
                          {logoNome && (
                            <p className="text-xs text-green-400 mt-2">{logoNome}</p>
                          )}
                        </div>
                        <input
                          type="file"
                          accept="image/png,image/svg+xml,image/jpeg"
                          className="hidden"
                          onChange={(e) =>
                            handleLogoChange(e.target.files?.[0] ?? null)
                          }
                        />
                      </label>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => salvarConfiguracoes("Instituição")}
                      disabled={salvando}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4" />
                      {salvando ? "Salvando..." : "Salvar Instituição"}
                    </button>
                  </div>
                </section>
              )}

              {abaAtiva === "Regras Acadêmicas" && (
                <section className="rounded-xl bg-zinc-950 border border-zinc-800 p-6 space-y-6">
                  <div>
                    <h2 className="text-sm font-semibold text-white">
                      Parâmetros Acadêmicos
                    </h2>
                    <p className="text-xs text-zinc-500 mt-1">
                      Regras usadas pelo FastAPI e pelos alertas preditivos da Groq.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-zinc-500 uppercase tracking-widest mb-2">
                        Média Mínima para Aprovação
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        value={mediaMinima}
                        onChange={(e) => setMediaMinima(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white outline-none focus:border-zinc-600 transition-colors"
                      />
                      <p className="text-xs text-zinc-500 mt-1.5">Ex.: 7.0</p>
                    </div>

                    <div>
                      <label className="block text-xs text-zinc-500 uppercase tracking-widest mb-2">
                        Porcentagem Limite de Faltas
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="1"
                          min="0"
                          max="100"
                          value={limiteFaltas}
                          onChange={(e) => setLimiteFaltas(e.target.value)}
                          className="w-full px-4 py-2.5 pr-10 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white outline-none focus:border-zinc-600 transition-colors"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                          %
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1.5">Ex.: 25%</p>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs text-zinc-500 uppercase tracking-widest mb-2">
                        Semestre Vigente
                      </label>
                      <select
                        value={semestreVigente}
                        onChange={(e) => setSemestreVigente(e.target.value)}
                        className="w-full appearance-none px-4 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white outline-none focus:border-zinc-600 transition-colors"
                      >
                        <option value="2025.2">2025.2</option>
                        <option value="2026.1">2026.1</option>
                        <option value="2026.2">2026.2</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => salvarConfiguracoes("Regras Acadêmicas")}
                      disabled={salvando}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4" />
                      {salvando ? "Salvando..." : "Salvar Alterações"}
                    </button>
                  </div>
                </section>
              )}

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

                    {/* Card Groq AI — status dinâmico via testarConexaoGroq() */}
                    <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-11 h-11 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                          <Sparkles className="w-5 h-5 text-zinc-300" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <p className="text-sm font-medium text-white">Groq AI</p>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                                groqStatus === "Conectado"
                                  ? "bg-green-950 text-green-400 border-green-900/50"
                                  : groqStatus === "Desconectado"
                                  ? "bg-red-950 text-red-400 border-red-900/50"
                                  : "bg-zinc-800 text-zinc-400 border-zinc-700/50"
                              }`}
                            >
                              {groqStatus === "Conectado" ? (
                                <CheckCircle2 className="w-3 h-3" />
                              ) : groqStatus === "Desconectado" ? (
                                <XCircle className="w-3 h-3" />
                              ) : (
                                <span className="w-3 h-3 rounded-full border-2 border-zinc-400 border-t-transparent animate-spin inline-block" />
                              )}
                              {groqStatus}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 mt-1">
                            Insights preditivos via Llama 3
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={testarConexaoGroq}
                        disabled={groqStatus === "Testando..."}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-zinc-200 hover:bg-zinc-800 hover:text-white transition-colors shrink-0 disabled:opacity-60"
                      >
                        <Plug className="w-4 h-4" />
                        {groqStatus === "Testando..." ? "Testando..." : "Testar Conexão"}
                      </button>
                    </div>

                    {/* Cards de integrações externas (Resend, Google Calendar) */}
                    {integracoes.map((item) => {
                      const Icon = item.icon;
                      const conectado = item.status === "Conectado";
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
                            onClick={() => testarConexao(item.id)}
                            disabled={testando === item.id}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-zinc-200 hover:bg-zinc-800 hover:text-white transition-colors shrink-0 disabled:opacity-60"
                          >
                            <Plug className="w-4 h-4" />
                            {testando === item.id ? "Testando..." : "Testar Conexão"}
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
                        Auditoria de ações sensíveis no sistema acadêmico.
                      </p>
                    </div>
                    {carregandoLogs && (
                      <span className="text-xs text-zinc-500 animate-pulse">Carregando...</span>
                    )}
                  </div>

                  <div className="overflow-x-auto">
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
                                {log.acao}
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
