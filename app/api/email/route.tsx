import * as React from "react";
import { Resend } from "resend";
import { NextResponse } from "next/server";
import EmailBoasVindas from "@/emails/EmailBoasVindas";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { para, assunto, nomeAluno } = await request.json();

    console.log("Tentando enviar e-mail para:", para);

    const { data, error } = await resend.emails.send({
      from: "UniClassTech <onboarding@resend.dev>",
      to: [para],
      subject: assunto,
      react: <EmailBoasVindas nomeAluno={nomeAluno} />,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Falha ao enviar e-mail.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
