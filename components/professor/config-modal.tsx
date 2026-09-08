"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

type AbaAtiva = "ia" | "avaliacoes" | "perfil" | "notificacoes";
type TomIa = "direto" | "pedagogico" | "motivacional";

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

export function ProfessorSettingsControl() {
  const router = useRouter();

  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>("ia");
  const [tomIa, setTomIa] = useState<TomIa>("direto");
  const [sensibilidadeFaltas, setSensibilidadeFaltas] = useState(25);
  const [pesoN1, setPesoN1] = useState(4);
  const [pesoN2, setPesoN2] = useState(6);
  const [travarNotas, setTravarNotas] = useState(false);
  const [emailNotif, setEmailNotif] = useState(true);
  const [alertaRiscoNotif, setAlertaRiscoNotif] = useState(true);
  const [horarioInicio, setHorarioInicio] = useState("08:00");
  const [horarioFim, setHorarioFim] = useState("18:00");
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

  const somaPesos = pesoN1 + pesoN2;
  const pesosValidos = somaPesos === 10;

  function fecharModal() {
    if (salvando) return;
    setIsConfigOpen(false);
    setAbaAtiva("ia");
  }

  function fecharFeedback() {
    setModalFeedback((prev) => ({ ...prev, aberto: false }));
  }

  async function handleSalvar() {
    if (!pesosValidos) {
      setAbaAtiva("avaliacoes");
      return;
    }

    setSalvando(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setSalvando(false);
    setIsConfigOpen(false);
    setAbaAtiva("ia");
    setModalFeedback({
      aberto: true,
      tipo: "sucesso",
      titulo: "Preferências salvas",
      mensagem: "Preferências salvas com sucesso!",
    });
  }

  function handleLogout() {
    router.push("/");
  }

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
            {/* Cabeçalho */}
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

            {/* Abas */}
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

            {/* Conteúdo */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
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
                          onClick={() => setTomIa(opcao.value)}
                          className={`text-left rounded-xl border px-3.5 py-3 transition-colors cursor-pointer ${
                            tomIa === opcao.value
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
                          htmlFor="sensibilidade-faltas"
                          className="text-sm font-medium text-white"
                        >
                          Régua de alerta de evasão
                        </label>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          Avisar ao atingir {sensibilidadeFaltas}% de faltas
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-white tabular-nums">
                        {sensibilidadeFaltas}%
                      </span>
                    </div>
                    <input
                      id="sensibilidade-faltas"
                      type="range"
                      min={5}
                      max={50}
                      step={1}
                      value={sensibilidadeFaltas}
                      onChange={(e) =>
                        setSensibilidadeFaltas(Number(e.target.value))
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
                  <div>
                    <label className="text-sm font-medium text-white">
                      Pesos das avaliações
                    </label>
                    <p className="text-xs text-zinc-500 mt-0.5 mb-3">
                      A soma de N1 + N2 deve ser igual a 10.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="peso-n1"
                          className="text-xs text-zinc-400 mb-1.5 block"
                        >
                          Peso N1
                        </label>
                        <input
                          id="peso-n1"
                          type="number"
                          min={0}
                          max={10}
                          step={1}
                          value={pesoN1}
                          onChange={(e) =>
                            setPesoN1(Math.max(0, Number(e.target.value) || 0))
                          }
                          className="w-full rounded-lg bg-black/40 border border-gray-800 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-600"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="peso-n2"
                          className="text-xs text-zinc-400 mb-1.5 block"
                        >
                          Peso N2
                        </label>
                        <input
                          id="peso-n2"
                          type="number"
                          min={0}
                          max={10}
                          step={1}
                          value={pesoN2}
                          onChange={(e) =>
                            setPesoN2(Math.max(0, Number(e.target.value) || 0))
                          }
                          className="w-full rounded-lg bg-black/40 border border-gray-800 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-600"
                        />
                      </div>
                    </div>
                    <p
                      className={`text-xs mt-2 ${
                        pesosValidos ? "text-emerald-400/80" : "text-amber-400/90"
                      }`}
                    >
                      Soma atual: {somaPesos}
                      {pesosValidos ? " ✓" : " — ajuste para totalizar 10"}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-800 bg-black/30 px-4 py-3.5">
                    <div>
                      <p className="text-sm font-medium text-white">
                        Travar edição de notas após publicação oficial
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Impede alterações depois que as notas forem publicadas.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={travarNotas}
                      onClick={() => setTravarNotas((v) => !v)}
                      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 cursor-pointer ${
                        travarNotas ? "bg-white" : "bg-zinc-700"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform ${
                          travarNotas
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
                      Horário de resposta a alunos
                    </label>
                    <p className="text-xs text-zinc-500 mt-0.5 mb-3">
                      Janela em que você costuma atender mensagens.
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <label
                          htmlFor="horario-inicio"
                          className="text-xs text-zinc-400 mb-1.5 block"
                        >
                          De
                        </label>
                        <input
                          id="horario-inicio"
                          type="time"
                          value={horarioInicio}
                          onChange={(e) => setHorarioInicio(e.target.value)}
                          className="w-full rounded-lg bg-black/40 border border-gray-800 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-600"
                        />
                      </div>
                      <span className="text-zinc-600 mt-5">até</span>
                      <div className="flex-1">
                        <label
                          htmlFor="horario-fim"
                          className="text-xs text-zinc-400 mb-1.5 block"
                        >
                          Até
                        </label>
                        <input
                          id="horario-fim"
                          type="time"
                          value={horarioFim}
                          onChange={(e) => setHorarioFim(e.target.value)}
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
                        aria-checked={emailNotif}
                        onClick={() => setEmailNotif((v) => !v)}
                        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 cursor-pointer ${
                          emailNotif ? "bg-white" : "bg-zinc-700"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform ${
                            emailNotif
                              ? "translate-x-5 bg-black"
                              : "translate-x-0 bg-zinc-400"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-800 bg-black/30 px-4 py-3.5">
                      <div>
                        <p className="text-sm text-zinc-200">Alertas de risco</p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          Avisos de alunos em risco de evasão ou reprovação.
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={alertaRiscoNotif}
                        onClick={() => setAlertaRiscoNotif((v) => !v)}
                        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 cursor-pointer ${
                          alertaRiscoNotif ? "bg-white" : "bg-zinc-700"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform ${
                            alertaRiscoNotif
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
                      RL
                    </div>
                    <div>
                      <p className="text-base font-medium text-white">
                        Prof. Roberto Lima
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Conta docente ativa
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-800 bg-black/30 divide-y divide-gray-800">
                    <div className="px-4 py-3 flex justify-between gap-3">
                      <span className="text-xs text-zinc-500">Nome</span>
                      <span className="text-sm text-white text-right">
                        Roberto Lima
                      </span>
                    </div>
                    <div className="px-4 py-3 flex justify-between gap-3">
                      <span className="text-xs text-zinc-500">
                        Departamento vinculado
                      </span>
                      <span className="text-sm text-white text-right">
                        Tecnologia
                      </span>
                    </div>
                    <div className="px-4 py-3 flex justify-between gap-3">
                      <span className="text-xs text-zinc-500">Titulação</span>
                      <span className="text-sm text-white text-right">
                        Mestre em Ciência da Computação
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="self-start px-4 py-2 rounded-lg border border-gray-800 bg-zinc-900/50 text-sm text-zinc-300 hover:text-white hover:border-zinc-600 transition-colors cursor-pointer"
                  >
                    Redefinir Senha
                  </button>
                </div>
              )}
            </div>

            {/* Rodapé */}
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
                  onClick={handleSalvar}
                  disabled={salvando || !pesosValidos}
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
