"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type PaginationFooterProps = {
  total: number;
  paginaAtual: number;
  itensPorPagina: number;
  onPaginaChange: (pagina: number) => void;
  onItensPorPaginaChange: (itens: number) => void;
  labelEntidade?: string;
};

export function PaginationFooter({
  total,
  paginaAtual,
  itensPorPagina,
  onPaginaChange,
  onItensPorPaginaChange,
  labelEntidade = "alunos",
}: PaginationFooterProps) {
  const totalPaginas = Math.max(1, Math.ceil(total / itensPorPagina));
  const indiceInicial = (paginaAtual - 1) * itensPorPagina;
  const indiceFinal = indiceInicial + itensPorPagina;

  const paginasVisiveis = useMemo(() => {
    const maxBotoes = 5;
    if (totalPaginas <= maxBotoes) {
      return Array.from({ length: totalPaginas }, (_, i) => i + 1);
    }
    let inicio = Math.max(1, paginaAtual - 2);
    const fim = Math.min(totalPaginas, inicio + maxBotoes - 1);
    inicio = Math.max(1, fim - maxBotoes + 1);
    return Array.from({ length: fim - inicio + 1 }, (_, i) => inicio + i);
  }, [paginaAtual, totalPaginas]);

  const contador =
    total === 0
      ? `Mostrando 0 a 0 de 0 ${labelEntidade}`
      : `Mostrando ${indiceInicial + 1} a ${Math.min(indiceFinal, total)} de ${total} ${labelEntidade}`;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-800/80 bg-[#0a0c12]/50 rounded-b-xl">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-sm text-gray-400">
        <span>{contador}</span>
        <select
          value={itensPorPagina}
          onChange={(e) => {
            onItensPorPaginaChange(Number(e.target.value));
            onPaginaChange(1);
          }}
          className="bg-[#0f1117] border border-gray-800 text-xs text-gray-300 rounded px-2 py-1"
          aria-label="Itens por página"
        >
          <option value={10}>10 por pág.</option>
          <option value={20}>20 por pág.</option>
          <option value={50}>50 por pág.</option>
        </select>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPaginaChange(Math.max(1, paginaAtual - 1))}
          disabled={paginaAtual === 1}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white border border-gray-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Anterior
        </button>

        {paginasVisiveis.map((pagina) => (
          <button
            key={pagina}
            type="button"
            onClick={() => onPaginaChange(pagina)}
            className={
              pagina === paginaAtual
                ? "bg-purple-600 text-white font-medium px-3 py-1 rounded-md text-sm"
                : "bg-transparent text-gray-400 hover:text-white px-3 py-1 rounded-md text-sm transition-colors"
            }
          >
            {pagina}
          </button>
        ))}

        <button
          type="button"
          onClick={() => onPaginaChange(Math.min(totalPaginas, paginaAtual + 1))}
          disabled={paginaAtual === totalPaginas}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white border border-gray-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          Próximo
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
