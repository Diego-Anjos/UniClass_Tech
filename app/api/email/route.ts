import { Resend } from "resend";
import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  const denied = requireApiAuth(req);
  if (denied) return denied;

  try {
    const body = await req.json();
    const to = String(body.to ?? "").trim();
    const subject = String(body.subject ?? "").trim();
    const text = body.text != null ? String(body.text) : undefined;
    const html = body.html != null ? String(body.html) : undefined;

    if (!to || !subject) {
      return NextResponse.json(
        { error: "Campos 'to' e 'subject' são obrigatórios." },
        { status: 400 }
      );
    }

    if (!text && !html) {
      return NextResponse.json(
        { error: "Informe ao menos 'text' ou 'html' no corpo da requisição." },
        { status: 400 }
      );
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: "RESEND_API_KEY não configurada no ambiente." },
        { status: 500 }
      );
    }

    const { data, error } = await resend.emails.send({
      from: "UniClassTech <onboarding@resend.dev>",
      to: [to],
      subject,
      ...(text ? { text } : {}),
      ...(html ? { html } : {}),
    });

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Falha ao enviar e-mail.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
