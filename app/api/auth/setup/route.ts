import { NextResponse, type NextRequest } from "next/server";
import { API_BASE } from "@/app/lib/api-server";
import { usernameFromEmail } from "@/app/lib/mappers";

export async function POST(req: NextRequest) {
  const { email, password, name, username } = (await req.json()) as {
    email?: string;
    password?: string;
    name?: string;
    username?: string;
  };

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(`${API_BASE}/api/auth/setup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name || email,
        username: username || usernameFromEmail(email),
        email,
        password,
      }),
      cache: "no-store",
    });

    const data = (await res.json().catch(() => null)) as {
      id?: string;
      message?: string | string[];
      error?: string;
    } | null;

    if (!res.ok) {
      const message =
        data?.error ??
        (Array.isArray(data?.message)
          ? data.message.join("; ")
          : data?.message) ??
        "Setup failed";
      return NextResponse.json(
        { error: message },
        { status: res.status === 409 ? 403 : res.status }
      );
    }

    return NextResponse.json({
      ok: true,
      uid: data?.id,
      email,
      role: "super_admin",
    });
  } catch (err) {
    console.error("[api/auth/setup] failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Setup failed" },
      { status: 500 }
    );
  }
}
