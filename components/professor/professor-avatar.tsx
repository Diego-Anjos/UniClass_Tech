"use client";

import { iniciaisDoProfessor } from "@/lib/professor-session";

type ProfessorAvatarProps = {
  nome: string;
  fotoUrl?: string | null;
  className?: string;
  fallback?: string;
};

/** Avatar circular: foto pública (sessão global) ou iniciais. */
export function ProfessorAvatar({
  nome,
  fotoUrl,
  className = "w-10 h-10 text-sm",
  fallback = "PR",
}: ProfessorAvatarProps) {
  const iniciais = iniciaisDoProfessor(nome);
  const src = fotoUrl?.trim() || null;

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={src}
        src={src}
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
