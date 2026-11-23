import { NextResponse, type NextRequest } from "next/server";
import {
  API_BASE,
  REFRESH_COOKIE,
  clearSessionCookies,
  setSessionCookies,
} from "@/app/lib/api-server";
import { toAppUser } from "@/app/lib/mappers";

const UPSTREAM_REFRESH_COOKIE = "eduflow_refresh";

function extractRefreshCookie(res: Response): string | undefined {
  for (const sc of res.headers.getSetCookie?.() ?? []) {
    const m = new RegExp(`^${UPSTREAM_REFRESH_COOKIE}=([^;]+)`).exec(sc);
    if (m) return decodeURIComponent(m[1]);
  }
  return undefined;
}

/** POST /api/auth/session — log in with email/username + password. */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      identifier?: string;
      email?: string; // legacy field name
      password?: string;
      token?: string; // multi-stage step token
    };
    const identifier = body.identifier ?? body.email;
    if (!identifier || !body.password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const isMultiStage = typeof body.token === "string" && body.token.length > 0;

    const res = await fetch(
      `${API_BASE}/api/${isMultiStage ? "auths/login-step" : "auth/login"}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isMultiStage
            ? { identifier, password: body.password, token: body.token }
            : { identifier, password: body.password }
        ),
        cache: "no-store",
      }
    );

    const data = (await res.json().catch(() => null)) as {
      accessToken?: string;
      user?: Record<string, unknown>;
      payload?: {
        accessToken?: string;
        user?: Record<string, unknown>;
        token?: string;
        login_way?: unknown;
      };
      message?: string | string[];
      error?: string;
    } | null;

    if (isMultiStage) {
      const payload = data?.payload;
      if (res.ok && payload?.user && payload.accessToken) {
        const user = toAppUser(payload.user);
        const out = NextResponse.json({ ok: true, role: user.role, user });
        setSessionCookies(out, {
          accessToken: payload.accessToken,
          refreshToken: extractRefreshCookie(res),
          role: user.role,
        });
        return out;
      }
      if (res.ok && payload) {
        // Another login step is required — hand the payload back to the client.
        return NextResponse.json({ ok: true, payload });
      }
      const message =
        data?.error ??
        (Array.isArray(data?.message)
          ? data.message.join("; ")
          : data?.message) ??
        "Invalid credentials";
      return NextResponse.json(
        { error: message },
        { status: res.status || 401 }
      );
    }

    if (!res.ok || !data?.accessToken || !data.user) {
      const message =
        data?.error ??
        (Array.isArray(data?.message)
          ? data.message.join("; ")
          : data?.message) ??
        "Invalid credentials";
      return NextResponse.json({ error: message }, { status: res.status || 401 });
    }

    const user = toAppUser(data.user);
    const out = NextResponse.json({ ok: true, role: user.role, user });
    setSessionCookies(out, {
      accessToken: data.accessToken,
      refreshToken: extractRefreshCookie(res),
      role: user.role,
    });
    return out;
  } catch (err) {
    console.error("[api/auth/session] login failed:", err);
    const unreachable =
      err instanceof TypeError &&
      (err.message === "fetch failed" ||
        [
          "ECONNREFUSED",
          "ENOTFOUND",
          "ETIMEDOUT",
          "ECONNRESET",
          "UND_ERR_SOCKET",
        ].includes((err as { cause?: { code?: string } }).cause?.code ?? ""));
    return NextResponse.json(
      {
        error: unreachable
          ? "serviceUnavailable"
          : err instanceof Error
            ? err.message
            : "Login failed",
      },
      { status: unreachable ? 503 : 500 }
    );
  }
}

/** DELETE /api/auth/session — log out (revokes the refresh token upstream). */
export async function DELETE(req: NextRequest) {
  const rt = req.cookies.get(REFRESH_COOKIE)?.value;
  try {
    if (rt) {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        headers: { cookie: `${UPSTREAM_REFRESH_COOKIE}=${rt}` },
        cache: "no-store",
      }).catch(() => null);
    }
  } finally {
    const out = NextResponse.json({ ok: true });
    clearSessionCookies(out);
    return out;
  }
}
