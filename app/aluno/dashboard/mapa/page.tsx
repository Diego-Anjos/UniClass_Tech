"use client";

import { MapaSalas } from "@/components/MapaSalas";
import { useAlunoSession } from "@/lib/aluno-session";

export default function AlunoMapaPage() {
  const { alunoLogado, carregandoSessao } = useAlunoSession();

  if (carregandoSessao) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-zinc-500 animate-pulse">Carregando mapa...</p>
      </div>
    );
  }

  return <MapaSalas usuarioLogado={alunoLogado} role="aluno" />;
}
