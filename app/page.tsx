"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap, Shield } from "lucide-react";
import { LegalConsentFooter } from "@/components/legal-consent";
import { salvarSessaoAluno, limparSessaoAluno } from "@/lib/aluno-session";
import { limparSessaoProfessor } from "@/lib/professor-session";
import { limparSessaoAdmin } from "@/lib/admin-session";

type TipoLogin = "Aluno" | "Professor";

export default function LoginPage() {
  const router = useRouter();
  const [tipoLogin, setTipoLogin] = useState<TipoLogin>("Aluno");
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  function trocarTipo(tipo: TipoLogin) {
    setTipoLogin(tipo);
    setUsuario("");
    setSenha("");
    setErro("");
  }

  async function handleLoginAluno(usuarioInput: string, senhaInput: string) {
    const response = await fetch("/api/auth/aluno", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ra: usuarioInput, senha: senhaInput }),
    });
    const data = await response.json();

    if (!response.ok) {
      setErro(String(data.error ?? "Não foi possível autenticar."));
      return;
    }

    limparSessaoProfessor();
    limparSessaoAdmin();
    salvarSessaoAluno({
      ra: String(data.aluno.ra),
      nome: String(data.aluno.nome),
      curso: String(data.aluno.curso ?? ""),
      semestreAtual: data.aluno.semestreAtual ?? "",
      foto_url:
        typeof data.aluno.foto_url === "string" && data.aluno.foto_url.trim()
          ? data.aluno.foto_url.trim()
          : null,
    });

    router.push("/aluno/dashboard");
  }

  async function handleLoginProfessor(usuarioInput: string, senhaInput: string) {
    const response = await fetch("/api/auth/professor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario: usuarioInput, senha: senhaInput }),
    });
    const data = await response.json();

    if (!response.ok) {
      setErro(
        String(
          data.error ?? "Credenciais inválidas. Verifique seu e-mail e senha."
        )
      );
      return;
    }

    limparSessaoAluno();
    limparSessaoAdmin();
    localStorage.setItem(
      "uniclass_prof_session",
      JSON.stringify(data.professor)
    );

    router.push("/professor/dashboard");
  }

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    const usuarioInput = usuario.trim();
    const senhaInput = senha;

    try {
      if (tipoLogin === "Aluno") {
        await handleLoginAluno(usuarioInput, senhaInput);
      } else {
        await handleLoginProfessor(usuarioInput, senhaInput);
      }
    } catch {
      setErro(
        tipoLogin === "Aluno"
          ? "Não foi possível autenticar. Tente novamente."
          : "Credenciais inválidas. Verifique seu e-mail e senha."
      );
    } finally {
      setCarregando(false);
    }
  }

  const isAluno = tipoLogin === "Aluno";
  const isProfessor = tipoLogin === "Professor";

  const portalLabel = isAluno ? "Portal do Aluno" : "Portal do Docente";

  return (
    <main className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-black text-white">
      <div className="flex flex-col justify-center px-8 sm:px-16 lg:px-24 py-12 bg-black">
        <div className="w-full max-w-sm mx-auto">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-950 border border-zinc-700/50 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl tracking-tight">
              <span className="text-white font-bold">UniClass</span>
              <span className="text-zinc-400 font-light">Tech</span>
            </span>
          </div>

          <div className="text-center mb-6">
            <h1 className="text-3xl font-semibold tracking-tight mb-2">
              Acesse sua conta
            </h1>
            <p className="text-sm text-zinc-400">{portalLabel}</p>
          </div>

          <div
            className="grid grid-cols-2 gap-1 p-1 mb-6 rounded-lg border border-zinc-800 bg-zinc-950"
            role="tablist"
            aria-label="Tipo de acesso"
          >
            {(
              [
                ["Aluno", "Aluno"],
                ["Professor", "Professor"],
              ] as const
            ).map(([tipo, label]) => (
              <button
                key={tipo}
                type="button"
                role="tab"
                aria-selected={tipoLogin === tipo}
                onClick={() => trocarTipo(tipo)}
                className={`rounded-md py-2 text-xs sm:text-sm font-medium transition-colors ${
                  tipoLogin === tipo
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {isAluno ? (
              <input
                type="text"
                required
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="Digite seu RA"
                autoComplete="username"
                className="w-full bg-transparent border border-zinc-800 rounded-md px-4 py-2.5 text-sm outline-none focus:border-zinc-500 transition-colors placeholder:text-zinc-600"
              />
            ) : (
              <div className="flex">
                <input
                  type="text"
                  required
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  placeholder="ex: seu.nome"
                  autoComplete="username"
                  className="flex-1 rounded-l-md rounded-r-none border-r-0 bg-transparent border border-zinc-800 px-4 py-2.5 text-sm outline-none focus:border-zinc-500 transition-colors placeholder:text-zinc-600"
                />
                <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-zinc-800 bg-zinc-900 text-zinc-500 text-sm">
                  @uniclasstech.edu.br
                </span>
              </div>
            )}

            <input
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder={isProfessor ? "Insira sua senha" : "Senha"}
              autoComplete="current-password"
              className="w-full bg-transparent border border-zinc-800 rounded-md px-4 py-2.5 text-sm outline-none focus:border-zinc-500 transition-colors placeholder:text-zinc-600"
            />

            {erro ? <p className="text-red-400 text-sm">{erro}</p> : null}

            <button
              type="submit"
              disabled={carregando}
              className="flex items-center justify-center w-full bg-white text-black font-medium py-2.5 rounded-md hover:bg-zinc-200 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {carregando ? "Autenticando..." : "Continuar"}
            </button>
          </form>

          <LegalConsentFooter />
        </div>
      </div>

      <div className="relative hidden md:flex flex-col justify-center px-12 lg:px-24 border-l border-zinc-800 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=1000&auto=format&fit=crop"
          alt="Code Background"
          className="absolute inset-0 w-full h-full object-cover z-0"
        />

        <div className="absolute inset-0 bg-zinc-950/85 z-0"></div>

        <div className="relative z-10 max-w-md">
          <p className="text-xs font-semibold tracking-widest text-zinc-400 mb-4 uppercase">
            UniClassTech
          </p>
          <h2 className="text-4xl font-medium tracking-tight mb-6 text-white">
            Infraestrutura de ensino impulsionada por IA.
          </h2>
          <p className="text-zinc-300 mb-12 leading-relaxed">
            Lançamento de notas, gestão de faltas e insights de desempenho em
            tempo real — tudo em uma plataforma construída para a educação
            moderna.
          </p>

          <div className="space-y-4">
            <div className="p-5 rounded-xl border border-zinc-700/50 bg-black/50 backdrop-blur-md">
              <h3 className="font-medium text-white mb-1">
                Insights de IA do Google Gemini
              </h3>
              <p className="text-sm text-zinc-300">
                Análise automática de engajamento e risco de reprovação das
                turmas.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-zinc-700/50 bg-black/50 backdrop-blur-md">
              <h3 className="font-medium text-white mb-1">Gestão Simplificada</h3>
              <p className="text-sm text-zinc-300">
                Controle total de notas, feedbacks e presença em poucos cliques.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Link
        href="/adm/login"
        className="fixed bottom-6 left-6 flex items-center justify-center w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all opacity-50 hover:opacity-100"
        title="Acesso Restrito - ADM"
      >
        <Shield className="w-4 h-4" />
      </Link>
    </main>
  );
}
