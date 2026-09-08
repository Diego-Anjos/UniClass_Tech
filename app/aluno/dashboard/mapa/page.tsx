"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  ClipboardList,
  CalendarCheck,
  BookOpen,
  Map,
  LogOut,
  Camera,
  Sparkles,
  GraduationCap,
  MessageSquare,
  Monitor,
  Laptop,
  Cpu,
  Clock,
  MapPin,
  Coffee,
  Settings,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral", href: "/aluno/dashboard", active: false },
  { icon: ClipboardList, label: "Boletim e Notas", href: "/aluno/dashboard/notas", active: false },
  { icon: CalendarCheck, label: "Frequência", href: "/aluno/dashboard/frequencia", active: false },
  { icon: BookOpen, label: "Grade e Matérias", href: "/aluno/dashboard/grade", active: false },
  { icon: Map, label: "Mapa de Salas e Labs", href: "/aluno/dashboard/mapa", active: true },
  { icon: MessageSquare, label: "Contato", href: "/aluno/dashboard/contato", active: false },
];

type AndarId = "terreo" | "andar1" | "andar2";

interface Ambiente {
  id: string;
  codigo: string;
  nome: string;
  tipo: "sala" | "lab";
  posicao: "norte" | "sul";
  status: "livre" | "ocupado" | "proxima";
  estacoes: number;
  sistema: string;
  softwares: string[];
  horarioOcupacao?: string;
  docente?: string;
}

const ANDARES: { id: AndarId; label: string }[] = [
  { id: "terreo", label: "Térreo" },
  { id: "andar1", label: "1º Andar (Atual)" },
  { id: "andar2", label: "2º Andar" },
];

const ANDAR_LABELS: Record<AndarId, string> = {
  terreo: "Térreo",
  andar1: "1º Andar",
  andar2: "2º Andar",
};

const catalogo: Record<AndarId, Ambiente[]> = {
  terreo: [
    {
      id: "sala01",
      codigo: "Sala 01",
      nome: "Cálculo I",
      tipo: "sala",
      posicao: "norte",
      status: "ocupado",
      estacoes: 40,
      sistema: "—",
      softwares: [],
      horarioOcupacao: "10:20",
      docente: "Prof. Santos",
    },
    {
      id: "lab01",
      codigo: "Lab 01",
      nome: "Laboratório de Informática",
      tipo: "lab",
      posicao: "norte",
      status: "livre",
      estacoes: 25,
      sistema: "Linux Ubuntu",
      softwares: ["Python", "VS Code", "Git"],
    },
    {
      id: "auditorio",
      codigo: "Auditório",
      nome: "Auditório Central",
      tipo: "sala",
      posicao: "sul",
      status: "livre",
      estacoes: 120,
      sistema: "—",
      softwares: ["Projetor 4K", "Sistema de som"],
    },
    {
      id: "secretaria",
      codigo: "Secretaria",
      nome: "Secretaria Acadêmica",
      tipo: "sala",
      posicao: "sul",
      status: "ocupado",
      estacoes: 0,
      sistema: "—",
      softwares: [],
      horarioOcupacao: "08:00–18:00",
    },
  ],
  andar1: [
    {
      id: "sala101",
      codigo: "Sala 101",
      nome: "Cálculo II",
      tipo: "sala",
      posicao: "norte",
      status: "ocupado",
      estacoes: 45,
      sistema: "—",
      softwares: [],
      horarioOcupacao: "13:30",
      docente: "Prof. Silva",
    },
    {
      id: "lab2",
      codigo: "Lab 2",
      nome: "Laboratório de Redes",
      tipo: "lab",
      posicao: "norte",
      status: "livre",
      estacoes: 20,
      sistema: "Linux",
      softwares: ["Cisco Packet Tracer", "Wireshark", "GNS3"],
    },
    {
      id: "lab3",
      codigo: "Lab 3",
      nome: "Banco de Dados",
      tipo: "lab",
      posicao: "sul",
      status: "proxima",
      estacoes: 30,
      sistema: "Windows 11",
      softwares: ["Visual Studio", "SQL Server"],
      horarioOcupacao: "08:00",
      docente: "Prof. Lima",
    },
  ],
  andar2: [
    {
      id: "lab4",
      codigo: "Lab 4",
      nome: "Inteligência Artificial",
      tipo: "lab",
      posicao: "norte",
      status: "livre",
      estacoes: 24,
      sistema: "Linux",
      softwares: ["Python", "TensorFlow", "Jupyter"],
    },
    {
      id: "sala202",
      codigo: "Sala 202",
      nome: "Engenharia de Software",
      tipo: "sala",
      posicao: "norte",
      status: "ocupado",
      estacoes: 40,
      sistema: "—",
      softwares: [],
      horarioOcupacao: "10:20",
      docente: "Prof. Costa",
    },
    {
      id: "labmaker",
      codigo: "Lab Maker",
      nome: "Lab Maker / Robótica",
      tipo: "lab",
      posicao: "sul",
      status: "livre",
      estacoes: 16,
      sistema: "Windows 11",
      softwares: ["Arduino IDE", "Fusion 360", "AutoCAD"],
    },
    {
      id: "estudos",
      codigo: "Sala Estudos",
      nome: "Sala de Estudos Compartilhada",
      tipo: "sala",
      posicao: "sul",
      status: "livre",
      estacoes: 28,
      sistema: "—",
      softwares: ["Wi-Fi", "Tomadas USB"],
    },
  ],
};

