"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap, Shield } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { salvarSessaoAluno, limparSessaoAluno } from "@/lib/aluno-session";
import { limparSessaoProfessor } from "@/lib/professor-session";

type TipoLogin = "Aluno" | "Professor";

const SENHA_PADRAO_ALUNO = "aluno123";

export default function LoginProfessorPage() {
  const router = useRouter();
  const [tipoLogin, setTipoLogin] = useState<TipoLogin>("Professor");
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const isAluno = tipoLogin === "Aluno";

  function trocarTipo(tipo: TipoLogin) {
    setTipoLogin(tipo);
    setUsuario("");
    setSenha("");
    setErro("");
  }

  async function handleLoginAluno(usuarioInput: string, senhaInput: string) {
    const { data: aluno, error } = await supabase
      .from("alunos")
      .select("*")
      .eq("ra", usuarioInput)
      .single();

    if (error || !aluno) {
      setErro("RA não encontrado no sistema.");
      return;
    }

    if (senhaInput !== SENHA_PADRAO_ALUNO) {
      setErro("Senha incorreta.");
      return;
    }

    limparSessaoProfessor();
    salvarSessaoAluno({
      ra: String(aluno.ra ?? usuarioInput),
      nome: String(aluno.nome ?? "Estudante"),
      curso: String(aluno.curso ?? ""),
      semestreAtual:
        aluno.semestre_atual ?? aluno.semestre ?? aluno.SemestreAtual ?? "",
    });

    router.push("/aluno/dashboard");
  }

  async function handleLoginProfessor(usuarioInput: string, senhaInput: string) {
    const emailCompleto = `${usuarioInput}@uniclasstech.edu.br`;

    const { data, error } = await supabase
      .from("professores")
      .select("*")
      .eq("email_institucional", emailCompleto)
      .eq("senha", senhaInput)
      .single();

    if (error || !data) {
      setErro("Credenciais inválidas. Verifique seu e-mail e senha.");
      return;
    }

    limparSessaoAluno();
    localStorage.setItem(
      "uniclass_prof_session",
      JSON.stringify({
        id: data.id,
        nome: data.nome,
        titulacao: data.titulacao,
        area_atuacao: data.area_atuacao,
        nomeCompletoTitulo: `${data.titulacao} ${data.nome}`,
        turno_aula: data.turno_aula ?? "Noite",
        dias_aula: Array.isArray(data.dias_aula) ? data.dias_aula : [],
      })
    );

    router.push("/professor/dashboard");
  }

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    const usuarioInput = usuario.trim();

    try {
      if (isAluno) {
        await handleLoginAluno(usuarioInput, senha);
      } else {
        await handleLoginProfessor(usuarioInput, senha);
      }
    } catch {
      setErro(
        isAluno
          ? "Não foi possível autenticar. Tente novamente."
          : "Credenciais inválidas. Verifique seu e-mail e senha."
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0a0c12] text-white px-4 py-12">
      <div className="w-full max-w-md bg-[#0f1117] border border-gray-800 rounded-xl p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#13161f] border border-gray-800 flex items-center justify-center text-white shadow-lg mb-4">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">
            UniClassTech -{" "}
            {isAluno ? "Portal do Aluno" : "Portal do Docente"}
          </h1>
          <p className="text-sm text-zinc-400 mt-2">
            {isAluno
              ? "Acesse com seu RA e senha"
              : "Acesse com suas credenciais institucionais"}
          </p>
        </div>

        <div
          className="grid grid-cols-2 gap-1 p-1 mb-6 rounded-lg border border-gray-800 bg-[#0a0c12]"
          role="tablist"
          aria-label="Tipo de acesso"
        >
          <button
            type="button"
            role="tab"
            aria-selected={isAluno}
            onClick={() => trocarTipo("Aluno")}
            className={`rounded-md py-2 text-sm font-medium transition-colors ${
              isAluno
                ? "bg-gray-800 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Aluno
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!isAluno}
            onClick={() => trocarTipo("Professor")}
            className={`rounded-md py-2 text-sm font-medium transition-colors ${
              !isAluno
                ? "bg-gray-800 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Professor
          </button>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          {isAluno ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="usuario" className="text-sm text-zinc-300">
                RA
              </label>
              <input
                id="usuario"
                type="text"
                required
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="Digite seu RA"
                className="w-full bg-[#0a0c12] border border-gray-800 rounded-md px-4 py-2.5 text-sm outline-none focus:border-purple-500 transition-colors placeholder:text-zinc-600"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="usuario" className="text-sm text-zinc-300">
                Usuário Institucional
              </label>
              <div className="flex">
                <input
                  id="usuario"
                  type="text"
                  required
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  placeholder="ex: seu.nome"
                  className="flex-1 rounded-l-md rounded-r-none border-r-0 bg-[#0a0c12] border border-gray-800 px-4 py-2.5 text-sm outline-none focus:border-purple-500 transition-colors placeholder:text-zinc-600"
                />
                <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-700 bg-gray-800 text-gray-400 text-sm">
                  @uniclasstech.edu.br
                </span>
              </div>
            </div>
          )}

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
              placeholder={isAluno ? "Senha" : "Insira sua senha"}
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
