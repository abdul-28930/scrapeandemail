import { NextRequest, NextResponse } from "next/server";

// Optional basic-auth gate: the app can send email, so protect it if exposed.
export function middleware(req: NextRequest) {
  const pw = process.env.APP_PASSWORD;
  if (!pw) return NextResponse.next();
  const auth = req.headers.get("authorization") ?? "";
  if (auth.startsWith("Basic ") && atob(auth.slice(6)).split(":").slice(1).join(":") === pw)
    return NextResponse.next();
  return new NextResponse("Auth required", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="Zeta"' } });
}