const itinerario = [
  { hora: "08:00", label: "Banco de Dados", local: "Lab 3 – 1º Andar", tipo: "aula" as const },
  { hora: "10:00", label: "Intervalo", local: "", tipo: "intervalo" as const },
  { hora: "10:20", label: "Engenharia de Software", local: "Sala 202 – 2º Andar", tipo: "aula" as const },
];

const statusBadge: Record<
  Ambiente["status"],
  { label: string; classes: string; painel: string }
> = {
  livre: {
    label: "Livre",
    classes: "bg-emerald-950 text-emerald-400 border border-emerald-900",
    painel: "bg-emerald-950 text-emerald-400 border border-emerald-900",
  },
  ocupado: {
    label: "Ocupada",
    classes: "bg-zinc-800 text-zinc-400 border border-zinc-700",
    painel: "bg-rose-950/50 text-rose-400 border border-rose-900",
  },
  proxima: {
    label: "Próxima aula",
    classes: "bg-blue-900 text-blue-300 border border-blue-700",
    painel: "bg-blue-950 text-blue-400 border border-blue-900",
  },
};

function iconForAmbiente(ambiente: Ambiente) {
  if (ambiente.tipo === "lab") {
    if (ambiente.nome.toLowerCase().includes("ia") || ambiente.nome.toLowerCase().includes("inteligência")) {
      return Cpu;
    }
    return Laptop;
  }
  return Monitor;
}

