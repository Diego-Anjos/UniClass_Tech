"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Settings,
  LogOut,
  Shield,
  Building2,
  Search,
  Filter,
  UserPlus,
  CalendarDays,
  Sparkles,
  X,
  Layers,
  User,
  AlertTriangle,
} from "lucide-react";

type Turno = "Manhã" | "Noite";
type StatusTurma = "Aberta" | "Em andamento" | "Fechada";
type AbaTurma = "Disciplinas & Professores" | "Lista de Alunos" | "Automação & IA";

type DisciplinaAlocada = {
  nome: string;
  professor: string;
};

type AlunoTurma = {
  ra: string;
  nome: string;
};

type Turma = {
  codigo: string;
  curso: string;
  turno: Turno;
  ocupados: number;
  capacidade: number;
  status: StatusTurma;
  semestre: string;
  disciplinas: DisciplinaAlocada[];
  alunos: AlunoTurma[];
};

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral", href: "/adm/dashboard", active: false },
  {
    icon: Users,
    label: "Gestão de Alunos",
    href: "/adm/dashboard/alunos",
    active: false,
  },
  {
    icon: GraduationCap,
    label: "Gestão de Professores",
    href: "/adm/dashboard/professores",
    active: false,
  },
  {
    icon: BookOpen,
    label: "Turmas e Matrículas",
    href: "/adm/dashboard/turmas",
    active: true,
  },
  { icon: Settings, label: "Configurações do Sistema", href: "/adm/dashboard/configuracoes", active: false },
];

const turmasMock: Turma[] = [
  {
    codigo: "GTI-4A-N",
    curso: "Gestão de Tecnologia da Informação",
    turno: "Noite",
    ocupados: 18,
    capacidade: 40,
    status: "Em andamento",
    semestre: "2026.1",
    disciplinas: [
      { nome: "Banco de Dados", professor: "Prof. Marcos Silva" },
      { nome: "Gestão de Projetos", professor: "Profa. Fernanda Souza" },
      { nome: "Redes de Computadores", professor: "Prof. Roberto Lima" },
    ],
    alunos: [
      { ra: "20261001", nome: "Gustavo Santos" },
      { ra: "20261002", nome: "Ian Meirelles" },
      { ra: "20251045", nome: "Ana Beatriz Costa" },
    ],
  },
  {
    codigo: "ES-3B-M",
    curso: "Engenharia de Software",
    turno: "Manhã",
    ocupados: 35,
    capacidade: 40,
    status: "Em andamento",
    semestre: "2026.1",
    disciplinas: [
      { nome: "Engenharia de Software", professor: "Prof. Roberto Lima" },
      { nome: "Algoritmos Avançados", professor: "Profa. Carla Mendes" },
      { nome: "Arquitetura de Software", professor: "Prof. Paulo Rocha" },
    ],
    alunos: [
      { ra: "20248012", nome: "Pedro Henrique Alves" },
      { ra: "20261077", nome: "Felipe Almeida" },
    ],
  },
  {
    codigo: "GTI-1A-N",
    curso: "Gestão de Tecnologia da Informação",
    turno: "Noite",
    ocupados: 12,
    capacidade: 40,
    status: "Aberta",
    semestre: "2026.1",
    disciplinas: [
      { nome: "Introdução à Computação", professor: "Profa. Fernanda Souza" },
      { nome: "Lógica de Programação", professor: "Profa. Carla Mendes" },
    ],
    alunos: [{ ra: "20261088", nome: "Julia Martins" }],
  },
  {
    codigo: "ES-5A-N",
    curso: "Engenharia de Software",
    turno: "Noite",
    ocupados: 40,
    capacidade: 40,
    status: "Fechada",
    semestre: "2025.2",
    disciplinas: [
      { nome: "TCC I", professor: "Prof. Roberto Lima" },
      { nome: "Qualidade de Software", professor: "Profa. Carla Mendes" },
    ],
    alunos: [
      { ra: "20231001", nome: "Lucas Ferreira" },
      { ra: "20231022", nome: "Camila Ribeiro" },
    ],
  },
  {
    codigo: "ES-2A-M",
    curso: "Engenharia de Software",
    turno: "Manhã",
    ocupados: 8,
    capacidade: 35,
    status: "Aberta",
    semestre: "2026.1",
    disciplinas: [
      { nome: "Estruturas de Dados", professor: "Profa. Fernanda Souza" },
      { nome: "Banco de Dados", professor: "Prof. Marcos Silva" },
    ],
    alunos: [],
  },
  {
    codigo: "GTI-3B-N",
    curso: "Gestão de Tecnologia da Informação",
    turno: "Noite",
    ocupados: 28,
    capacidade: 40,
    status: "Em andamento",
    semestre: "2026.1",
    disciplinas: [
      { nome: "Governança de TI", professor: "Prof. André Barbosa" },
      { nome: "Segurança da Informação", professor: "Prof. Marcos Silva" },
    ],
    alunos: [
      { ra: "20249033", nome: "Mariana Oliveira" },
      { ra: "20249044", nome: "Bruno Costa" },
    ],
  },
];

