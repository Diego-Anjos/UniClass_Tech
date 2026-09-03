import Link from "next/link";
import { GraduationCap } from "lucide-react";

export default function LoginAdmPage() {
  return (
    <main className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-black text-white">
      {/* LADO ESQUERDO: Formulário Clean Dark Mode */}
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
            <h1 className="text-3xl font-semibold tracking-tight mb-2">Acesse sua conta</h1>
            <p className="text-sm text-zinc-400">
              Portal da Administração (Acesso Restrito)
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="Digite seu e-mail administrativo"
              className="w-full bg-transparent border border-zinc-800 rounded-md px-4 py-2.5 text-sm outline-none focus:border-zinc-500 transition-colors placeholder:text-zinc-600"
            />

            <Link
              href="/adm/dashboard"
              className="flex items-center justify-center w-full bg-white text-black font-medium py-2.5 rounded-md hover:bg-zinc-200 transition-colors text-sm"
            >
              Continuar
            </Link>

            <div className="mt-2 text-center">
              <Link
                href="/"
                className="text-sm text-zinc-400 hover:text-white hover:underline font-medium transition-colors"
              >
                Voltar para o início
              </Link>
            </div>
          </div>

          <p className="text-center text-xs text-zinc-600 mt-8">
            Ao continuar, você concorda com nossos{" "}
            <Link href="#" className="underline hover:text-zinc-400">Termos de Serviço</Link> e{" "}
            <Link href="#" className="underline hover:text-zinc-400">Política de Privacidade</Link>.
          </p>
        </div>
      </div>

      {/* LADO DIREITO: Apresentação com Imagem de Código */}
      <div className="relative hidden md:flex flex-col justify-center px-12 lg:px-24 border-l border-zinc-800 overflow-hidden">
        {/* Imagem de Fundo (Código) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=1000&auto=format&fit=crop"
          alt="Code Background"
          className="absolute inset-0 w-full h-full object-cover z-0"
        />

        {/* Overlay Escuro para não perder a leitura */}
        <div className="absolute inset-0 bg-zinc-950/85 z-0"></div>

        {/* Conteúdo sobre a imagem */}
        <div className="relative z-10 max-w-md">
          <p className="text-xs font-semibold tracking-widest text-zinc-400 mb-4 uppercase">
            UniClassTech
          </p>
          <h2 className="text-4xl font-medium tracking-tight mb-6 text-white">
            Infraestrutura de ensino impulsionada por IA.
          </h2>
          <p className="text-zinc-300 mb-12 leading-relaxed">
            Lançamento de notas, gestão de faltas e insights de desempenho em tempo real — tudo em uma plataforma construída para a educação moderna.
          </p>

          <div className="space-y-4">
            <div className="p-5 rounded-xl border border-zinc-700/50 bg-black/50 backdrop-blur-md">
              <h3 className="font-medium text-white mb-1">Insights de IA do Groq</h3>
              <p className="text-sm text-zinc-300">Análise automática de engajamento e risco de reprovação das turmas.</p>
            </div>

            <div className="p-5 rounded-xl border border-zinc-700/50 bg-black/50 backdrop-blur-md">
              <h3 className="font-medium text-white mb-1">Gestão Simplificada</h3>
              <p className="text-sm text-zinc-300">Controle total de notas, feedbacks e presença em poucos cliques.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
