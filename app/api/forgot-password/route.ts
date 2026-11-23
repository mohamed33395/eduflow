import { NextResponse, type NextRequest } from "next/server";
import { ApiError, apiFetchServer } from "@/app/lib/api-server";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const identifier = body.identifier ?? body.phone;

    if (!identifier || typeof identifier !== "string" || !identifier.trim()) {
      return NextResponse.json(
        { error: "Username, email, or phone is required" },
        { status: 400 }
      );
    }

    const result = await apiFetchServer<{
      ok: boolean;
      devResetToken?: string;
    }>("/auth/forgot-password", {
      method: "POST",
      body: { identifier: identifier.trim() },
    });

    // In development the backend returns the reset token directly — expose it
    // as debugCode so the reset form can be completed without email/SMS delivery.
    if (result.devResetToken) {
      return NextResponse.json({
        ok: true,
        identifier: identifier.trim(),
        debugCode: result.devResetToken,
      });
    }

    return NextResponse.json({ ok: true, identifier: identifier.trim() });
  } catch (err) {
    console.error("[api/forgot-password] send failed:", err);
    if (err instanceof ApiError) {
      const message =
        err.status === 404
          ? "No account found for this identifier"
          : err.message;
      return NextResponse.json({ error: message }, { status: err.status });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Send failed" },
      { status: 500 }
    );
  }
}
