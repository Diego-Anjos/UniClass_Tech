import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

Font.registerHyphenationCallback((word) => [word]);

export type EmentaDisciplina = {
  nome: string;
  cargaHoraria: number;
  semestre?: number;
  professor?: string | null;
  conteudoProgramatico?: string | null;
};

export type EmentaDocumentProps = {
  nomeAluno: string;
  curso: string;
  ra?: string;
  disciplinas: EmentaDisciplina[];
};

function conteudoPlaceholder(nomeDisciplina: string): string {
  return `Estudo aprofundado dos conceitos e aplicações práticas referentes à ${nomeDisciplina}.`;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 56,
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
    fontSize: 18,
    color: "#09090b",
    letterSpacing: 0.6,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 10,
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
    marginBottom: 22,
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
    width: 64,
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
    marginBottom: 12,
  },
  disciplinaCard: {
    borderWidth: 1,
    borderColor: "#e4e4e7",
    borderRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    backgroundColor: "#fafafa",
  },
  disciplinaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
    gap: 8,
  },
  disciplinaNome: {
    flex: 1,
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: "#09090b",
  },
  cargaBadge: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: "#3f3f46",
    backgroundColor: "#e4e4e7",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 3,
  },
  metaLinha: {
    fontSize: 8,
    color: "#71717a",
    marginBottom: 8,
  },
  conteudoLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: "#52525b",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  conteudoTexto: {
    fontSize: 9,
    color: "#3f3f46",
    lineHeight: 1.45,
  },
  emptyState: {
    borderWidth: 1,
    borderColor: "#e4e4e7",
    borderRadius: 4,
    padding: 16,
    color: "#71717a",
    fontSize: 10,
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: "#e4e4e7",
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 8,
    color: "#a1a1aa",
  },
});

export function EmentaDocument({
  nomeAluno,
  curso,
  ra,
  disciplinas,
}: EmentaDocumentProps) {
  const dataEmissao = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const ordenadas = [...disciplinas].sort((a, b) => {
    const sa = a.semestre ?? 0;
    const sb = b.semestre ?? 0;
    if (sa !== sb) return sa - sb;
    return a.nome.localeCompare(b.nome, "pt-BR");
  });

  return (
    <Document
      title={`Ementa Curricular — ${curso || "Curso"}`}
      author="UniClassTech"
      subject="Ementa curricular do curso"
    >
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header} fixed>
          <Text style={styles.brand}>UniClassTech - Ementa Curricular</Text>
          <Text style={styles.subtitle}>Documento oficial da grade do curso</Text>
        </View>

        <View style={styles.alunoBox}>
          <View style={styles.alunoRow}>
            <Text style={styles.alunoLabel}>Aluno</Text>
            <Text style={styles.alunoValue}>{nomeAluno || "—"}</Text>
          </View>
          {ra ? (
            <View style={styles.alunoRow}>
              <Text style={styles.alunoLabel}>RA</Text>
              <Text style={styles.alunoValue}>{ra}</Text>
            </View>
          ) : null}
          <View style={styles.alunoRowLast}>
            <Text style={styles.alunoLabel}>Curso</Text>
            <Text style={styles.alunoValue}>{curso || "—"}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          Disciplinas ({ordenadas.length})
        </Text>

        {ordenadas.length === 0 ? (
          <Text style={styles.emptyState}>
            Nenhuma disciplina disponível para gerar a ementa neste momento.
          </Text>
        ) : (
          ordenadas.map((disciplina, index) => {
            const nome = disciplina.nome?.trim() || `Disciplina ${index + 1}`;
            const carga =
              Number.isFinite(disciplina.cargaHoraria) &&
              disciplina.cargaHoraria > 0
                ? disciplina.cargaHoraria
                : 80;
            const conteudo =
              disciplina.conteudoProgramatico?.trim() ||
              conteudoPlaceholder(nome);

            return (
              <View
                key={`${nome}-${disciplina.semestre ?? index}-${index}`}
                style={styles.disciplinaCard}
                wrap={false}
              >
                <View style={styles.disciplinaHeader}>
                  <Text style={styles.disciplinaNome}>{nome}</Text>
                  <Text style={styles.cargaBadge}>{carga}h</Text>
                </View>
                {(disciplina.semestre || disciplina.professor) && (
                  <Text style={styles.metaLinha}>
                    {[
                      disciplina.semestre
                        ? `${disciplina.semestre}º semestre`
                        : null,
                      disciplina.professor
                        ? `Prof. ${disciplina.professor}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                )}
                <Text style={styles.conteudoLabel}>Conteúdo Programático</Text>
                <Text style={styles.conteudoTexto}>{conteudo}</Text>
              </View>
            );
          })
        )}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Emitido em {dataEmissao} · UniClassTech
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

export default EmentaDocument;
