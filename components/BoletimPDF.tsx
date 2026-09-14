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
};

export type BoletimNota = {
  disciplina: string;
  n1: number | string;
  n2: number | string;
  faltas: number;
};

type BoletimPDFProps = {
  aluno: BoletimAluno;
  notas: BoletimNota[];
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 48,
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
    marginBottom: 24,
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
  table: {
    borderWidth: 1,
    borderColor: "#d4d4d8",
    borderRadius: 2,
    overflow: "hidden",
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
  tableRowLast: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderBottomWidth: 0,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  colDisciplina: { width: "52%" },
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

export function BoletimPDF({ aluno, notas }: BoletimPDFProps) {
  const dataAtual = formatarData();

  return (
    <Document
      title={`Histórico e Boletim Acadêmico — ${aluno.nome}`}
      author="UniClassTech"
      subject="Histórico e Boletim Acadêmico"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>UniClassTech</Text>
          <Text style={styles.subtitle}>Histórico e Boletim Acadêmico</Text>
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
          <View style={styles.alunoRowLast}>
            <Text style={styles.alunoLabel}>Curso</Text>
            <Text style={styles.alunoValue}>{aluno.curso}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colDisciplina]}>
              Disciplina
            </Text>
            <Text style={[styles.tableHeaderCell, styles.colNota]}>N1</Text>
            <Text style={[styles.tableHeaderCell, styles.colNota]}>N2</Text>
            <Text style={[styles.tableHeaderCell, styles.colFaltas]}>
              Faltas
            </Text>
          </View>

          {notas.length === 0 ? (
            <Text style={styles.emptyState}>
              Nenhuma disciplina registrada neste boletim.
            </Text>
          ) : (
            notas.map((nota, index) => {
              const isLast = index === notas.length - 1;
              return (
                <View
                  key={`${nota.disciplina}-${index}`}
                  style={isLast ? styles.tableRowLast : styles.tableRow}
                >
                  <Text style={[styles.cellText, styles.colDisciplina]}>
                    {nota.disciplina}
                  </Text>
                  <Text style={[styles.cellText, styles.colNota]}>
                    {nota.n1}
                  </Text>
                  <Text style={[styles.cellText, styles.colNota]}>
                    {nota.n2}
                  </Text>
                  <Text style={[styles.cellText, styles.colFaltas]}>
                    {nota.faltas}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Documento gerado eletronicamente pelo sistema UniClassTech
          </Text>
          <Text style={styles.footerMuted}>{dataAtual}</Text>
        </View>
      </Page>
    </Document>
  );
}

export default BoletimPDF;
