"use client";

import { iniciaisDoAluno } from "@/lib/aluno-session";

type AlunoAvatarProps = {
  nome: string;
  fotoUrl?: string | null;
  className?: string;
  fallback?: string;
};

/** Avatar circular: foto pública ou iniciais. */
export function AlunoAvatar({
  nome,
  fotoUrl,
  className = "w-10 h-10 text-base",
  fallback = "AL",
}: AlunoAvatarProps) {
  const iniciais = iniciaisDoAluno(nome);

  if (fotoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={fotoUrl}
        alt=""
        className={`rounded-full object-cover shrink-0 bg-zinc-800 ${className}`}
      />
    );
  }

  return (
    <div
      className={`rounded-full bg-zinc-800 flex items-center justify-center font-semibold text-white shrink-0 ${className}`}
    >
      {iniciais || fallback}
    </div>
  );
}
