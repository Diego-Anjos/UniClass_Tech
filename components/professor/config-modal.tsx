"use client";

import { useEffect, useState } from "react";
import {
  Settings,
  X,
  Loader2,
  Sparkles,
  Scale,
  Bell,
  User,
  LogOut,
} from "lucide-react";
import { ModalFeedback } from "@/components/ModalFeedback";
import {
  limparSessaoProfessor,
  lerSessaoProfessor,
  iniciaisDoProfessor,
  type ProfessorSession,
} from "@/lib/professor-session";
import {
  DIAS_ATENDIMENTO_OPCOES,
  PREFERENCIAS_PADRAO,
  atualizarSessaoProfessorLocal,
  normalizarPreferencias,
  type DiaAtendimento,
  type PreferenciasProfessor,
  type TomIa,
} from "@/lib/professor-preferencias";

type AbaAtiva = "ia" | "avaliacoes" | "perfil" | "notificacoes";

const ABAS: { id: AbaAtiva; label: string; icon: typeof Sparkles }[] = [
  { id: "ia", label: "Assistente IA", icon: Sparkles },
  { id: "avaliacoes", label: "Critérios & Notas", icon: Scale },
  { id: "notificacoes", label: "Notificações & Atendimento", icon: Bell },
  { id: "perfil", label: "Perfil Docente", icon: User },
];

const TOM_OPCOES: { value: TomIa; label: string; desc: string }[] = [
  {
    value: "direto",
    label: "Direto & Executivo",
    desc: "Análises objetivas e acionáveis",
  },
  {
    value: "pedagogico",
    label: "Pedagógico",
    desc: "Foco em orientação e aprendizagem",
  },
  {
    value: "motivacional",
    label: "Motivador",
    desc: "Tom encorajador e positivo",
  },
];

function prefsKey(professorId: string) {
  return `uniclass_prof_prefs_${professorId}`;
}

function lerPrefsLocal(professorId: string): PreferenciasProfessor | null {
  try {
    const raw = localStorage.getItem(prefsKey(professorId));
    if (!raw) return null;
    return normalizarPreferencias(JSON.parse(raw));
  } catch {
    return null;
  }
}

function salvarPrefsLocal(
  professorId: string,
  prefs: PreferenciasProfessor
) {
  localStorage.setItem(prefsKey(professorId), JSON.stringify(prefs));
}

