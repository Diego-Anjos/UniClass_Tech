import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { requireApiAuth, serviceUnavailable } from "@/lib/api-auth";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  const denied = requireApiAuth(req);
  if (denied) return denied;

  try {
    const { turma, presentes, faltas, total } = await req.json();

    const taxaFalta = Math.round((faltas / (total || 1)) * 100);

    const systemPrompt = `Você é um assistente pedagógico. Baseado nos dados da chamada de hoje, gere um insight curto (máximo 2 linhas) para o professor. 
Retorne um JSON: { "tipoAlerta": "ALERTA DE FREQUÊNCIA" ou "ENGAJAMENTO ALTO", "mensagem": "texto aqui" }`;

    const userPrompt = `Turma: ${turma}. Hoje: ${presentes} presentes, ${faltas} faltas. Taxa de ausência diária: ${taxaFalta}%.`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      model: "llama3-70b-8192",
      temperature: 0.5,
      response_format: { type: "json_object" }
    });

    const data = JSON.parse(completion.choices[0]?.message?.content || "{}");
    return NextResponse.json(data);
  } catch (error) {
    return serviceUnavailable("Os insights gerados por IA estão temporariamente indisponíveis.");
  }
}
