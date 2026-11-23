import { NextResponse, type NextRequest } from "next/server";
import { ApiError, apiFetchServer } from "@/app/lib/api-server";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const code = body.code ?? body.token;
    const newPassword = body.newPassword;

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }
    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    await apiFetchServer("/auth/reset-password", {
      method: "POST",
      body: { token: code, newPassword },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/forgot-password/reset] failed:", err);
    if (err instanceof ApiError) {
      const message =
        err.status === 400 || err.status === 401
          ? "Invalid or expired verification code"
          : err.message;
      return NextResponse.json({ error: message }, { status: err.status });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Reset failed" },
      { status: 500 }
    );
  }
}
