import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ApiError } from "./api";
import { toAppUser } from "./mappers";
import type { AppUser } from "@/app/types";

/**
 * Server-side API layer. Calls the Nest API directly using the session
 * cookies (`edu_session` = access token, `edu_rt` = refresh token).
 * Refresh during SSR uses `rotate=false` so the browser's stored refresh
 * token is never consumed by a render.
 */

export const API_BASE = (
  process.env.API_BASE_URL ?? "http://localhost:3001"
).replace(/\/+$/, "");

export { ApiError } from "./api";

export const SESSION_COOKIE = "edu_session";
export const ROLE_COOKIE = "edu_role";
export const REFRESH_COOKIE = "edu_rt";

/** Backend refresh cookie name (scoped to /api/auth upstream). */
const UPSTREAM_REFRESH_COOKIE = "eduflow_refresh";

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const isProd = process.env.NODE_ENV === "production";

// ── cookie helpers ─────────────────────────────────────────────────

function accessTtlSeconds(token: string): number {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString("utf8")
    ) as { exp?: number };
    if (payload.exp) return Math.max(0, payload.exp - Math.floor(Date.now() / 1000));
  } catch {
    // fall through
  }
  return 15 * 60;
}

export function setSessionCookies(
  res: NextResponse,
  opts: { accessToken: string; refreshToken?: string; role?: string }
) {
  const base = { sameSite: "lax" as const, secure: isProd, path: "/" };
  res.cookies.set(SESSION_COOKIE, opts.accessToken, {
    ...base,
    httpOnly: true,
    maxAge: accessTtlSeconds(opts.accessToken),
  });
  if (opts.role) {
    res.cookies.set(ROLE_COOKIE, opts.role, {
      ...base,
      httpOnly: false,
      maxAge: Math.floor(REFRESH_TTL_MS / 1000),
    });
  }
  if (opts.refreshToken) {
    res.cookies.set(REFRESH_COOKIE, opts.refreshToken, {
      ...base,
      httpOnly: true,
      maxAge: Math.floor(REFRESH_TTL_MS / 1000),
    });
  }
}

export function clearSessionCookies(res: NextResponse) {
  for (const name of [SESSION_COOKIE, ROLE_COOKIE, REFRESH_COOKIE]) {
    res.cookies.set(name, "", { path: "/", maxAge: 0 });
  }
}

// ── upstream calls ─────────────────────────────────────────────────

async function upstream(
  path: string,
  init: RequestInit & { accessToken?: string } = {}
): Promise<Response> {
  const { accessToken, ...rest } = init;
  const headers = new Headers(rest.headers);
  if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);
  return fetch(`${API_BASE}/api${path}`, { ...rest, headers, cache: "no-store" });
}

/** Non-rotating refresh: returns a fresh access token without consuming the refresh token. */
async function refreshAccessToken(rt: string): Promise<string | null> {
  const res = await fetch(`${API_BASE}/api/auth/refresh?rotate=false`, {
    method: "POST",
    headers: { cookie: `${UPSTREAM_REFRESH_COOKIE}=${rt}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json().catch(() => null)) as {
    accessToken?: string;
  } | null;
  return data?.accessToken ?? null;
}

interface ServerFetchOptions {
  method?: string;
  body?: unknown;
  /** Extra cookies to forward upstream (e.g. refresh cookie on auth calls). */
  cookieHeader?: string;
}

/**
 * Authenticated fetch to the Nest API from server code (RSC, route handlers).
 * Reads the access/refresh tokens from the request cookies; silently renews
 * the access token when expired (non-rotating, so the browser's refresh
 * token stays valid).
 */
export async function apiFetchServer<T = unknown>(
  path: string,
  options: ServerFetchOptions = {}
): Promise<T> {
  const store = await cookies();
  const rt = store.get(REFRESH_COOKIE)?.value;
  let access = store.get(SESSION_COOKIE)?.value;

  if (!access && rt) {
    access = (await refreshAccessToken(rt)) ?? undefined;
  }

  const headers: Record<string, string> = {
    ...(options.body !== undefined && { "Content-Type": "application/json" }),
    ...(options.cookieHeader && { cookie: options.cookieHeader }),
  };

  let res = await upstream(path, {
    method: options.method ?? "GET",
    headers,
    accessToken: access,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401 && rt) {
    const renewed = await refreshAccessToken(rt);
    if (renewed) {
      res = await upstream(path, {
        method: options.method ?? "GET",
        headers,
        accessToken: renewed,
        body:
          options.body !== undefined ? JSON.stringify(options.body) : undefined,
      });
    }
  }

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      (data as { error?: string; message?: string | string[] } | null)?.error ??
      (Array.isArray((data as { message?: unknown })?.message)
        ? ((data as { message: string[] }).message.join("; "))
        : (data as { message?: string })?.message) ??
      `Request failed (${res.status})`;
    throw new ApiError(res.status, msg, data);
  }
  return data as T;
}

/** Fetch every page of a paginated list endpoint (`{ items, total, ... }`). */
export async function fetchAllPages<T = unknown>(path: string): Promise<T[]> {
  const all: T[] = [];
  for (let page = 1; page <= 100; page++) {
    const sep = path.includes("?") ? "&" : "?";
    const data = await apiFetchServer<{
      items?: T[];
      total?: number;
    }>(`${path}${sep}page=${page}&limit=100`);
    const items = Array.isArray(data) ? (data as unknown as T[]) : data.items ?? [];
    all.push(...items);
    if (items.length < 100) break;
  }
  return all;
}

// ── session ────────────────────────────────────────────────────────

/**
 * Resolves the signed-in user in server contexts. Replaces the old
 * Firebase-ID-token based session.
 */
export async function getSessionUser(): Promise<AppUser | null> {
  try {
    const me = await apiFetchServer<Record<string, unknown>>("/auth/me");
    return toAppUser(me);
  } catch {
    return null;
  }
}

/** Look up a user by exact email (uses the users `search` filter). */
export async function findUserByEmail(
  email: string
): Promise<Record<string, unknown> | undefined> {
  const data = await apiFetchServer<unknown>(
    `/users?search=${encodeURIComponent(email)}&limit=50`
  );
  const items = Array.isArray(data)
    ? data
    : ((data as { items?: Record<string, unknown>[] })?.items ?? []);
  return items.find(
    (u) =>
      typeof u.email === "string" &&
      u.email.toLowerCase() === email.toLowerCase()
  );
}

/** Map an unknown error thrown by apiFetchServer to a NextResponse. */
export function apiErrorResponse(err: unknown, fallback = "Request failed") {
  if (err instanceof ApiError) {
    const data = err.data as { error?: string; message?: string | string[] } | null;
    const message =
      data?.error ??
      (Array.isArray(data?.message) ? data.message.join("; ") : data?.message) ??
      err.message;
    return NextResponse.json({ error: message }, { status: err.status });
  }
  return NextResponse.json(
    { error: err instanceof Error ? err.message : fallback },
    { status: 500 }
  );
}
