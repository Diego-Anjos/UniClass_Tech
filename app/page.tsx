"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap, Shield, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { salvarSessaoAluno, limparSessaoAluno } from "@/lib/aluno-session";
import { limparSessaoProfessor } from "@/lib/professor-session";
import { limparSessaoAdmin } from "@/lib/admin-session";

type TipoLogin = "Aluno" | "Professor";
type AbaLegal = "termos" | "privacidade";

const SENHA_PADRAO_ALUNO = "aluno123";

export default function LoginPage() {
  const router = useRouter();
  const [tipoLogin, setTipoLogin] = useState<TipoLogin>("Aluno");
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [modalLegalAberto, setModalLegalAberto] = useState(false);
  const [abaLegalAtiva, setAbaLegalAtiva] = useState<AbaLegal>("termos");

  function abrirModalLegal(aba: AbaLegal) {
    setAbaLegalAtiva(aba);
    setModalLegalAberto(true);
  }

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
    limparSessaoAdmin();
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
    limparSessaoAdmin();
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

          <p className="text-center text-xs text-zinc-600 mt-8">
            Ao continuar, você concorda com nossos{" "}
            <button
              type="button"
              onClick={() => abrirModalLegal("termos")}
              className="underline text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              Termos de Serviço
            </button>{" "}
            e{" "}
            <button
              type="button"
              onClick={() => abrirModalLegal("privacidade")}
              className="underline text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              Política de Privacidade
            </button>
            .
          </p>
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

      <Link
        href="/adm/login"
        className="fixed bottom-6 left-6 flex items-center justify-center w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all opacity-50 hover:opacity-100"
        title="Acesso Restrito - ADM"
      >
        <Shield className="w-4 h-4" />
      </Link>

      {modalLegalAberto ? (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setModalLegalAberto(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-legal-titulo"
            className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 px-6 pt-5 pb-3 border-b border-zinc-800">
              <h2
                id="modal-legal-titulo"
                className="text-lg font-semibold tracking-tight text-white"
              >
                Termos e Privacidade
              </h2>
              <button
                type="button"
                onClick={() => setModalLegalAberto(false)}
                className="flex items-center justify-center w-8 h-8 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div
              className="flex gap-1 px-6 border-b border-zinc-800"
              role="tablist"
              aria-label="Documentos legais"
            >
              {(
                [
                  ["termos", "Termos de Serviço"],
                  ["privacidade", "Política de Privacidade"],
                ] as const
              ).map(([aba, label]) => (
                <button
                  key={aba}
                  type="button"
                  role="tab"
                  aria-selected={abaLegalAtiva === aba}
                  onClick={() => setAbaLegalAtiva(aba)}
                  className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                    abaLegalAtiva === aba
                      ? "border-white text-white"
                      : "border-transparent text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="overflow-y-auto p-6 text-sm text-zinc-400 space-y-4">
              {abaLegalAtiva === "termos" ? (
                <>
                  <section className="space-y-2">
                    <h3 className="text-zinc-200 font-medium">1. Aceitação</h3>
                    <p>
                      Ao acessar ou utilizar o UniClassTech, ERP educacional
                      destinado a alunos, docentes e administração acadêmica,
                      você declara ter lido, compreendido e concordado com estes
                      Termos de Serviço. Se não concordar, não utilize a
                      plataforma.
                    </p>
                  </section>
                  <section className="space-y-2">
                    <h3 className="text-zinc-200 font-medium">
                      2. Uso da Plataforma
                    </h3>
                    <p>
                      A conta é pessoal e intransferível. Você é responsável por
                      manter a confidencialidade de suas credenciais e por toda
                      atividade realizada sob seu acesso. O compartilhamento de
                      senhas, o uso de contas de terceiros ou qualquer tentativa
                      de acesso não autorizado é expressamente proibido e pode
                      resultar em suspensão imediata da conta.
                    </p>
                  </section>
                  <section className="space-y-2">
                    <h3 className="text-zinc-200 font-medium">
                      3. Integridade Acadêmica
                    </h3>
                    <p>
                      O UniClassTech apoia processos acadêmicos legítimos.
                      Fraude acadêmica, manipulação indevida de notas, falsidade
                      de presença, adulteração de registros ou qualquer conduta
                      que comprometa a integridade educacional poderá resultar
                      em suspensão da conta e comunicação às autoridades
                      acadêmicas competentes.
                    </p>
                  </section>
                  <section className="space-y-2">
                    <h3 className="text-zinc-200 font-medium">
                      4. Propriedade Intelectual
                    </h3>
                    <p>
                      Marcas, interface, código, conteúdos institucionais e
                      demais materiais disponibilizados na plataforma são
                      protegidos por direitos de propriedade intelectual.
                      É vedada a reprodução, distribuição ou engenharia reversa
                      sem autorização prévia da instituição ou do UniClassTech,
                      conforme aplicável.
                    </p>
                  </section>
                </>
              ) : (
                <>
                  <section className="space-y-2">
                    <h3 className="text-zinc-200 font-medium">
                      1. Coleta de Dados
                    </h3>
                    <p>
                      Em conformidade com a Lei Geral de Proteção de Dados
                      (LGPD — Lei nº 13.709/2018), coletamos dados necessários
                      à prestação do serviço educacional, tais como
                      identificação acadêmica, credenciais de acesso, registros
                      de notas, frequência e comunicações internas, sempre com
                      base legal adequada (execução de contrato, obrigação
                      legal ou legítimo interesse institucional).
                    </p>
                  </section>
                  <section className="space-y-2">
                    <h3 className="text-zinc-200 font-medium">
                      2. Uso de Inteligência Artificial
                    </h3>
                    <p>
                      Recursos de IA do UniClassTech analisam dados acadêmicos
                      exclusivamente para gerar insights de aprendizagem,
                      engajamento e retenção. Essas análises destinam-se a
                      apoiar decisões pedagógicas e administrativas — não a
                      tomar decisões automatizadas definitivas sem supervisão
                      humana quando a lei exigir.
                    </p>
                  </section>
                  <section className="space-y-2">
                    <h3 className="text-zinc-200 font-medium">
                      3. Compartilhamento
                    </h3>
                    <p>
                      Dados acadêmicos não são vendidos a terceiros. O
                      compartilhamento ocorre apenas quando necessário à
                      operação da plataforma (provedores sob contrato), por
                      exigência legal ou com autorização do titular, sempre com
                      salvaguardas contratuais e técnicas apropriadas.
                    </p>
                  </section>
                  <section className="space-y-2">
                    <h3 className="text-zinc-200 font-medium">4. Segurança</h3>
                    <p>
                      Adotamos medidas técnicas e organizacionais para proteger
                      os dados contra acesso não autorizado, perda ou alteração
                      indevida. Você pode exercer direitos de titular (acesso,
                      correção, exclusão e outros previstos na LGPD) por meio
                      dos canais institucionais disponibilizados pela
                      instituição de ensino.
                    </p>
                  </section>
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-zinc-800 flex justify-end">
              <button
                type="button"
                onClick={() => setModalLegalAberto(false)}
                className="px-4 py-2 rounded-md bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
