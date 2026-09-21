import { Resend, type CreateEmailOptions } from "resend";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  const denied = requireRole(req, ["professor", "admin"]);
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

    // Sandbox Resend: envia sempre para o e-mail verificado do desenvolvedor;
    // o e-mail institucional (emailDoAluno) é o que devolvemos ao frontend.
    const emailDoAluno = to;
    const destinatarioReal =
      process.env.RESEND_TEST_EMAIL || "diego2000gomes@gmail.com";

    console.log("📨 Preparando envio para:", destinatarioReal);

    const payload = {
      from: "UniClassTech <onboarding@resend.dev>",
      to: destinatarioReal,
      subject,
      ...(text ? { text } : {}),
      ...(html ? { html } : {}),
    } as CreateEmailOptions;

    const { data, error } = await resend.emails.send(payload);

    if (error) {
      console.error("❌ Erro no Resend:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    console.log("✅ E-mail enviado com sucesso. ID:", data?.id);

    return NextResponse.json({
      success: true,
      emailEnviado: emailDoAluno,
      id: data?.id,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Falha ao enviar e-mail.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
