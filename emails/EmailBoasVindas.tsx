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

type EmailBoasVindasProps = {
  nomeAluno: string;
};

export default function EmailBoasVindas({ nomeAluno }: EmailBoasVindasProps) {
  const nomePartes = nomeAluno.split(" ");
  const nomeFormatado =
    nomePartes.length > 1
      ? `${nomePartes[0]} ${nomePartes[nomePartes.length - 1]}`
      : nomeAluno;

  return (
    <Html>
      <Head />
      <Preview>Sua jornada no UniClassTech começa agora!</Preview>
      <Tailwind>
        <Body className="bg-[#09090b] font-sans">
          <Container className="mx-auto mt-10 max-w-[560px] rounded-lg border border-[#27272a] bg-[#18181b] p-8">
            <Section>
              <Heading className="m-0 text-2xl font-bold text-white">
                UniClassTech
              </Heading>
              <Heading className="mt-6 text-xl text-white">
                Olá, {nomeFormatado}! Bem-vindo(a) a bordo. 🚀
              </Heading>
              <Text className="mt-4 text-base leading-relaxed text-[#a1a1aa]">
                As portas do conhecimento estão oficialmente abertas. Sua conta
                no UniClassTech foi configurada com sucesso. A partir de agora,
                seu Diário de Classe, Boletim Inteligente e Mapa de Salas estão
                a um clique de distância.
              </Text>
              <Button
                href="#"
                className="mt-4 inline-block rounded-md bg-white px-6 py-3 text-center text-sm font-semibold text-black no-underline"
              >
                Acessar Portal do Aluno
              </Button>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
