import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

Font.registerHyphenationCallback((word) => [word]);

export type BoletimAluno = {
  nome: string;
  ra: string;
  curso: string;
  turma?: string;
};

export type BoletimComposicaoItem = {
  label: string;
  peso: number;
  nota: number | null;
};

export type BoletimNota = {
  disciplina: string;
  n1: number | string | null;
  n2: number | string | null;
  /** Média parcial/final (substitui N3 na regra de negócio). */
  media?: number | string | null;
  faltas: number | string | null;
  /** Detalhamento das avaliações que compõem a N1 (igual à UI do aluno). */
  composicao?: BoletimComposicaoItem[];
};

export type BoletimDocumentProps = {
  aluno: BoletimAluno;
  notas: BoletimNota[];
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 72,
    paddingHorizontal: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#18181b",
    backgroundColor: "#ffffff",
  },
  header: {
    borderBottomWidth: 1.5,
    borderBottomColor: "#27272a",
    paddingBottom: 16,
    marginBottom: 20,
  },
  brand: {
    fontFamily: "Helvetica-Bold",
    fontSize: 20,
    color: "#09090b",
    letterSpacing: 0.8,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 11,
    color: "#3f3f46",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  alunoBox: {
    backgroundColor: "#f4f4f5",
    borderWidth: 1,
    borderColor: "#e4e4e7",
    borderRadius: 4,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  alunoRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  alunoRowLast: {
    flexDirection: "row",
    marginBottom: 0,
  },
  alunoLabel: {
    width: 56,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: "#52525b",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  alunoValue: {
    flex: 1,
    fontSize: 10,
    color: "#18181b",
  },
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: "#27272a",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  table: {
    borderWidth: 1,
    borderColor: "#d4d4d8",
    borderRadius: 2,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#27272a",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tableHeaderCell: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: "#fafafa",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  tableRow: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e4e4e7",
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  tableRowAlt: {
    flexDirection: "row",
    backgroundColor: "#fafafa",
    borderBottomWidth: 1,
    borderBottomColor: "#e4e4e7",
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  tableRowLast: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderBottomWidth: 0,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  tableRowLastAlt: {
    flexDirection: "row",
    backgroundColor: "#fafafa",
    borderBottomWidth: 0,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  colDisciplina: { width: "36%" },
  colNota: { width: "16%", textAlign: "center" },
  colFaltas: { width: "16%", textAlign: "center" },
  cellText: {
    fontSize: 9.5,
    color: "#18181b",
  },
  emptyState: {
    paddingVertical: 20,
    paddingHorizontal: 10,
    textAlign: "center",
    color: "#71717a",
    fontSize: 9.5,
  },
  detalheSection: {
    marginTop: 22,
  },
  detalheSectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: "#52525b",
    textTransform: "uppercase",
    letterSpacing: 0.45,
    marginBottom: 10,
  },
  detalheBloco: {
    borderWidth: 1,
    borderColor: "#e4e4e7",
    borderRadius: 3,
    backgroundColor: "#fafafa",
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  detalheCabecalho: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e4e4e7",
  },
  detalheDisciplina: {
    flex: 1,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: "#3f3f46",
    paddingRight: 8,
  },
  detalheTotal: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: "#18181b",
  },
  detalheTabelaHeader: {
    flexDirection: "row",
    paddingBottom: 4,
    marginBottom: 2,
  },
  detalheTabelaHeaderCell: {
    fontSize: 7.5,
    color: "#a1a1aa",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  detalheLinha: {
    flexDirection: "row",
    paddingVertical: 3.5,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f4f4f5",
  },
  detalheLinhaUltima: {
    flexDirection: "row",
    paddingVertical: 3.5,
    borderBottomWidth: 0,
  },
  detalheColAtividade: { width: "50%" },
  detalheColPeso: { width: "25%", textAlign: "center" },
  detalheColNota: { width: "25%", textAlign: "center" },
  detalheCelula: {
    fontSize: 8,
    color: "#52525b",
  },
  signatureBlock: {
    marginTop: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 24,
  },
  signatureCol: {
    flex: 1,
    alignItems: "center",
  },
  signatureLine: {
    width: "100%",
    borderBottomWidth: 1,
    borderBottomColor: "#27272a",
    marginBottom: 8,
    marginTop: 36,
  },
  signatureLabel: {
    fontSize: 8,
    color: "#52525b",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  footer: {
    position: "absolute",
    left: 40,
    right: 40,
    bottom: 28,
    borderTopWidth: 1,
    borderTopColor: "#e4e4e7",
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    color: "#71717a",
    textAlign: "center",
    marginBottom: 3,
  },
  footerMuted: {
    fontSize: 8,
    color: "#a1a1aa",
    textAlign: "center",
  },
});

function formatarData(date = new Date()) {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function rowStyle(index: number, total: number) {
  const isLast = index === total - 1;
  const isAlt = index % 2 === 1;
  if (isLast && isAlt) return styles.tableRowLastAlt;
  if (isLast) return styles.tableRowLast;
  if (isAlt) return styles.tableRowAlt;
  return styles.tableRow;
}

/** Exibe valor numérico ou "—" quando a nota ainda não foi lançada. */
function formatarCelulaNota(
  valor: number | string | null | undefined
): string {
  if (valor == null || valor === "") return "—";
  if (typeof valor === "string") {
    const trimmed = valor.trim();
    if (!trimmed || trimmed === "—" || trimmed.toLowerCase() === "null") {
      return "—";
    }
    const n = Number(trimmed.replace(",", "."));
    return Number.isFinite(n) ? n.toFixed(1) : trimmed;
  }
  if (typeof valor === "number") {
    return Number.isFinite(valor) ? valor.toFixed(1) : "—";
  }
  return "—";
}

function formatarFaltas(valor: number | string | null | undefined): string {
  if (valor == null || valor === "") return "—";
  if (typeof valor === "string") {
    const trimmed = valor.trim();
    if (!trimmed || trimmed === "—") return "—";
    const n = Number(trimmed);
    return Number.isFinite(n) ? String(Math.round(n)) : trimmed;
  }
  if (typeof valor === "number" && Number.isFinite(valor)) {
    return String(Math.round(valor));
  }
  return "—";
}

function paraNumero(valor: number | string | null | undefined): number | null {
  if (valor == null || valor === "" || valor === "—") return null;
  const n = typeof valor === "number" ? valor : Number(String(valor).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Média parcial: usa `media` informada ou calcula com N1/N2 lançados. */
function formatarMedia(nota: BoletimNota): string {
  if (nota.media != null && nota.media !== "") {
    return formatarCelulaNota(nota.media);
  }
  const vals = [paraNumero(nota.n1), paraNumero(nota.n2)].filter(
    (v): v is number => v != null
  );
  if (vals.length === 0) return "—";
  const media = vals.reduce((a, b) => a + b, 0) / vals.length;
  return media.toFixed(1);
}

function temComposicao(nota: BoletimNota): boolean {
  return Array.isArray(nota.composicao) && nota.composicao.length > 0;
}

function DetalheComposicao({ nota }: { nota: BoletimNota }) {
  const itens = nota.composicao ?? [];
  if (itens.length === 0) return null;

  return (
    // wrap={false}: evita cortar o bloco da disciplina entre páginas
    <View style={styles.detalheBloco} wrap={false}>
      <View style={styles.detalheCabecalho}>
        <Text style={styles.detalheDisciplina}>
          {String(nota.disciplina ?? "Disciplina").trim() || "Disciplina"}
        </Text>
        <Text style={styles.detalheTotal}>
          Total N1: {formatarCelulaNota(nota.n1)}
        </Text>
      </View>

      <View style={styles.detalheTabelaHeader}>
        <Text style={[styles.detalheTabelaHeaderCell, styles.detalheColAtividade]}>
          Atividade
        </Text>
        <Text style={[styles.detalheTabelaHeaderCell, styles.detalheColPeso]}>
          Peso
        </Text>
        <Text style={[styles.detalheTabelaHeaderCell, styles.detalheColNota]}>
          Nota
        </Text>
      </View>

      {itens.map((item, idx) => (
        <View
          key={`${item.label}-${idx}`}
          style={
            idx === itens.length - 1
              ? styles.detalheLinhaUltima
              : styles.detalheLinha
          }
        >
          <Text style={[styles.detalheCelula, styles.detalheColAtividade]}>
            {item.label}
          </Text>
          <Text style={[styles.detalheCelula, styles.detalheColPeso]}>
            {Number.isFinite(item.peso) ? item.peso.toFixed(1) : "—"}
          </Text>
          <Text style={[styles.detalheCelula, styles.detalheColNota]}>
            {formatarCelulaNota(item.nota)}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Documento PDF do boletim escolar (somente Document — sem PDFDownloadLink). */
export function BoletimDocument({ aluno, notas }: BoletimDocumentProps) {
  const dataAtual = formatarData();
  const turma =
    aluno.turma?.trim() && aluno.turma.trim() !== "—"
      ? aluno.turma.trim()
      : "Não informada";
  const notasComDetalhe = notas.filter(temComposicao);

  return (
    <Document
      title={`Boletim Escolar — ${aluno.nome}`}
      author="UniClassTech"
      subject="Boletim Escolar"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>UniClassTech</Text>
          <Text style={styles.subtitle}>Boletim Escolar</Text>
        </View>

        <View style={styles.alunoBox}>
          <View style={styles.alunoRow}>
            <Text style={styles.alunoLabel}>Nome</Text>
            <Text style={styles.alunoValue}>{aluno.nome}</Text>
          </View>
          <View style={styles.alunoRow}>
            <Text style={styles.alunoLabel}>RA</Text>
            <Text style={styles.alunoValue}>{aluno.ra}</Text>
          </View>
          <View style={styles.alunoRow}>
            <Text style={styles.alunoLabel}>Curso</Text>
            <Text style={styles.alunoValue}>{aluno.curso}</Text>
          </View>
          <View style={styles.alunoRowLast}>
            <Text style={styles.alunoLabel}>Turma</Text>
            <Text style={styles.alunoValue}>{turma}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Desempenho acadêmico</Text>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colDisciplina]}>
              Disciplina
            </Text>
            <Text style={[styles.tableHeaderCell, styles.colNota]}>N1</Text>
            <Text style={[styles.tableHeaderCell, styles.colNota]}>N2</Text>
            <Text style={[styles.tableHeaderCell, styles.colNota]}>Média</Text>
            <Text style={[styles.tableHeaderCell, styles.colFaltas]}>
              Faltas
            </Text>
          </View>

          {notas.length === 0 ? (
            <Text style={styles.emptyState}>
              Nenhuma disciplina registrada neste boletim.
            </Text>
          ) : (
            notas.map((nota, index) => (
              <View
                key={`${nota.disciplina}-${index}`}
                style={rowStyle(index, notas.length)}
              >
                <Text style={[styles.cellText, styles.colDisciplina]}>
                  {String(nota.disciplina ?? "—").trim() || "—"}
                </Text>
                <Text style={[styles.cellText, styles.colNota]}>
                  {formatarCelulaNota(nota.n1)}
                </Text>
                <Text style={[styles.cellText, styles.colNota]}>
                  {formatarCelulaNota(nota.n2)}
                </Text>
                <Text style={[styles.cellText, styles.colNota]}>
                  {formatarMedia(nota)}
                </Text>
                <Text style={[styles.cellText, styles.colFaltas]}>
                  {formatarFaltas(nota.faltas)}
                </Text>
              </View>
            ))
          )}
        </View>

        {notasComDetalhe.length > 0 && (
          <View style={styles.detalheSection}>
            <Text style={styles.detalheSectionTitle}>
              Detalhamento de avaliações
            </Text>
            {notasComDetalhe.map((nota, index) => (
              <DetalheComposicao
                key={`detalhe-${nota.disciplina}-${index}`}
                nota={nota}
              />
            ))}
          </View>
        )}

        <View style={styles.signatureBlock}>
          <View style={styles.signatureCol}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Secretaria Acadêmica</Text>
          </View>
          <View style={styles.signatureCol}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Coordenação do Curso</Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Documento gerado eletronicamente pelo sistema UniClassTech
          </Text>
          <Text style={styles.footerMuted}>Emitido em {dataAtual}</Text>
        </View>
      </Page>
    </Document>
  );
}

/** Alias mantido para imports existentes (`BoletimPDF`). */
export function BoletimPDF(props: BoletimDocumentProps) {
  return <BoletimDocument {...props} />;
}

export default BoletimDocument;
