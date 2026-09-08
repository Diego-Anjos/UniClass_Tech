import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { codigo, curso, turno, semestre, matriculados, capacidade } =
      await req.json();

    const taxaOcupacao = Math.round((matriculados / (capacidade || 40)) * 100);

    const systemPrompt = `Você é o gestor acadêmico do ERP UniClassTech.
Gere uma análise direta e estratégica de no máximo 2 frases para a diretoria sobre a ocupação e alocação pedagógica da turma informada. Sem markdown nem aspas adicionais.`;

    const userPrompt = `Turma: ${codigo} - ${curso} (${semestre}, Turno: ${turno}).
Ocupação: ${matriculados}/${capacidade} vagas (${taxaOcupacao}%).`;

    let completion;
    try {
      completion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        model: "openai/gpt-oss-20b",
        temperature: 0.5,
        max_tokens: 120,
      });
    } catch {
      completion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        model: "llama-3.1-8b-instant",
        temperature: 0.5,
        max_tokens: 120,
      });
    }

    const analise =
      completion?.choices[0]?.message?.content ||
      `Turma com ocupação dentro do planejamento acadêmico com infraestrutura e alocação docente em dia.`;

    return NextResponse.json({ analise });
  } catch {
    return NextResponse.json({
      analise:
        "Turma monitorada em tempo real com conformidade pedagógica regular.",
    });
  }
}
