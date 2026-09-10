"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  ClipboardList,
  CalendarCheck,
  BookOpen,
  Map,
  LogOut,
  Camera,
  GraduationCap,
  Settings,
  User,
  MapPin,
  MessageSquare,
  Pencil,
} from "lucide-react";
import { limparSessaoAluno } from "@/lib/aluno-session";

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral",         href: "/aluno/dashboard",            active: false },
  { icon: ClipboardList,   label: "Boletim e Notas",     href: "/aluno/dashboard/notas",      active: false },
  { icon: CalendarCheck,   label: "Frequência",           href: "/aluno/dashboard/frequencia", active: false },
  { icon: BookOpen,        label: "Grade e Matérias",     href: "/aluno/dashboard/grade",      active: false },
  { icon: Map,             label: "Mapa de Salas e Labs", href: "/aluno/dashboard/mapa",       active: false },
  { icon: MessageSquare,   label: "Contato",              href: "/aluno/dashboard/contato",    active: false },
];

const dadosAcademicos = [
  { label: "RA",              valor: "12345678" },
  { label: "Curso",           valor: "Análise e Desenvolvimento de Sistemas (Tecnólogo)" },
  { label: "Semestre Atual",  valor: "4º Semestre" },
  { label: "Modalidade",      valor: "Presencial – Noturno" },
  { label: "Campus",          valor: "São Paulo – Paulista" },
];

const dadosPessoais = [
  { label: "Nome Completo",        valor: "João Silva" },
  { label: "Data de Nascimento",   valor: "15/08/2001" },
  { label: "CPF",                  valor: "***.456.789-**" },
  { label: "E-mail Institucional", valor: "joao.silva@aluno.uniclasstech.com.br" },
];

const dadosContato = [
  { label: "Celular",        valor: "(11) 99999-9999" },
  { label: "E-mail Pessoal", valor: "joao.silva.dev@gmail.com" },
  { label: "Endereço",       valor: "Avenida Paulista, 1000 – Bela Vista, São Paulo/SP – CEP: 01310-100" },
];

export default function AlunoPerfilPage() {
  const [aluno, setAluno] = useState<{ nome: string; ra: string } | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("alunoLogado");
    if (raw) {
      try {
        const dadosParseados = JSON.parse(raw) as { nome: string; ra: string };
        setAluno(dadosParseados);
      } catch {
        setAluno(null);
      }
    }
  }, []);

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
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-base font-semibold text-white">
                  {aluno?.nome ? aluno.nome.substring(0, 2).toUpperCase() : "UN"}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-zinc-700 border border-zinc-900 rounded-full flex items-center justify-center cursor-pointer hover:bg-zinc-600 transition-colors">
                  <Camera className="w-2.5 h-2.5 text-zinc-300" />
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {aluno?.nome || "Carregando..."}
                </p>
                <p className="text-xs text-zinc-500">
                  RA: {aluno?.ra || "---"}
                </p>
              </div>
            </div>
            <Link href="/aluno/dashboard/perfil" className="text-zinc-500 hover:text-white transition-colors shrink-0">
              <Settings className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Nav */}
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

        {/* Logout */}
        <div className="px-2 py-4 border-t border-zinc-800">
          <a
            href="/"
            onClick={() => limparSessaoAluno()}
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
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 py-10">

          {/* ── Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Meu Perfil</h1>
              <p className="text-sm text-zinc-400 mt-1">
                Gerencie suas informações pessoais e acadêmicas.
              </p>
            </div>
            <button className="flex items-center gap-2 border border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors text-sm rounded-lg px-4 py-2">
              <Pencil className="w-4 h-4" />
              Editar Dados
            </button>
          </div>

          {/* ── Grid de 2 colunas ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

            {/* Seção 1: Dados Acadêmicos */}
            <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-6">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/50 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-4 h-4 text-zinc-300" />
                </div>
                <h2 className="text-sm font-semibold">Dados Acadêmicos</h2>
              </div>
              <div className="flex flex-col gap-4">
                {dadosAcademicos.map((d) => (
                  <div key={d.label}>
                    <p className="text-xs text-zinc-500 uppercase tracking-widest mb-0.5">{d.label}</p>
                    <p className="text-sm text-white">{d.valor}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Seção 2: Informações Pessoais */}
            <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-6">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/50 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-zinc-300" />
                </div>
                <h2 className="text-sm font-semibold">Informações Pessoais</h2>
              </div>

              {/* Avatar grande + botão trocar foto */}
              <div className="flex items-center gap-4 mb-6">
                <div className="relative shrink-0">
                  <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-2xl font-semibold text-white">
                    JS
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-zinc-700 border border-zinc-900 rounded-full flex items-center justify-center cursor-pointer hover:bg-zinc-600 transition-colors">
                    <Camera className="w-3 h-3 text-zinc-300" />
                  </div>
                </div>
                <button className="text-xs border border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors rounded-lg px-3 py-1.5">
                  Trocar Foto
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {dadosPessoais.map((d) => (
                  <div key={d.label}>
                    <p className="text-xs text-zinc-500 uppercase tracking-widest mb-0.5">{d.label}</p>
                    <p className="text-sm text-white">{d.valor}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Seção 3: Endereço e Contato (largura total) */}
          <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/50 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-zinc-300" />
              </div>
              <h2 className="text-sm font-semibold">Endereço e Contato</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {dadosContato.map((d) => (
                <div key={d.label} className={d.label === "Endereço" ? "sm:col-span-3" : ""}>
                  <p className="text-xs text-zinc-500 uppercase tracking-widest mb-0.5">{d.label}</p>
                  <p className="text-sm text-white">{d.valor}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
