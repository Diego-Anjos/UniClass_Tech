import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";

export async function GET(req: Request) {
  const denied = requireApiAuth(req);
  if (denied) return denied;

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      {
        status: "error",
        error: "RESEND_API_KEY não configurada no ambiente.",
      },
      { status: 400 }
    );
  }

  try {
    const res = await fetch("https://api.resend.com/domains", {
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
    });

    if (res.ok) {
      return NextResponse.json({
        status: "ok",
        provider: "resend",
        message: "Conexão com Resend estabelecida com sucesso.",
      });
    }

    const status = res.status === 401 || res.status === 403 ? 401 : 400;
    return NextResponse.json(
      {
        status: "error",
        error: "Falha ao autenticar com a API do Resend. Verifique a chave.",
      },
      { status }
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Falha ao conectar com o Resend.";
    console.error("[/api/settings/test-resend] Erro:", message);
    return NextResponse.json({ status: "error", error: message }, { status: 400 });
  }
}
