import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

const PUBLIC_PATHS = ["/login"];

/** Login page, manifest, icons, sw.js etc. ko chhod kar baaki sab protected. */
/** Next 16: ye file "proxy" convention use karti hai (pehle middleware tha). */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Logged-in user login page par na jaaye
  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Default PIN abhi bhi lag raha hai → pehle change karwao
  if (session.mustChangePin && pathname !== "/change-pin") {
    const url = req.nextUrl.clone();
    url.pathname = "/change-pin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|icon\\.svg|manifest\\.webmanifest|sw\\.js|icon-192\\.png|icon-512\\.png|icon-180\\.png).*)",
  ],
};
