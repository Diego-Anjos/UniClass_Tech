"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap, Shield } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function LoginProfessorPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    try {
      const { data, error } = await supabase
        .from("professores")
        .select("*")
        .eq("email_institucional", email.trim())
        .eq("senha", senha)
        .single();

      if (error || !data) {
        setErro("Credenciais inválidas. Verifique seu e-mail e senha.");
        return;
      }

      localStorage.setItem(
        "uniclass_prof_session",
        JSON.stringify({
          id: data.id,
          nome: data.nome,
          titulacao: data.titulacao,
          area_atuacao: data.area_atuacao,
          nomeCompletoTitulo: `${data.titulacao} ${data.nome}`,
        })
      );

      router.push("/professor/dashboard");
    } catch {
      setErro("Credenciais inválidas. Verifique seu e-mail e senha.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0a0c12] text-white px-4 py-12">
      <div className="w-full max-w-md bg-[#0f1117] border border-gray-800 rounded-xl p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-[#13161f] border border-gray-800 flex items-center justify-center text-white shadow-lg mb-4">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">
            UniClassTech - Portal do Docente
          </h1>
          <p className="text-sm text-zinc-400 mt-2">
            Acesse com suas credenciais institucionais
          </p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm text-zinc-300">
              E-mail Institucional
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ex: roberto.lima@uniclasstech.edu.br"
              className="w-full bg-[#0a0c12] border border-gray-800 rounded-md px-4 py-2.5 text-sm outline-none focus:border-purple-500 transition-colors placeholder:text-zinc-600"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="senha" className="text-sm text-zinc-300">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Insira sua senha"
              className="w-full bg-[#0a0c12] border border-gray-800 rounded-md px-4 py-2.5 text-sm outline-none focus:border-purple-500 transition-colors placeholder:text-zinc-600"
            />
          </div>

          {erro ? <p className="text-red-400 text-sm">{erro}</p> : null}

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-md transition-colors text-sm mt-1"
          >
            {carregando ? "Autenticando..." : "Acessar Portal"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-zinc-400">
            É aluno?{" "}
            <Link
              href="/"
              className="text-white hover:underline font-medium transition-colors"
            >
              Acesse o portal discente
            </Link>
          </p>
        </div>
      </div>

      <Link
        href="/adm/login"
        className="fixed bottom-6 left-6 flex items-center justify-center w-10 h-10 rounded-full bg-[#0f1117] border border-gray-800 text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all opacity-50 hover:opacity-100"
        title="Acesso Restrito - ADM"
      >
        <Shield className="w-4 h-4" />
      </Link>
    </main>
  );
}