export default function AlunoMapaPage() {
  const [andarSelecionado, setAndarSelecionado] = useState<AndarId>("andar1");
  const [ambienteSelecionadoId, setAmbienteSelecionadoId] = useState("lab3");
  const [aiInsight, setAiInsight] = useState("");
  const [isLoadingAi, setIsLoadingAi] = useState(true);

  const ambientesDoAndar = catalogo[andarSelecionado];

  const ambienteAtivo = useMemo(() => {
    const noAndar = ambientesDoAndar.find((a) => a.id === ambienteSelecionadoId);
    if (noAndar) return noAndar;
    return (
      Object.values(catalogo)
        .flat()
        .find((a) => a.id === ambienteSelecionadoId) ?? ambientesDoAndar[0]
    );
  }, [ambientesDoAndar, ambienteSelecionadoId]);

  const alaNorte = ambientesDoAndar.filter((a) => a.posicao === "norte");
  const alaSul = ambientesDoAndar.filter((a) => a.posicao === "sul");

  async function fetchAiMapa(andar: AndarId, salaProxima: string) {
    setIsLoadingAi(true);
    try {
      const response = await fetch("/api/insights/mapa-salas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          andar: ANDAR_LABELS[andar],
          salaProxima,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha na dica do mapa");
      setAiInsight((data.insight as string) ?? "");
    } catch (err) {
      console.error("Erro ao gerar dica do mapa:", err);
      setAiInsight(
        "Consulte os laboratórios com status 'Livre' para estudo prático individual durante seus horários vagos."
      );
    } finally {
      setIsLoadingAi(false);
    }
  }

  useEffect(() => {
    const proxima =
      Object.values(catalogo)
        .flat()
        .find((a) => a.status === "proxima")?.codigo ?? "Lab 3";
    void fetchAiMapa(andarSelecionado, proxima);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleTrocarAndar(andar: AndarId) {
    setAndarSelecionado(andar);
    const primeiro = catalogo[andar][0];
    if (primeiro) {
      setAmbienteSelecionadoId(primeiro.id);
    }
    const proxima =
      Object.values(catalogo)
        .flat()
        .find((a) => a.status === "proxima")?.codigo ?? primeiro?.codigo ?? "Lab 3";
    void fetchAiMapa(andar, proxima);
  }

  function renderAmbienteCard(ambiente: Ambiente) {
    const selecionado = ambiente.id === ambienteSelecionadoId;
    const destaque = selecionado || ambiente.status === "proxima";
    const Icon = iconForAmbiente(ambiente);
    const badge = statusBadge[ambiente.status];

    return (
      <button
        key={ambiente.id}
        type="button"
        onClick={() => setAmbienteSelecionadoId(ambiente.id)}
        className={`relative text-left rounded-lg border p-4 flex flex-col gap-1.5 min-h-[110px] transition-all cursor-pointer overflow-hidden ${
          destaque
            ? "border-blue-500 bg-blue-950/40 shadow-[0_0_24px_rgba(59,130,246,0.18)] hover:border-blue-400"
            : ambiente.status === "livre"
              ? "border-emerald-500/40 bg-zinc-900 hover:border-emerald-400/70"
              : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"
        }`}
      >
        {destaque && (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-transparent pointer-events-none" />
        )}
        <div className="relative flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <p
                className={`text-xs font-semibold uppercase tracking-wider ${
                  destaque
                    ? "text-blue-300"
                    : ambiente.status === "livre"
                      ? "text-emerald-400"
                      : "text-zinc-400"
                }`}
              >
                {ambiente.codigo}
              </p>
              {ambiente.status === "proxima" && (
                <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-900 text-blue-300 border border-blue-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse inline-block" />
                  Próxima aula
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-white truncate">{ambiente.nome}</p>
            {ambiente.horarioOcupacao && (
              <p className={`text-xs mt-0.5 ${destaque ? "text-blue-200" : "text-zinc-500"}`}>
                {ambiente.horarioOcupacao}
                {ambiente.docente ? ` · ${ambiente.docente}` : ""}
              </p>
            )}
            {ambiente.tipo === "lab" && !ambiente.horarioOcupacao && (
              <p className="text-xs text-zinc-500 mt-0.5">{ambiente.estacoes} máquinas</p>
            )}
          </div>
          <Icon
            className={`w-4 h-4 shrink-0 mt-0.5 ${
              destaque ? "text-blue-400" : "text-zinc-600"
            }`}
          />
        </div>
        {ambiente.status !== "proxima" && (
          <span className={`relative self-start mt-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${badge.classes}`}>
            {badge.label}
          </span>
        )}
      </button>
    );
  }

  const IconAtivo = ambienteAtivo ? iconForAmbiente(ambienteAtivo) : Monitor;
  const badgeAtivo = ambienteAtivo ? statusBadge[ambienteAtivo.status] : statusBadge.livre;

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
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-base font-semibold text-white">
                  JS
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-zinc-700 border border-zinc-900 rounded-full flex items-center justify-center cursor-pointer hover:bg-zinc-600 transition-colors">
                  <Camera className="w-2.5 h-2.5 text-zinc-300" />
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">João Silva</p>
                <p className="text-xs text-zinc-500">RA: 12345678</p>
              </div>
            </div>
            <Link
              href="/aluno/dashboard/perfil"
              className="text-zinc-500 hover:text-white transition-colors shrink-0"
            >
              <Settings className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <nav className="flex flex-col gap-0.5 px-2 py-4 flex-1">
          {navItems.map(({ icon: Icon, label, href, active }) => (
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
          ))}
        </nav>

        <div className="px-2 py-4 border-t border-zinc-800">
          <a
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-500 hover:bg-zinc-900 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sair
          </a>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-10">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">
              Mapa de Salas e Laboratórios
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Localize suas aulas e laboratórios disponíveis para estudo.
            </p>
            <div className="flex items-center gap-1 mt-4 p-1 bg-zinc-950 border border-zinc-800 rounded-lg w-fit">
              {ANDARES.map((andar) => (
                <button
                  key={andar.id}
                  type="button"
                  onClick={() => handleTrocarAndar(andar.id)}
                  className={`px-4 py-1.5 rounded-md text-sm transition-colors ${
                    andarSelecionado === andar.id
                      ? "bg-zinc-800 text-white font-medium"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {andar.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-4 p-5 rounded-xl bg-zinc-900/50 border border-zinc-800 mb-6">
            <div className="shrink-0 mt-0.5 w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/50 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-zinc-300" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">
                Dica da IA
              </p>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {isLoadingAi
                  ? "Consultando disponibilidade de salas com IA..."
                  : aiInsight}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3 rounded-2xl bg-[#0c0e14] border border-gray-800/80 overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="text-sm font-semibold">
                  Planta Baixa — {ANDARES.find((a) => a.id === andarSelecionado)?.label}
                </h2>
                <span className="text-xs text-zinc-600">
                  {ambientesDoAndar.length} ambientes
                </span>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-2 gap-3">
                  {alaNorte.map(renderAmbienteCard)}
                </div>

                <div className="border-t border-b border-gray-800 bg-[#12151f]/60 text-[11px] text-gray-500 uppercase tracking-widest py-1 px-4 text-center rounded-md my-4">
                  Corredor Principal
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {alaSul.map(renderAmbienteCard)}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
                <div className="px-5 py-4 border-b border-zinc-800">
                  <h2 className="text-sm font-semibold">Local Selecionado</h2>
                </div>
                {ambienteAtivo && (
                  <div className="px-5 py-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-2xl font-semibold tracking-tight">
                          {ambienteAtivo.codigo}
                        </p>
                        <p className="text-sm text-zinc-400 mt-0.5">{ambienteAtivo.nome}</p>
                      </div>
                      <MapPin className="w-5 h-5 text-zinc-600 shrink-0 mt-1" />
                    </div>
                    <span
                      className={`inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        ambienteAtivo.status === "proxima"
                          ? "bg-blue-950 text-blue-400 border border-blue-900"
                          : badgeAtivo.painel
                      }`}
                    >
                      {ambienteAtivo.status === "proxima"
                        ? "Sua próxima aula"
                        : badgeAtivo.label}
                    </span>

                    <div className="mt-5 flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                          <IconAtivo className="w-3.5 h-3.5 text-zinc-400" />
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500">Estações</p>
                          <p className="text-sm font-medium text-white">
                            {ambienteAtivo.estacoes > 0
                              ? `${ambienteAtivo.estacoes} Máquinas`
                              : "Não aplicável"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                          <Cpu className="w-3.5 h-3.5 text-zinc-400" />
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500">Sistema</p>
                          <p className="text-sm font-medium text-white">
                            {ambienteAtivo.sistema}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                          <Laptop className="w-3.5 h-3.5 text-zinc-400" />
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500">Software</p>
                          <p className="text-sm font-medium text-white">
                            {ambienteAtivo.softwares.length > 0
                              ? ambienteAtivo.softwares.join(", ")
                              : "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
                <div className="px-5 py-4 border-b border-zinc-800">
                  <h2 className="text-sm font-semibold">Itinerário de Hoje</h2>
                </div>
                <div className="px-5 py-4 flex flex-col gap-0">
                  {itinerario.map((item, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${
                            item.tipo === "intervalo"
                              ? "bg-zinc-900 border-zinc-700"
                              : "bg-zinc-800 border-zinc-600"
                          }`}
                        >
                          {item.tipo === "intervalo" ? (
                            <Coffee className="w-3 h-3 text-zinc-500" />
                          ) : (
                            <Clock className="w-3 h-3 text-zinc-400" />
                          )}
                        </div>
                        {i < itinerario.length - 1 && (
                          <div className="w-px flex-1 bg-zinc-800 my-1" />
                        )}
                      </div>

                      <div className="pb-4 min-w-0">
                        <p className="text-xs text-zinc-500 mb-0.5">{item.hora}</p>
                        <p
                          className={`text-sm font-medium ${
                            item.tipo === "intervalo" ? "text-zinc-500" : "text-white"
                          }`}
                        >
                          {item.label}
                        </p>
                        {item.local && (
                          <p className="text-xs text-zinc-500 mt-0.5">{item.local}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
