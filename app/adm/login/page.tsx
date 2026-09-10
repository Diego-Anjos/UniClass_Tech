"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { limparSessaoAluno } from "@/lib/aluno-session";
import { limparSessaoProfessor } from "@/lib/professor-session";
import { salvarSessaoAdmin } from "@/lib/admin-session";

const ADMIN_EMAIL = "admin@uniclass.com";
const ADMIN_SENHA = "admin123";

export default function LoginAdmPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    try {
      const email = usuario.trim();
      if (email !== ADMIN_EMAIL || senha !== ADMIN_SENHA) {
        setErro("Credenciais administrativas inválidas.");
        return;
      }

      limparSessaoAluno();
      limparSessaoProfessor();
      salvarSessaoAdmin({
        nome: "Secretaria Acadêmica",
        role: "admin",
      });

      router.push("/adm/dashboard");
    } catch {
      setErro("Credenciais administrativas inválidas.");
    } finally {
      setCarregando(false);
    }
  }

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

          <div className="text-center mb-8">
            <h1 className="text-3xl font-semibold tracking-tight mb-2">
              Acesse sua conta
            </h1>
            <p className="text-sm text-zinc-400">
              Portal da Administração (Acesso Restrito)
            </p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input
              type="email"
              required
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="E-mail institucional"
              autoComplete="username"
              className="w-full bg-transparent border border-zinc-800 rounded-md px-4 py-2.5 text-sm outline-none focus:border-zinc-500 transition-colors placeholder:text-zinc-600"
            />

            <input
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Senha"
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

            <div className="mt-2 text-center">
              <Link
                href="/"
                className="text-sm text-zinc-400 hover:text-white hover:underline font-medium transition-colors"
              >
                Voltar para o início
              </Link>
            </div>
          </form>

          <p className="text-center text-xs text-zinc-600 mt-8">
            Ao continuar, você concorda com nossos{" "}
            <Link href="#" className="underline hover:text-zinc-400">
              Termos de Serviço
            </Link>{" "}
            e{" "}
            <Link href="#" className="underline hover:text-zinc-400">
              Política de Privacidade
            </Link>
            .
          </p>
        </div>
      </div>

      <div className="relative hidden md:flex flex-col justify-center px-12 lg:px-24 border-l border-zinc-800 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
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
                Insights de IA do Groq
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
    </main>
  );
}
