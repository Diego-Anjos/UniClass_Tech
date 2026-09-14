import { NextResponse } from "next/server";

const ROLE_COOKIE_RE =
  /(?:^|;\s*)uniclass_role=(aluno|professor|admin)(?:;|$)/;

/**
 * Aceita `x-api-key` (UNICLASS_API_KEY) ou cookie de sessão `uniclass_role`.
 * Retorna NextResponse 401 se não autorizado; null se ok.
 */
export function requireApiAuth(request: Request): NextResponse | null {
  const expectedKey = process.env.UNICLASS_API_KEY;
  const providedKey = request.headers.get("x-api-key");

  if (expectedKey && providedKey === expectedKey) {
    return null;
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  if (ROLE_COOKIE_RE.test(cookieHeader)) {
    return null;
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function serviceUnavailable(message = "Serviço temporariamente indisponível.") {
  return NextResponse.json({ error: message }, { status: 503 });
}
