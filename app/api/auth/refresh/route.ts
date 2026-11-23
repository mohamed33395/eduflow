import { NextResponse, type NextRequest } from "next/server";
import {
  API_BASE,
  REFRESH_COOKIE,
  clearSessionCookies,
  setSessionCookies,
} from "@/app/lib/api-server";

const UPSTREAM_REFRESH_COOKIE = "eduflow_refresh";

/**
 * POST /api/auth/refresh — rotating refresh for browser-initiated calls.
 * Reads `edu_rt`, calls the upstream refresh endpoint (rotate=true),
 * and stores the rotated cookies.
 */
export async function POST(req: NextRequest) {
  const rt = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!rt) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const res = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: "POST",
    headers: { cookie: `${UPSTREAM_REFRESH_COOKIE}=${rt}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const out = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    clearSessionCookies(out);
    return out;
  }

  const data = (await res.json().catch(() => null)) as {
    accessToken?: string;
    user?: { role?: string };
  } | null;
  if (!data?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let refreshToken: string | undefined;
  for (const sc of res.headers.getSetCookie?.() ?? []) {
    const m = new RegExp(`^${UPSTREAM_REFRESH_COOKIE}=([^;]+)`).exec(sc);
    if (m) {
      refreshToken = decodeURIComponent(m[1]);
      break;
    }
  }

  const out = NextResponse.json({ ok: true });
  setSessionCookies(out, {
    accessToken: data.accessToken,
    refreshToken,
    role: data.user?.role?.toLowerCase(),
  });
  return out;
}
