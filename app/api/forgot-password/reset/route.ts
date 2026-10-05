import { NextResponse, type NextRequest } from "next/server";
import { getAdminAuth, getAdminDb } from "@/app/lib/firebase-admin";
import { toPhoneDigits } from "@/app/lib/phone";
import { storeDevPassword } from "@/app/lib/auth-helpers";

const MAX_ATTEMPTS = 5;

export async function POST(req: NextRequest) {
  const adminAuth = getAdminAuth();
  const adminDb = getAdminDb();
  if (!adminAuth || !adminDb) {
    return NextResponse.json(
      { error: "Firebase Admin not configured" },
      { status: 500 }
    );
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const rawPhone = body.phone;
    const code = body.code;
    const newPassword = body.newPassword;

    if (!rawPhone || typeof rawPhone !== "string") {
      return NextResponse.json({ error: "Phone is required" }, { status: 400 });
    }
    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }
    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const phone = toPhoneDigits(rawPhone.trim());
    const resetRef = adminDb.collection("passwordResets").doc(phone);
    const resetDoc = await resetRef.get();

    if (!resetDoc.exists) {
      return NextResponse.json(
        { error: "No reset request found for this phone" },
        { status: 404 }
      );
    }

    const resetData = resetDoc.data() as Record<string, unknown>;
    const attempts = (resetData.attempts as number) || 0;
    const expiresAt = new Date((resetData.expiresAt as string) || 0);
    const storedCode = (resetData.code as string) || "";
    const userId = (resetData.userId as string) || "";

    if (new Date() > expiresAt) {
      await resetRef.delete();
      return NextResponse.json(
        { error: "Code has expired, please request a new one" },
        { status: 400 }
      );
    }

    if (attempts >= MAX_ATTEMPTS) {
      await resetRef.delete();
      return NextResponse.json(
        { error: "Too many failed attempts, please request a new code" },
        { status: 400 }
      );
    }

    if (code !== storedCode) {
      await resetRef.update({ attempts: attempts + 1 });
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 400 });
    }

    await adminAuth.updateUser(userId, { password: newPassword });
    await storeDevPassword(adminDb, userId, newPassword as string);
    await resetRef.delete();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/forgot-password/reset] failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Reset failed" },
      { status: 500 }
    );
  }
}
