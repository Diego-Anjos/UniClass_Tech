"use client";

import { Check, AlertTriangle, X } from "lucide-react";

interface ModalFeedbackProps {
  aberto: boolean;
  onClose: () => void;
  tipo?: "sucesso" | "erro" | "atencao";
  titulo: string;
  mensagem: string;
  textoBotao?: string;
}

const iconWrapByTipo: Record<
  NonNullable<ModalFeedbackProps["tipo"]>,
  string
> = {
  sucesso:
    "w-14 h-14 rounded-full bg-emerald-950/60 border border-emerald-800/80 flex items-center justify-center text-emerald-400 mb-4",
  erro: "w-14 h-14 rounded-full bg-rose-950/60 border border-rose-800/80 flex items-center justify-center text-rose-400 mb-4",
  atencao:
    "w-14 h-14 rounded-full bg-amber-950/60 border border-amber-800/80 flex items-center justify-center text-amber-400 mb-4",
};

export function ModalFeedback({
  aberto,
  onClose,
  tipo = "sucesso",
  titulo,
  mensagem,
  textoBotao = "Fechar",
}: ModalFeedbackProps) {
  if (!aberto) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-feedback-titulo"
        className="bg-[#0f1117] border border-gray-800 rounded-2xl w-full max-w-md p-6 text-center shadow-2xl flex flex-col items-center"
      >
        <div className={iconWrapByTipo[tipo]}>
          {tipo === "sucesso" ? (
            <Check className="w-7 h-7" strokeWidth={2.5} />
          ) : (
            <AlertTriangle className="w-7 h-7" />
          )}
        </div>

        <h3
          id="modal-feedback-titulo"
          className="text-xl font-bold text-white mb-2"
        >
          {titulo}
        </h3>
        <p className="text-sm text-gray-400 mb-6 max-w-xs">{mensagem}</p>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 px-4 rounded-xl bg-[#1a1d26] hover:bg-[#222734] text-white font-medium border border-gray-700/60 flex items-center justify-center gap-2 transition-colors"
        >
          <X className="w-4 h-4" />
          {textoBotao}
        </button>
      </div>
    </div>
  );
}
