import {
  Html,
  Body,
  Head,
  Heading,
  Container,
  Preview,
  Section,
  Text,
  Button,
  Tailwind,
} from "@react-email/components";

type TemplateCobrancaProps = {
  nomeProfessor: string;
  mensagemCobranca: string;
};

export default function TemplateCobranca({
  nomeProfessor,
  mensagemCobranca,
}: TemplateCobrancaProps) {
  const nomePartes = nomeProfessor.trim().split(/\s+/).filter(Boolean);
  const nomeFormatado =
    nomePartes.length > 1
      ? `${nomePartes[0]} ${nomePartes[nomePartes.length - 1]}`
      : nomeProfessor.trim() || "Professor(a)";

  return (
    <Html>
      <Head />
      <Preview>Cobrança acadêmica: diário de classe pendente</Preview>
      <Tailwind>
        <Body className="bg-[#09090b] font-sans">
          <Container className="mx-auto mt-10 max-w-[560px] rounded-lg border border-[#27272a] bg-[#18181b] p-8">
            <Section>
              <Heading className="m-0 text-2xl font-bold text-white">
                UniClassTech
              </Heading>
              <Heading className="mt-6 text-xl text-white">
                Olá, Prof(a). {nomeFormatado}
              </Heading>
              <Text className="mt-4 text-base leading-relaxed text-[#a1a1aa]">
                Identificamos pendência no fechamento do Diário de Classe. A
                coordenação solicita regularização o quanto antes para manter a
                conformidade acadêmica do semestre.
              </Text>
              <Text className="mt-4 rounded-md border border-[#854d0e]/40 bg-[#422006]/40 px-4 py-3 text-sm leading-relaxed text-[#fde68a]">
                {mensagemCobranca}
              </Text>
              <Button
                href="#"
                className="mt-6 inline-block rounded-md bg-white px-6 py-3 text-center text-sm font-semibold text-black no-underline"
              >
                Acessar Portal do Professor
              </Button>
              <Text className="mt-6 text-xs leading-relaxed text-[#71717a]">
                Esta cobrança acadêmica foi disparada pela coordenação via
                UniClassTech.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
