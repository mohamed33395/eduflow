import { NextResponse, type NextRequest } from "next/server";
import { getAdminAuth, getAdminDb } from "@/app/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  const adminAuth = getAdminAuth();
  const adminDb = getAdminDb();

  if (!adminAuth || !adminDb) {
    return NextResponse.json(
      { error: "Firebase Admin not configured" },
      { status: 500 }
    );
  }

  const existing = await adminDb.collection("users").limit(1).get();
  if (!existing.empty) {
    return NextResponse.json(
      { error: "Setup is only available when no users exist" },
      { status: 403 }
    );
  }

  const { email, password, name } = (await req.json()) as {
    email?: string;
    password?: string;
    name?: string;
  };

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  try {
    const user = await adminAuth.createUser({
      email,
      password,
      displayName: name || email,
    });

    await adminDb
      .collection("users")
      .doc(user.uid)
      .set({
        uid: user.uid,
        name: name || email,
        email,
        role: "super_admin",
        createdAt: FieldValue.serverTimestamp(),
      });

    return NextResponse.json({
      ok: true,
      uid: user.uid,
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
