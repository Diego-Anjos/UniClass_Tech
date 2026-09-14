import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim();
    const senha = String(body.senha ?? "");

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminSenha = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminSenha) {
      return NextResponse.json(
        { error: "Autenticação administrativa não configurada no servidor." },
        { status: 503 }
      );
    }

    if (email !== adminEmail || senha !== adminSenha) {
      return NextResponse.json(
        { error: "Credenciais administrativas inválidas." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      admin: {
        nome: "Secretaria Acadêmica",
        role: "admin" as const,
      },
    });

    response.cookies.set("uniclass_role", "admin", {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: true,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Credenciais administrativas inválidas." },
      { status: 500 }
    );
  }
}
