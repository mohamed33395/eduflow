import { NextResponse, type NextRequest } from "next/server";
import {
  API_BASE,
  REFRESH_COOKIE,
  SESSION_COOKIE,
  setSessionCookies,
} from "@/app/lib/api-server";

/**
 * BFF catch-all proxy: forwards `/api/bff/<path>` → `<API_BASE>/api/<path>`
 * attaching the httpOnly access-token cookie as a Bearer token. On 401 it
 * performs a rotating refresh with `edu_rt`, stores the rotated cookies on
 * the response, and retries once.
 */

const UPSTREAM_REFRESH_COOKIE = "eduflow_refresh";
const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "te",
  "trailer",
  "upgrade",
  "host",
  "content-length",
]);

type Ctx = { params: Promise<{ path: string[] }> };

async function tryRefresh(rt: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  role?: string;
} | null> {
  const res = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: "POST",
    headers: { cookie: `${UPSTREAM_REFRESH_COOKIE}=${rt}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json().catch(() => null)) as {
    accessToken?: string;
    user?: { role?: string };
  } | null;
  if (!data?.accessToken) return null;
  // rotated refresh token arrives as an upstream Set-Cookie
  let refreshToken: string | undefined;
  for (const sc of res.headers.getSetCookie?.() ?? []) {
    const m = new RegExp(`^${UPSTREAM_REFRESH_COOKIE}=([^;]+)`).exec(sc);
    if (m) {
      refreshToken = m[1];
      break;
    }
  }
  return { accessToken: data.accessToken, refreshToken, role: data.user?.role };
}

async function handler(req: NextRequest, ctx: Ctx, method: string) {
  const { path } = await ctx.params;
  const suffix = path?.map(encodeURIComponent).join("/") ?? "";
  const url = `${API_BASE}/api/${suffix}${req.nextUrl.search}`;

  const rt = req.cookies.get(REFRESH_COOKIE)?.value;
  let access = req.cookies.get(SESSION_COOKIE)?.value;
  let rotated: Awaited<ReturnType<typeof tryRefresh>> = null;

  if (!access) {
    if (!rt) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    rotated = await tryRefresh(rt);
    if (!rotated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    access = rotated.accessToken;
  }

  // buffer the body so it can be replayed after a 401 refresh
  const body =
    method === "GET" || method === "HEAD" ? undefined : await req.text();

  const send = (token: string) => {
    const headers = new Headers();
    req.headers.forEach((value, key) => {
      if (!HOP_BY_HOP.has(key.toLowerCase())) headers.set(key, value);
    });
    headers.set("authorization", `Bearer ${token}`);
    return fetch(url, { method, headers, body, cache: "no-store" });
  };

  let res = await send(access);
  if (res.status === 401 && rt) {
    rotated = rotated ?? (await tryRefresh(rt));
    if (rotated) res = await send(rotated.accessToken);
  }

  const out = new NextResponse(res.body, {
    status: res.status,
    statusText: res.statusText,
  });
  res.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (!HOP_BY_HOP.has(k) && k !== "set-cookie") out.headers.set(key, value);
  });
  if (rotated) {
    setSessionCookies(out, {
      accessToken: rotated.accessToken,
      refreshToken: rotated.refreshToken,
      role: rotated.role,
    });
  }
  return out;
}

export const GET = (req: NextRequest, ctx: Ctx) => handler(req, ctx, "GET");
export const POST = (req: NextRequest, ctx: Ctx) => handler(req, ctx, "POST");
export const PATCH = (req: NextRequest, ctx: Ctx) => handler(req, ctx, "PATCH");
export const PUT = (req: NextRequest, ctx: Ctx) => handler(req, ctx, "PUT");
export const DELETE = (req: NextRequest, ctx: Ctx) =>
  handler(req, ctx, "DELETE");
