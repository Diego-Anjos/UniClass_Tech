"use client";

import { iniciaisDoProfessor } from "@/lib/professor-session";

type ProfessorAvatarProps = {
  nome: string;
  fotoUrl?: string | null;
  className?: string;
  fallback?: string;
};

/** Avatar circular: foto pública ou iniciais. */
export function ProfessorAvatar({
  nome,
  fotoUrl,
  className = "w-10 h-10 text-sm",
  fallback = "PR",
}: ProfessorAvatarProps) {
  const iniciais = iniciaisDoProfessor(nome);

  if (fotoUrl) {
    return (
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
