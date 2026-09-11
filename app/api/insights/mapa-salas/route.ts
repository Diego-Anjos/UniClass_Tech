import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const FALLBACK_DICA =
  "Consulte os laboratórios com status 'Livre' para estudo prático individual durante seus horários vagos.";

function extrairTexto(
  completion: Awaited<ReturnType<typeof groq.chat.completions.create>>
): string {
  const content = completion?.choices[0]?.message?.content?.trim() ?? "";
  // gpt-oss às vezes devolve só um caractere quando o orçamento de tokens
  // é consumido pelo raciocínio interno — trate como inválido.
  if (content.length < 8) return "";
  return content;
}

export async function POST(req: NextRequest) {
  try {
    const { andar, salaProxima } = await req.json();

    const mensagens = [
      {
        role: "system" as const,
        content:
          "Aja como um assistente de campus inteligente. Dê uma dica curta e amigável em uma única frase sobre como o aluno pode aproveitar os laboratórios com status 'Livre' para estudar. Fale de forma natural e garanta que a frase tenha começo, meio e fim.",
      },
      {
        role: "user" as const,
        content: `O estudante está visualizando o ${andar}. Sua próxima aula é no ambiente '${salaProxima}'. Sugira como aproveitar um laboratório livre para estudar antes ou depois da aula.`,
      },
    ];

    let dica = "";

    try {
      const completion = await groq.chat.completions.create({
        messages: mensagens,
        model: "llama-3.1-70b-versatile",
        temperature: 0.6,
        max_tokens: 100,
      });
      dica = extrairTexto(completion);
    } catch (err) {
      console.warn("Falha no modelo primário (llama-3.1-70b-versatile):", err);
    }

    if (!dica) {
      try {
        const completion = await groq.chat.completions.create({
          messages: mensagens,
          model: "llama-3.1-8b-instant",
          temperature: 0.6,
          max_tokens: 100,
        });
        dica = extrairTexto(completion);
      } catch (err) {
        console.warn("Falha no modelo secundário (llama-3.1-8b-instant):", err);
      }
    }

    if (!dica) dica = FALLBACK_DICA;

    return NextResponse.json({ dica, insight: dica });
  } catch (error) {
    console.error("Erro crítico na API do mapa de salas:", error);
    return NextResponse.json({ insight: "Os insights gerados por IA estão temporariamente indisponíveis. Tente novamente mais tarde." }, { status: 200 });
  }
}