export function ProfessorSettingsControl() {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>("ia");
  const [carregandoPrefs, setCarregandoPrefs] = useState(false);
  const [professorSessao, setProfessorSessao] =
    useState<ProfessorSession | null>(null);

  // Assistente IA
  const [tomIA, setTomIA] = useState<TomIa>(PREFERENCIAS_PADRAO.tom_ia);
  const [reguaEvasao, setReguaEvasao] = useState(
    PREFERENCIAS_PADRAO.regua_evasao
  );

  // Critérios & Notas
  const [travarEdicaoNotas, setTravarEdicaoNotas] = useState(
    PREFERENCIAS_PADRAO.travar_edicao_notas
  );

  // Notificações
  const [diasAtendimento, setDiasAtendimento] = useState<DiaAtendimento[]>([
    ...PREFERENCIAS_PADRAO.dias_atendimento,
  ]);
  const [atendimentoDe, setAtendimentoDe] = useState(
    PREFERENCIAS_PADRAO.atendimento_de
  );
  const [atendimentoAte, setAtendimentoAte] = useState(
    PREFERENCIAS_PADRAO.atendimento_ate
  );
  const [notificarMensagens, setNotificarMensagens] = useState(
    PREFERENCIAS_PADRAO.notificar_mensagens
  );
  const [notificarAlertas, setNotificarAlertas] = useState(
    PREFERENCIAS_PADRAO.notificar_alertas
  );

  // Perfil Docente
  const [nome, setNome] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [titulacao, setTitulacao] = useState("");

  const [salvando, setSalvando] = useState(false);
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

  function aplicarPreferencias(prefs: PreferenciasProfessor) {
    setTomIA(prefs.tom_ia);
    setReguaEvasao(prefs.regua_evasao);
    setTravarEdicaoNotas(prefs.travar_edicao_notas);
    setDiasAtendimento([...prefs.dias_atendimento]);
    setAtendimentoDe(prefs.atendimento_de);
    setAtendimentoAte(prefs.atendimento_ate);
    setNotificarMensagens(prefs.notificar_mensagens);
    setNotificarAlertas(prefs.notificar_alertas);
  }

  function montarPreferencias(): PreferenciasProfessor {
    return normalizarPreferencias({
      tom_ia: tomIA,
      regua_evasao: reguaEvasao,
      travar_edicao_notas: travarEdicaoNotas,
      dias_atendimento: diasAtendimento,
      atendimento_de: atendimentoDe,
      atendimento_ate: atendimentoAte,
      notificar_mensagens: notificarMensagens,
      notificar_alertas: notificarAlertas,
    });
  }

  function toggleDiaAtendimento(dia: DiaAtendimento) {
    setDiasAtendimento((atuais) =>
      atuais.includes(dia)
        ? atuais.filter((d) => d !== dia)
        : [...atuais, dia]
    );
  }

  useEffect(() => {
    if (!isConfigOpen) return;

    const sessao = lerSessaoProfessor();
    setProfessorSessao(sessao);

    if (!sessao?.id) {
      setModalFeedback({
        aberto: true,
        tipo: "erro",
        titulo: "Sessão inválida",
        mensagem: "Faça login novamente para gerenciar as preferências.",
      });
      setIsConfigOpen(false);
      return;
    }

    let cancelado = false;

    async function carregarDoSupabase() {
      setCarregandoPrefs(true);

      try {
        const res = await fetch(
          `/api/professores/preferencias?professorId=${encodeURIComponent(sessao!.id)}`
        );
        const json = (await res.json()) as {
          error?: string;
          nome?: string;
          titulacao?: string;
          area_atuacao?: string;
          preferencias?: PreferenciasProfessor;
        };

        if (cancelado) return;

        if (!res.ok) {
          setNome(sessao!.nome || "");
          setDepartamento(sessao!.area_atuacao || "");
          setTitulacao(sessao!.titulacao || "");
          aplicarPreferencias(
            lerPrefsLocal(sessao!.id) ?? PREFERENCIAS_PADRAO
          );
          setModalFeedback({
            aberto: true,
            tipo: "erro",
            titulo: "Falha ao carregar",
            mensagem:
              json.error ||
              "Não foi possível carregar as preferências do professor.",
          });
          setCarregandoPrefs(false);
          return;
        }

        setNome(json.nome || sessao!.nome || "");
        setDepartamento(json.area_atuacao || sessao!.area_atuacao || "");
        setTitulacao(json.titulacao || sessao!.titulacao || "");
        aplicarPreferencias(
          json.preferencias
            ? normalizarPreferencias(json.preferencias)
            : lerPrefsLocal(sessao!.id) ?? PREFERENCIAS_PADRAO
        );
      } catch {
        if (cancelado) return;
        setNome(sessao!.nome || "");
        setDepartamento(sessao!.area_atuacao || "");
        setTitulacao(sessao!.titulacao || "");
        aplicarPreferencias(
          lerPrefsLocal(sessao!.id) ?? PREFERENCIAS_PADRAO
        );
        setModalFeedback({
          aberto: true,
          tipo: "erro",
          titulo: "Falha ao carregar",
          mensagem: "Não foi possível carregar as preferências do professor.",
        });
      } finally {
        if (!cancelado) setCarregandoPrefs(false);
      }
    }

    void carregarDoSupabase();

    return () => {
      cancelado = true;
    };
  }, [isConfigOpen]);

  function fecharModal() {
    if (salvando) return;
    setIsConfigOpen(false);
    setAbaAtiva("ia");
  }

  function fecharFeedback() {
    setModalFeedback((prev) => ({ ...prev, aberto: false }));
  }

  async function handleSalvar() {
    const sessao = professorSessao ?? lerSessaoProfessor();
    if (!sessao?.id) {
      setModalFeedback({
        aberto: true,
        tipo: "erro",
        titulo: "Sessão inválida",
        mensagem: "Faça login novamente para salvar as preferências.",
      });
      return;
    }

    const preferencias = montarPreferencias();
    const nomeTrim = nome.trim();
    const departamentoTrim = departamento.trim();
    const titulacaoTrim = titulacao.trim();

    if (!nomeTrim || !departamentoTrim || !titulacaoTrim) {
      setAbaAtiva("perfil");
      setModalFeedback({
        aberto: true,
        tipo: "atencao",
        titulo: "Perfil incompleto",
        mensagem: "Preencha nome, departamento e titulação antes de salvar.",
      });
      return;
    }

    setSalvando(true);

    try {
      const res = await fetch("/api/professores/preferencias", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professorId: sessao.id,
          nome: nomeTrim,
          titulacao: titulacaoTrim,
          area_atuacao: departamentoTrim,
          preferencias,
        }),
      });

      const json = (await res.json()) as { error?: string };

      if (!res.ok) {
        setModalFeedback({
          aberto: true,
          tipo: "erro",
          titulo: "Erro ao salvar",
          mensagem: json.error || "Não foi possível salvar as preferências.",
        });
        return;
      }

      salvarPrefsLocal(sessao.id, preferencias);
      const atualizada = atualizarSessaoProfessorLocal(sessao, {
        nome: nomeTrim,
        titulacao: titulacaoTrim,
        area_atuacao: departamentoTrim,
      });
      setProfessorSessao(atualizada);

      setIsConfigOpen(false);
      setAbaAtiva("ia");
      setModalFeedback({
        aberto: true,
        tipo: "sucesso",
        titulo: "Preferências salvas",
        mensagem: "Preferências salvas com sucesso!",
      });
    } catch {
      setModalFeedback({
        aberto: true,
        tipo: "erro",
        titulo: "Erro ao salvar",
        mensagem: "Não foi possível salvar as preferências.",
      });
    } finally {
      setSalvando(false);
    }
  }

  function handleLogout() {
    const sessao = professorSessao ?? lerSessaoProfessor();
    limparSessaoProfessor();
    localStorage.removeItem("professorLogado");
    if (sessao?.id) {
      localStorage.removeItem(prefsKey(sessao.id));
    }
    window.location.assign("/");
  }

  const iniciais = iniciaisDoProfessor(nome || professorSessao?.nome || "P");

  return (
    <>
      <button
        type="button"
        onClick={() => setIsConfigOpen(true)}
        aria-label="Abrir configurações"
        className="text-zinc-500 hover:text-white transition-colors shrink-0 cursor-pointer"
      >
        <Settings className="w-4 h-4" />
      </button>

      {isConfigOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="config-titulo"
            className="bg-[#0f1117] border border-gray-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-gray-800 shrink-0">
              <div>
                <h2
                  id="config-titulo"
                  className="text-lg font-semibold text-white tracking-tight"
                >
                  Configurações & Preferências
                </h2>
                <p className="text-sm text-zinc-400 mt-1">
                  Personalize a IA, critérios de notas e sua rotina.
                </p>
              </div>
              <button
                type="button"
                onClick={fecharModal}
                disabled={salvando}
                aria-label="Fechar"
                className="text-zinc-500 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-zinc-800 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-1 px-4 pt-3 overflow-x-auto border-b border-gray-800 shrink-0 scrollbar-none">
              {ABAS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setAbaAtiva(id)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap rounded-t-lg border-b-2 transition-colors cursor-pointer ${
                    abaAtiva === id
                      ? "border-white text-white bg-zinc-900/60"
                      : "border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  {label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {carregandoPrefs ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Carregando preferências...
                </div>
              ) : (
                <>
                  {abaAtiva === "ia" && (
                    <div className="flex flex-col gap-6">
                      <div>
                        <label className="text-sm font-medium text-white">
                          Tom das análises
                        </label>
                        <p className="text-xs text-zinc-500 mt-0.5 mb-3">
                          Define o estilo das recomendações do assistente.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {TOM_OPCOES.map((opcao) => (
                            <button
                              key={opcao.value}
                              type="button"
                              onClick={() => setTomIA(opcao.value)}
                              className={`text-left rounded-xl border px-3.5 py-3 transition-colors cursor-pointer ${
                                tomIA === opcao.value
                                  ? "border-white/40 bg-zinc-900"
                                  : "border-gray-800 bg-black/30 hover:border-gray-700"
                              }`}
                            >
                              <p className="text-sm font-medium text-white">
                                {opcao.label}
                              </p>
                              <p className="text-xs text-zinc-500 mt-1 leading-snug">
                                {opcao.desc}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <label
                              htmlFor="regua-evasao"
                              className="text-sm font-medium text-white"
                            >
                              Régua de alerta de evasão
                            </label>
                            <p className="text-xs text-zinc-500 mt-0.5">
                              Avisar ao atingir {reguaEvasao}% de faltas
                            </p>
                          </div>
                          <span className="text-sm font-semibold text-white tabular-nums">
                            {reguaEvasao}%
                          </span>
                        </div>
                        <input
                          id="regua-evasao"
                          type="range"
                          min={5}
                          max={50}
                          step={1}
                          value={reguaEvasao}
                          onChange={(e) =>
                            setReguaEvasao(Number(e.target.value))
                          }
                          className="w-full accent-white cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
                          <span>5%</span>
                          <span>50%</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {abaAtiva === "avaliacoes" && (
                    <div className="flex flex-col gap-6">
                      <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-800 bg-black/30 px-4 py-3.5">
                        <div>
                          <p className="text-sm font-medium text-white">
                            Travar edição de notas após publicação oficial
                          </p>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            Impede alterações depois que as notas forem
                            publicadas.
                          </p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={travarEdicaoNotas}
                          onClick={() => setTravarEdicaoNotas((v) => !v)}
                          className={`relative w-11 h-6 rounded-full transition-colors shrink-0 cursor-pointer ${
                            travarEdicaoNotas ? "bg-white" : "bg-zinc-700"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform ${
                              travarEdicaoNotas
                                ? "translate-x-5 bg-black"
                                : "translate-x-0 bg-zinc-400"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  )}

                  {abaAtiva === "notificacoes" && (
                    <div className="flex flex-col gap-6">
                      <div>
                        <label className="text-sm font-medium text-white">
                          Dias de Atendimento
                        </label>
                        <p className="text-xs text-zinc-500 mt-0.5 mb-3">
                          Selecione os dias em que você atende alunos.
                        </p>
                        <div className="flex items-center gap-2">
                          {DIAS_ATENDIMENTO_OPCOES.map(({ valor, label }) => {
                            const ativo = diasAtendimento.includes(valor);
                            return (
                              <button
                                key={valor}
                                type="button"
                                aria-pressed={ativo}
                                onClick={() => toggleDiaAtendimento(valor)}
                                className={`flex-1 rounded-lg px-2 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                                  ativo
                                    ? "bg-white text-black border border-white"
                                    : "bg-transparent text-zinc-400 border border-gray-800 hover:border-zinc-600 hover:text-zinc-200"
                                }`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-white">
                          Horário de resposta a alunos
                        </label>
                        <p className="text-xs text-zinc-500 mt-0.5 mb-3">
                          Janela em que você costuma atender mensagens.
                        </p>
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <label
                              htmlFor="atendimento-de"
                              className="text-xs text-zinc-400 mb-1.5 block"
                            >
                              De
                            </label>
                            <input
                              id="atendimento-de"
                              type="time"
                              value={atendimentoDe}
                              onChange={(e) =>
                                setAtendimentoDe(e.target.value)
                              }
                              className="w-full rounded-lg bg-black/40 border border-gray-800 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-600"
                            />
                          </div>
                          <span className="text-zinc-600 mt-5">até</span>
                          <div className="flex-1">
                            <label
                              htmlFor="atendimento-ate"
                              className="text-xs text-zinc-400 mb-1.5 block"
                            >
                              Até
                            </label>
                            <input
                              id="atendimento-ate"
                              type="time"
                              value={atendimentoAte}
                              onChange={(e) =>
                                setAtendimentoAte(e.target.value)
                              }
                              className="w-full rounded-lg bg-black/40 border border-gray-800 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-600"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <p className="text-sm font-medium text-white mb-1">
                          Notificações por e-mail
                        </p>

                        <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-800 bg-black/30 px-4 py-3.5">
                          <div>
                            <p className="text-sm text-zinc-200">
                              Mensagens não lidas
                            </p>
                            <p className="text-xs text-zinc-500 mt-0.5">
                              Receber e-mail quando houver mensagens pendentes.
                            </p>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={notificarMensagens}
                            onClick={() =>
                              setNotificarMensagens((v) => !v)
                            }
                            className={`relative w-11 h-6 rounded-full transition-colors shrink-0 cursor-pointer ${
                              notificarMensagens ? "bg-white" : "bg-zinc-700"
                            }`}
                          >
                            <span
                              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform ${
                                notificarMensagens
                                  ? "translate-x-5 bg-black"
                                  : "translate-x-0 bg-zinc-400"
                              }`}
                            />
                          </button>
                        </div>

                        <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-800 bg-black/30 px-4 py-3.5">
                          <div>
                            <p className="text-sm text-zinc-200">
                              Alertas de risco
                            </p>
                            <p className="text-xs text-zinc-500 mt-0.5">
                              Avisos de alunos em risco de evasão ou reprovação.
                            </p>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={notificarAlertas}
                            onClick={() => setNotificarAlertas((v) => !v)}
                            className={`relative w-11 h-6 rounded-full transition-colors shrink-0 cursor-pointer ${
                              notificarAlertas ? "bg-white" : "bg-zinc-700"
                            }`}
                          >
                            <span
                              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform ${
                                notificarAlertas
                                  ? "translate-x-5 bg-black"
                                  : "translate-x-0 bg-zinc-400"
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {abaAtiva === "perfil" && (
                    <div className="flex flex-col gap-5">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center text-base font-semibold text-white shrink-0">
                          {iniciais || "P"}
                        </div>
                        <div>
                          <p className="text-base font-medium text-white">
                            {nome ? `Prof. ${nome}` : "Perfil docente"}
                          </p>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            Conta docente ativa
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3">
                        <div>
                          <label
                            htmlFor="perfil-nome"
                            className="text-xs text-zinc-400 mb-1.5 block"
                          >
                            Nome
                          </label>
                          <input
                            id="perfil-nome"
                            type="text"
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            className="w-full rounded-lg bg-black/40 border border-gray-800 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-600"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="perfil-departamento"
                            className="text-xs text-zinc-400 mb-1.5 block"
                          >
                            Departamento vinculado
                          </label>
                          <input
                            id="perfil-departamento"
                            type="text"
                            value={departamento}
                            onChange={(e) => setDepartamento(e.target.value)}
                            className="w-full rounded-lg bg-black/40 border border-gray-800 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-600"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="perfil-titulacao"
                            className="text-xs text-zinc-400 mb-1.5 block"
                          >
                            Titulação
                          </label>
                          <input
                            id="perfil-titulacao"
                            type="text"
                            value={titulacao}
                            onChange={(e) => setTitulacao(e.target.value)}
                            className="w-full rounded-lg bg-black/40 border border-gray-800 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-600"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-gray-800 shrink-0 bg-[#0f1117]">
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-red-400 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sair da Conta (Logout)
              </button>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={fecharModal}
                  disabled={salvando}
                  className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void handleSalvar()}
                  disabled={salvando || carregandoPrefs}
                  className="px-4 py-2 rounded-lg bg-white text-black text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[160px] justify-center"
                >
                  {salvando ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Preferências"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
