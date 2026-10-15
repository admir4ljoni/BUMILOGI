import { NextResponse, type NextRequest } from "next/server";

const API_URL = process.env.API_URL ?? "http://127.0.0.1:8080";

// Decodes (does not verify; only Go verifies) the access JWT's exp.
function expiresSoon(jwt: string | undefined) {
  if (!jwt) return true;
  try {
    const { exp } = JSON.parse(atob(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return exp * 1000 - Date.now() < 60_000;
  } catch {
    return true;
  }
}

// Server components can't set cookies, so the session is refreshed here, before
// render. New cookies go on the forwarded request (so this render sees them) and
// on the response (so the browser keeps them).
export async function proxy(req: NextRequest) {
  const refresh = req.cookies.get("refresh_token")?.value;
  if (!refresh || !expiresSoon(req.cookies.get("access_token")?.value)) return NextResponse.next();

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1/auth/refresh`, { method: "POST", headers: { cookie: `refresh_token=${refresh}` } });
  } catch {
    return NextResponse.next(); // API down: keep cookies, the page shows its own error
  }

  if (res.status === 401) {
    req.cookies.delete("access_token");
    req.cookies.delete("refresh_token");
    const out = NextResponse.next({ request: { headers: req.headers } });
    out.cookies.delete("access_token");
    out.cookies.delete("refresh_token");
    return out;
  }
  if (!res.ok) return NextResponse.next();

  const setCookies = res.headers.getSetCookie();
  for (const c of setCookies) {
    const pair = c.split(";")[0];
    const i = pair.indexOf("=");
    req.cookies.set(pair.slice(0, i), pair.slice(i + 1));
  }
  const out = NextResponse.next({ request: { headers: req.headers } });
  for (const c of setCookies) out.headers.append("set-cookie", c);
  return out;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
