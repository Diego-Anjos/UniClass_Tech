import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("uniclass_role", "", {
    path: "/",
    sameSite: "lax",
    maxAge: 0,
    httpOnly: true,
  });
  return response;
}
