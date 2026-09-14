import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const role = request.cookies.get("uniclass_role")?.value;
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/aluno")) {
    if (role !== "aluno") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/professor/dashboard")) {
    if (role !== "professor") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/adm/dashboard")) {
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/adm/login", request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/aluno/:path*",
    "/professor/dashboard/:path*",
    "/adm/dashboard/:path*",
  ],
};
