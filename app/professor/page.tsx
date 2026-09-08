import Link from "next/link";
import { GraduationCap, Shield } from "lucide-react";

export default function LoginProfessorPage() {
  return (
    <main className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-black text-white">
      {/* LADO ESQUERDO: Formulário Clean Dark Mode */}
      <div className="flex flex-col justify-center px-8 sm:px-16 lg:px-24 py-12 bg-black">
        <div className="w-full max-w-sm mx-auto">
          <div className="flex items-center justify-center mb-8">
            <div className="w-11 h-11 rounded-xl bg-[#13161f] border border-gray-800 flex items-center justify-center text-white shadow-lg">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight ml-2.5">UniClassTech</span>
            <span className="text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full ml-2">
              Docente
            </span>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-semibold tracking-tight mb-2">Acesse sua conta</h1>
            {/* ALTERAÇÃO 1: subtítulo "Portal do Professor" */}
            <p className="text-sm text-zinc-400">
              Portal do Professor
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <Link href="/professor/dashboard" className="flex items-center justify-center gap-2 w-full py-2.5 border border-zinc-800 rounded-md hover:bg-zinc-900 transition-colors text-sm font-medium">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continuar com Google
            </Link>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-zinc-800"></div>
              <span className="flex-shrink-0 mx-4 text-xs text-zinc-500 uppercase">Ou</span>
              <div className="flex-grow border-t border-zinc-800"></div>
            </div>

            {/* ALTERAÇÃO 2: placeholder "Digite seu e-mail docente" */}
            <input
              type="email"
              placeholder="Digite seu e-mail docente"
              className="w-full bg-transparent border border-zinc-800 rounded-md px-4 py-2.5 text-sm outline-none focus:border-zinc-500 transition-colors placeholder:text-zinc-600"
            />

            <Link href="/professor/dashboard" className="flex items-center justify-center w-full bg-white text-black font-medium py-2.5 rounded-md hover:bg-zinc-200 transition-colors text-sm">
              Continuar
            </Link>

            {/* ALTERAÇÃO 3: link para portal discente apontando para "/" */}
            <div className="mt-2 text-center">
              <p className="text-sm text-zinc-400">
                É aluno?{" "}
                <Link href="/" className="text-white hover:underline font-medium transition-colors">
                  Acesse o portal discente
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-zinc-600 mt-8">
            Ao continuar, você concorda com nossos{" "}
            <Link href="#" className="underline hover:text-zinc-400">Termos de Serviço</Link> e{" "}
            <Link href="#" className="underline hover:text-zinc-400">Política de Privacidade</Link>.
          </p>
        </div>
      </div>

      {/* LADO DIREITO: Apresentação com Imagem de Código — 100% idêntico ao page.tsx */}
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