const statusBadge: Record<StatusTurma, string> = {
  Aberta: "bg-green-950 text-green-400 border-green-900/50",
  "Em andamento": "bg-sky-950 text-sky-400 border-sky-900/50",
  Fechada: "bg-zinc-800 text-zinc-400 border-zinc-700",
};

const abas: AbaTurma[] = [
  "Disciplinas & Professores",
  "Lista de Alunos",
  "Automação & IA",
];

function ocupacaoPercentual(ocupados: number, capacidade: number) {
  if (capacidade <= 0) return 0;
  return Math.round((ocupados / capacidade) * 100);
}

function corBarraOcupacao(pct: number) {
  if (pct >= 90) return "bg-red-500";
  if (pct >= 70) return "bg-amber-500";
  if (pct >= 40) return "bg-sky-500";
  return "bg-zinc-500";
}

export default function TurmasMatriculasPage() {
  const [turmas] = useState<Turma[]>(turmasMock);
  const [busca, setBusca] = useState("");
  const [filtroTurno, setFiltroTurno] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [turmaSelecionada, setTurmaSelecionada] = useState<Turma | null>(null);
  const [drawerAberto, setDrawerAberto] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<AbaTurma>("Disciplinas & Professores");

  const turmasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return turmas.filter((turma) => {
      const matchBusca =
        !termo ||
        turma.codigo.toLowerCase().includes(termo) ||
        turma.curso.toLowerCase().includes(termo);
      const matchTurno = filtroTurno === "todos" || turma.turno === filtroTurno;
      const matchStatus = filtroStatus === "todos" || turma.status === filtroStatus;
      return matchBusca && matchTurno && matchStatus;
    });
  }, [turmas, busca, filtroTurno, filtroStatus]);

  function abrirGestao(turma: Turma) {
    setTurmaSelecionada(turma);
    setAbaAtiva("Disciplinas & Professores");
    setDrawerAberto(true);
  }

  function fecharGestao() {
    setDrawerAberto(false);
    window.setTimeout(() => setTurmaSelecionada(null), 300);
  }

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      {/* SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-zinc-950 border-r border-zinc-800">
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-zinc-800">
          <div className="w-8 h-8 bg-gradient-to-br from-zinc-800 to-zinc-950 border border-zinc-700/50 shadow-[0_0_15px_rgba(255,255,255,0.05)] flex items-center justify-center rounded-lg shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="text-sm tracking-tight">
            <span className="text-white font-bold">UniClass</span>
            <span className="text-zinc-400 font-light">Tech</span>
          </span>
        </div>

        <div className="px-4 py-5 border-b border-zinc-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-zinc-300" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">Secretaria Acadêmica</p>
              <p className="text-xs text-zinc-500">Acesso Root</p>
            </div>
          </div>
        </div>

        <nav className="flex flex-col gap-0.5 px-2 py-4 flex-1">
          {navItems.map(({ icon: Icon, label, href, active }) =>
            href.startsWith("/adm") ? (
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
            href="/adm/login"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-500 hover:bg-zinc-900 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sair
          </a>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 overflow-y-auto bg-black relative">
        <div className="max-w-6xl mx-auto p-8">
          {/* Header */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                Turmas e Matrículas
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                Gerencie turmas, ocupação de vagas e automações acadêmicas.
              </p>
            </div>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              Abrir Nova Turma
            </button>
          </div>

          {/* Barra de ferramentas */}
          <div className="mb-6 rounded-xl bg-zinc-950 border border-zinc-800 p-4">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por código da turma ou curso..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-zinc-600 transition-colors"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <div className="relative min-w-[160px]">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                  <select
                    value={filtroTurno}
                    onChange={(e) => setFiltroTurno(e.target.value)}
                    className="w-full appearance-none pl-10 pr-8 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white outline-none focus:border-zinc-600 transition-colors"
                  >
                    <option value="todos">Todos os turnos</option>
                    <option value="Manhã">Manhã</option>
                    <option value="Noite">Noite</option>
                  </select>
                </div>

                <div className="relative min-w-[180px]">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                  <select
                    value={filtroStatus}
                    onChange={(e) => setFiltroStatus(e.target.value)}
                    className="w-full appearance-none pl-10 pr-8 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white outline-none focus:border-zinc-600 transition-colors"
                  >
                    <option value="todos">Todos os status</option>
                    <option value="Aberta">Aberta</option>
                    <option value="Em andamento">Em andamento</option>
                    <option value="Fechada">Fechada</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Tabela */}
          <div className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Turmas Cadastradas</h2>
              <span className="text-xs text-zinc-500">
                {turmasFiltradas.length} registro
                {turmasFiltradas.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[820px]">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="px-6 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest">
                      Código da Turma
                    </th>
                    <th className="px-4 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest">
                      Curso
                    </th>
                    <th className="px-4 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest">
                      Turno
                    </th>
                    <th className="px-4 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest">
                      Ocupação
                    </th>
                    <th className="px-6 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {turmasFiltradas.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-sm text-zinc-500"
                      >
                        Nenhuma turma encontrada com os filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    turmasFiltradas.map((turma) => {
                      const pct = ocupacaoPercentual(turma.ocupados, turma.capacidade);
                      return (
                        <tr
                          key={turma.codigo}
                          onClick={() => abrirGestao(turma)}
                          className="border-b border-zinc-800 last:border-b-0 hover:bg-zinc-900/40 transition-colors cursor-pointer"
                        >
                          <td className="px-6 py-4 text-sm font-mono font-medium text-white">
                            {turma.codigo}
                          </td>
                          <td className="px-4 py-4 text-sm text-zinc-400 max-w-[280px]">
                            <span className="line-clamp-1">{turma.curso}</span>
                          </td>
                          <td className="px-4 py-4 text-sm text-zinc-400">{turma.turno}</td>
                          <td className="px-4 py-4 min-w-[160px]">
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-zinc-300">
                                  {turma.ocupados}/{turma.capacidade}
                                </span>
                                <span className="text-zinc-500">{pct}%</span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${corBarraOcupacao(pct)}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${statusBadge[turma.status]}`}
                            >
                              {turma.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Overlay */}
        <button
          type="button"
          aria-label="Fechar gestão da turma"
          onClick={fecharGestao}
          className={`absolute inset-0 bg-black/60 backdrop-blur-[2px] z-40 transition-opacity duration-300 ${
            drawerAberto
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        />

        {/* Drawer */}
        <aside
          className={`absolute right-0 top-0 h-full w-full max-w-md bg-zinc-950 border-l border-zinc-800 z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-out ${
            drawerAberto ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {turmaSelecionada && (
            <>
              <div className="px-6 py-5 border-b border-zinc-800 flex items-start justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-14 h-14 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                    <Layers className="w-7 h-7 text-zinc-300" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">
                      Gestão da Turma
                    </p>
                    <h3 className="text-lg font-semibold text-white font-mono truncate">
                      {turmaSelecionada.codigo}
                    </h3>
                    <p className="text-sm text-zinc-400 mt-0.5 line-clamp-2">
                      {turmaSelecionada.curso}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={fecharGestao}
                  className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-4 pt-4 border-b border-zinc-800">
                <div className="flex gap-1 overflow-x-auto">
                  {abas.map((aba) => (
                    <button
                      key={aba}
                      type="button"
                      onClick={() => setAbaAtiva(aba)}
                      className={`px-3 py-2.5 text-xs font-medium rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
                        abaAtiva === aba
                          ? "text-white border-white bg-zinc-900/50"
                          : "text-zinc-500 border-transparent hover:text-zinc-300"
                      }`}
                    >
                      {aba}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {abaAtiva === "Disciplinas & Professores" && (
                  <div className="space-y-4">
                    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-3">
                      <Campo label="Turno" valor={turmaSelecionada.turno} />
                      <Campo label="Semestre" valor={turmaSelecionada.semestre} />
                      <Campo label="Status" valor={turmaSelecionada.status} />
                      <Campo
                        label="Ocupação"
                        valor={`${turmaSelecionada.ocupados}/${turmaSelecionada.capacidade} (${ocupacaoPercentual(turmaSelecionada.ocupados, turmaSelecionada.capacidade)}%)`}
                      />
                    </div>

                    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
                      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">
                        Disciplinas e docentes
                      </p>
                      <ul className="space-y-3">
                        {turmaSelecionada.disciplinas.map((d) => (
                          <li
                            key={d.nome}
                            className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-black/30 px-3 py-3"
                          >
                            <BookOpen className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-white">{d.nome}</p>
                              <p className="text-xs text-zinc-500 mt-0.5">{d.professor}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {abaAtiva === "Lista de Alunos" && (
                  <div className="space-y-4">
                    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-xs text-zinc-500 uppercase tracking-widest">
                          Matriculados
                        </p>
                        <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
                          <Users className="w-3.5 h-3.5" />
                          {turmaSelecionada.alunos.length} aluno
                          {turmaSelecionada.alunos.length !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {turmaSelecionada.alunos.length === 0 ? (
                        <p className="text-sm text-zinc-500 py-4 text-center">
                          Nenhum aluno matriculado nesta turma.
                        </p>
                      ) : (
                        <ul className="divide-y divide-zinc-800">
                          {turmaSelecionada.alunos.map((aluno) => (
                            <li
                              key={aluno.ra}
                              className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                            >
                              <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                                <User className="w-4 h-4 text-zinc-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-white truncate">
                                  {aluno.nome}
                                </p>
                                <p className="text-xs text-zinc-500 font-mono">
                                  RA {aluno.ra}
                                </p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}

                {abaAtiva === "Automação & IA" && (
                  <div className="space-y-4">
                    <button
                      type="button"
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors"
                    >
                      <CalendarDays className="w-4 h-4" />
                      Sincronizar Google Calendar (Alunos e Docentes)
                    </button>

                    <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
                      <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-zinc-400" />
                        <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
                          Painel Preditivo · Groq / Llama 3
                        </p>
                      </div>

                      <div className="p-4 space-y-4">
                        <div className="rounded-lg bg-black/40 border-l-4 border-orange-500 border border-orange-900/40 p-4 flex gap-3">
                          <div className="w-9 h-9 rounded-lg bg-orange-950/60 border border-orange-900/50 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-4 h-4 text-orange-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wide text-orange-400 mb-1.5">
                              Análise de Ocupação
                            </p>
                            <p className="text-sm text-zinc-300 leading-relaxed">
                              Turma operando com 45% da capacidade. O modelo preditivo
                              sugere fusão com a turma do período noturno para otimização
                              de custos.
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3">
                            <p className="text-[11px] text-zinc-500 uppercase tracking-widest">
                              Capacidade
                            </p>
                            <p className="text-lg font-semibold text-orange-400 mt-1">
                              45%
                            </p>
                          </div>
                          <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3">
                            <p className="text-[11px] text-zinc-500 uppercase tracking-widest">
                              Sugestão
                            </p>
                            <p className="text-sm font-semibold text-white mt-1.5">
                              Fusão noturna
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </aside>
      </main>
    </div>
  );
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-[11px] text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-sm text-zinc-200">{valor}</p>
    </div>
  );
}
