"use client";

import { MapaSalas } from "@/components/MapaSalas";
import { useProfessorSession } from "@/lib/professor-session";

export default function ProfessorMapaPage() {
  const { professorLogado, carregandoSessao } = useProfessorSession();

  if (carregandoSessao || !professorLogado) {
    return (
      <div className="p-8 text-center text-zinc-400 text-sm">
        Carregando sessão...
      </div>
    );
  }

  return (
    <MapaSalas
      usuarioLogado={{
        id: professorLogado.id,
        nome: professorLogado.nome,
      }}
      role="professor"
    />
  );
}
