/**
 * Re-export para compatibilidade com imports existentes
 * (`@/components/BoletimPDF`). Implementação canônica em `components/pdf/`.
 */
export {
  BoletimDocument,
  BoletimPDF,
  type BoletimAluno,
  type BoletimNota,
  type BoletimDocumentProps,
} from "@/components/pdf/BoletimPDF";

export { default } from "@/components/pdf/BoletimPDF";
