"use client";

import { useState, useEffect } from "react";
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
  Activity,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type TipoRegistro = "Aluno" | "Professor";

type AtividadeRecente = {
  id: string | number;
  nome: string;
  tipo: TipoRegistro;
  identificacao: string;
  data: string;
  status: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatarDataBR(isoString: string | null): string {
  if (!isoString) return "—";
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function statusClass(status: string | null) {
  const s = (status ?? "").toLowerCase();
  if (s.includes("pendente") || s.includes("inativo")) {
    return "bg-amber-950 text-amber-400 border-amber-900/50";
  }
  return "bg-green-950 text-green-400 border-green-900/50";
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral",              href: "/adm/dashboard",              active: true  },
  { icon: Users,           label: "Gestão de Alunos",         href: "/adm/dashboard/alunos",       active: false },
  { icon: GraduationCap,   label: "Gestão de Professores",    href: "/adm/dashboard/professores",  active: false },
  { icon: BookOpen,        label: "Turmas e Matrículas",      href: "/adm/dashboard/turmas",       active: false },
  { icon: Settings,        label: "Configurações do Sistema", href: "/adm/dashboard/configuracoes",active: false },
];

// ─── Componente ───────────────────────────────────────────────────────────────

export default function AdmDashboard() {
  const [totalAlunos,      setTotalAlunos]      = useState<number>(0);
  const [totalProfessores, setTotalProfessores] = useState<number>(0);
  const [turmasAtivas,     setTurmasAtivas]     = useState<number>(0);
  const [recentActivity,   setRecentActivity]   = useState<AtividadeRecente[]>([]);
  const [carregando,       setCarregando]       = useState(true);

  // ── Fetch principal ────────────────────────────────────────────────────────
  async function fetchDashboardData() {
    setCarregando(true);

    try {
      const [
        resAlunos,
        resProfessores,
        resTurmas,
        resUltimosAlunos,
        resUltimosProfessores,
      ] = await Promise.all([
        // Contadores
        supabase.from("alunos").select("*", { count: "exact", head: true }),
        supabase.from("professores").select("*", { count: "exact", head: true }),
        supabase
          .from("turmas")
          .select("*", { count: "exact", head: true })
          .neq("status", "Fechada"),

        // Últimos 5 alunos
        supabase
          .from("alunos")
          .select("id, nome, ra, created_at, status")
          .order("created_at", { ascending: false })
          .limit(5),

        // Últimos 5 professores
        supabase
          .from("professores")
          .select("id, nome, matricula, created_at, status")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      // ── Contadores ───────────────────────────────────────────────────────
      if (resAlunos.error)
        console.error("Erro (alunos count):", resAlunos.error.message);
      if (resProfessores.error)
        console.error("Erro (professores count):", resProfessores.error.message);
      if (resTurmas.error)
        console.error("Erro (turmas count):", resTurmas.error.message);

      setTotalAlunos(resAlunos.count ?? 0);
      setTotalProfessores(resProfessores.count ?? 0);
      setTurmasAtivas(resTurmas.count ?? 0);

      // ── Merge e normalização da tabela de atividade ──────────────────────
      const alunosNorm: AtividadeRecente[] = (resUltimosAlunos.data ?? []).map(
        (a) => ({
          id:            a.id,
          nome:          a.nome  ?? "—",
          tipo:          "Aluno" as TipoRegistro,
          identificacao: a.ra    ? `RA ${a.ra}` : "—",
          data:          a.created_at,
          status:        a.status ?? "Ativo",
        })
      );

      const professoresNorm: AtividadeRecente[] = (
        resUltimosProfessores.data ?? []
      ).map((p) => ({
        id:            p.id,
        nome:          p.nome      ?? "—",
        tipo:          "Professor" as TipoRegistro,
        identificacao: p.matricula ? `MAT ${p.matricula}` : "—",
        data:          p.created_at,
        status:        p.status    ?? "Ativo",
      }));

      // Juntar, ordenar por data desc, pegar os 5 mais recentes
      const merged = [...alunosNorm, ...professoresNorm]
        .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
        .slice(0, 5);

      setRecentActivity(merged);
    } catch (err) {
      console.error("Falha geral no fetchDashboardData:", err);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // ── Cards de métricas (dinâmicos) ─────────────────────────────────────────
  const metricas = [
    {
      label:      "Total de Alunos",
      valor:      carregando ? "—" : totalAlunos,
      extra:      "Total de matriculados",
      extraClass: "text-zinc-400",
      icon:       Users,
      badge:      false,
    },
    {
      label:      "Corpo Docente",
      valor:      carregando ? "—" : totalProfessores,
      extra:      "Registros ativos",
      extraClass: "text-zinc-400",
      icon:       GraduationCap,
      badge:      false,
    },
    {
      label:      "Turmas Ativas",
      valor:      carregando ? "—" : turmasAtivas,
      extra:      "Excluindo turmas fechadas",
      extraClass: "text-zinc-400",
      icon:       BookOpen,
      badge:      false,
    },
    {
      label:      "Saúde do Sistema",
      valor:      "100%",
      extra:      "Online",
      extraClass: "text-green-400",
      icon:       Activity,
      badge:      true,
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">

      {/* ══════════════════════════════
          SIDEBAR
      ══════════════════════════════ */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-zinc-950 border-r border-zinc-800">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-zinc-800">
          <div className="w-8 h-8 bg-gradient-to-br from-zinc-800 to-zinc-950 border border-zinc-700/50 shadow-[0_0_15px_rgba(255,255,255,0.05)] flex items-center justify-center rounded-lg shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="text-sm tracking-tight">
            <span className="text-white font-bold">UniClass</span>
            <span className="text-zinc-400 font-light">Tech</span>
          </span>
        </div>

        {/* Perfil ADM */}
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

        {/* Nav */}
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

        {/* Logout */}
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

      {/* ══════════════════════════════
          MAIN CONTENT
      ══════════════════════════════ */}
      <main className="flex-1 overflow-y-auto bg-black">
        <div className="max-w-6xl mx-auto p-8">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Painel de Controle ADM
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Visão global da infraestrutura acadêmica.
            </p>
          </div>

          {/* ── Cards de Métricas ─────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {metricas.map((m) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.label}
                  className="p-5 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-zinc-500 uppercase tracking-widest">
                      {m.label}
                    </p>
                    <Icon className="w-4 h-4 text-zinc-600" />
                  </div>

                  <div className="flex items-center gap-2">
                    {carregando && !m.badge ? (
                      <div className="h-8 w-16 rounded-md bg-zinc-800 animate-pulse" />
                    ) : (
                      <p className="text-3xl font-semibold tracking-tight text-white">
                        {m.valor}
                      </p>
                    )}
                    {m.badge && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border bg-green-950 text-green-400 border-green-900/50">
                        Online
                      </span>
                    )}
                  </div>

                  {!m.badge && (
                    <p className={`text-xs ${m.extraClass}`}>{m.extra}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Tabela Últimos Cadastros e Matrículas ─────────────────────── */}
          <div className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">
                Últimos Cadastros e Matrículas
              </h2>
              {carregando && (
                <span className="text-xs text-zinc-500 animate-pulse">
                  Carregando...
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[640px]">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="px-6 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest">
                      Usuário
                    </th>
                    <th className="px-4 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest">
                      Tipo
                    </th>
                    <th className="px-4 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest">
                      RA / Matrícula
                    </th>
                    <th className="px-4 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest">
                      Data
                    </th>
                    <th className="px-6 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-widest">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {/* Skeleton de carregamento */}
                  {carregando ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-zinc-800">
                        {Array.from({ length: 5 }).map((__, j) => (
                          <td key={j} className="px-6 py-4">
                            <div className="h-3 rounded bg-zinc-800 animate-pulse w-3/4" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : recentActivity.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-10 text-sm text-zinc-500 text-center"
                      >
                        Nenhum registro recente encontrado.
                      </td>
                    </tr>
                  ) : (
                    recentActivity.map((item) => (
                      <tr
                        key={`${item.tipo}-${item.id}`}
                        className="border-b border-zinc-800 last:border-b-0 hover:bg-zinc-900/40 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-white">
                          {item.nome}
                        </td>
                        <td className="px-4 py-4 text-sm text-zinc-400">
                          {item.tipo}
                        </td>
                        <td className="px-4 py-4 text-sm text-zinc-400 font-mono">
                          {item.identificacao}
                        </td>
                        <td className="px-4 py-4 text-sm text-zinc-500">
                          {formatarDataBR(item.data)}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${statusClass(item.status)}`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
