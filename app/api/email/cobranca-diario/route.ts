import { Resend } from "resend";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import TemplateCobranca from "@/emails/TemplateCobranca";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  const denied = requireRole(req, ["admin"]);
  if (denied) return denied;

  try {
    const body = await req.json();
    const nomeProfessor = String(body.nomeProfessor ?? "").trim();
    const emailProfessor = String(body.emailProfessor ?? "").trim();
    const mensagemCobranca = String(body.mensagemCobranca ?? "").trim();

    if (!nomeProfessor || !emailProfessor || !mensagemCobranca) {
      return NextResponse.json(
        {
          error:
            "Campos 'nomeProfessor', 'emailProfessor' e 'mensagemCobranca' são obrigatórios.",
        },
        { status: 400 }
      );
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: "RESEND_API_KEY não configurada no ambiente." },
        { status: 500 }
      );
    }

    const destinatario =
      process.env.RESEND_TEST_EMAIL || emailProfessor;

    console.log("📨 Cobrança de diário — destino:", destinatario);

    const { data, error } = await resend.emails.send({
      from: "UniClassTech <onboarding@resend.dev>",
      to: destinatario,
      subject: "Cobrança Acadêmica: Diário de Classe Pendente",
      react: TemplateCobranca({
        nomeProfessor,
        mensagemCobranca,
      }),
    });

    if (error) {
      console.error("❌ Erro no Resend (cobrança diário):", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.log("✅ Cobrança de diário enviada. ID:", data?.id);

    return NextResponse.json({
      success: true,
      emailEnviado: emailProfessor,
      id: data?.id,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Falha ao enviar cobrança de diário.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
