"use client";

import { PDFDownloadLink } from "@react-pdf/renderer";
import { Download, Loader2 } from "lucide-react";
import {
  BoletimDocument,
  type BoletimAluno,
  type BoletimNota,
} from "@/components/pdf/BoletimPDF";

type BoletimDownloadButtonProps = {
  aluno: BoletimAluno;
  notas: BoletimNota[];
  className?: string;
};

export function BoletimDownloadButton({
  aluno,
  notas,
  className = "",
}: BoletimDownloadButtonProps) {
  const fileName = `Boletim_${aluno.ra || "aluno"}.pdf`;

  return (
    <PDFDownloadLink
      document={<BoletimDocument aluno={aluno} notas={notas} />}
      fileName={fileName}
      className={`inline-flex w-full no-underline ${className}`}
    >
      {({ loading }) => (
        <span
          className={`inline-flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-800 hover:text-white ${
            loading ? "opacity-70 pointer-events-none" : ""
          }`}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {loading ? "Preparando PDF..." : "Baixar Boletim (PDF)"}
        </span>
      )}
    </PDFDownloadLink>
  );
}

export default BoletimDownloadButton;
