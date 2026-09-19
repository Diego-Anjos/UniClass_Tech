import { NextResponse } from "next/server";

export type UniclassRole = "aluno" | "professor" | "admin";

const ROLE_COOKIE = "uniclass_role";
const UID_COOKIE = "uniclass_uid";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

const ROLE_COOKIE_RE =
  /(?:^|;\s*)uniclass_role=(aluno|professor|admin)(?:;|$)/;
const UID_COOKIE_RE = /(?:^|;\s*)uniclass_uid=([^;]+)(?:;|$)/;

export type ApiSession = {
  role: UniclassRole;
  /** Professor id, aluno RA, ou "admin" — conforme o login. */
  uid: string | null;
  viaApiKey: boolean;
};

function cookieOptions(maxAge: number) {
  return {
    path: "/",
    sameSite: "lax" as const,
    maxAge,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };
}

/** Grava cookies de papel + identidade no login. */
export function applySessionCookies(
  response: NextResponse,
  role: UniclassRole,
  uid: string
) {
  const opts = cookieOptions(COOKIE_MAX_AGE);
  response.cookies.set(ROLE_COOKIE, role, opts);
  response.cookies.set(UID_COOKIE, uid, opts);
}

/** Limpa cookies de sessão no logout. */
export function clearSessionCookies(response: NextResponse) {
  const opts = cookieOptions(0);
  response.cookies.set(ROLE_COOKIE, "", opts);
  response.cookies.set(UID_COOKIE, "", opts);
}

function parseCookieValue(
  cookieHeader: string,
  re: RegExp
): string | null {
  const match = cookieHeader.match(re);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1].trim());
  } catch {
    return match[1].trim();
  }
}

/** Lê papel + uid dos cookies (ou bypass via API key). */
export function getApiSession(request: Request): ApiSession | null {
  const expectedKey = process.env.UNICLASS_API_KEY;
  const providedKey = request.headers.get("x-api-key");

  if (expectedKey && providedKey === expectedKey) {
    return { role: "admin", uid: "api-key", viaApiKey: true };
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const role = parseCookieValue(cookieHeader, ROLE_COOKIE_RE) as
    | UniclassRole
    | null;
  if (!role || !["aluno", "professor", "admin"].includes(role)) {
    return null;
  }

  const uid = parseCookieValue(cookieHeader, UID_COOKIE_RE);
  return { role, uid, viaApiKey: false };
}

/**
 * Aceita `x-api-key` (UNICLASS_API_KEY) ou cookie de sessão `uniclass_role`.
 * Retorna NextResponse 401 se não autorizado; null se ok.
 * Prefira `requireRole` em rotas sensíveis.
 */
export function requireApiAuth(request: Request): NextResponse | null {
  if (getApiSession(request)) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * Exige que a sessão tenha um dos papéis permitidos.
 * API key trata-se como admin (bypass de papel).
 */
export function requireRole(
  request: Request,
  allowed: UniclassRole[]
): NextResponse | null {
  const session = getApiSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.viaApiKey) return null;
  if (!allowed.includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

/**
 * Professor só acessa o próprio `professorId`; admin/API key podem qualquer id.
 * Retorna 403 se houver mismatch; null se ok.
 */
export function requireProfessorOwnership(
  request: Request,
  professorId: string
): NextResponse | null {
  const session = getApiSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.viaApiKey || session.role === "admin") return null;
  if (session.role !== "professor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session.uid) {
    return NextResponse.json(
      { error: "Sessão incompleta. Faça login novamente." },
      { status: 401 }
    );
  }
  if (session.uid !== professorId) {
    return NextResponse.json(
      { error: "Forbidden: professorId não corresponde à sessão." },
      { status: 403 }
    );
  }
  return null;
}

export function serviceUnavailable(
  message = "Serviço temporariamente indisponível."
) {
  return NextResponse.json({ error: message }, { status: 503 });
}
