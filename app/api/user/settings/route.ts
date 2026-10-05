import { NextResponse, type NextRequest } from "next/server";
import { getAdminAuth, getAdminDb } from "@/app/lib/firebase-admin";
import { getSessionUser } from "@/app/lib/auth-cookies";
import { toPhoneDigits } from "@/app/lib/phone";
import { storeDevPassword } from "@/app/lib/auth-helpers";

export async function GET(req: NextRequest) {
  const currentUser = await getSessionUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json(
      { error: "Firebase Admin not configured" },
      { status: 500 }
    );
  }

  try {
    const userDoc = await adminDb
      .collection("users")
      .doc(currentUser.uid)
      .get();

    const data = userDoc.exists
      ? (userDoc.data() as Record<string, unknown>)
      : {};

    return NextResponse.json({
      uid: currentUser.uid,
      name: data.name || currentUser.name || "",
      email: data.email || currentUser.email || "",
      phone: data.phone || "",
      avatarUrl: data.avatarUrl || "",
    });
  } catch (err) {
    console.error("[api/user/settings] GET failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Load failed" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const currentUser = await getSessionUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    const { name, email, phone, password, avatarUrl } = body;
    const phoneDigits =
      typeof phone === "string" && phone.trim() ? toPhoneDigits(phone.trim()) : "";

    const userDoc = await adminDb
      .collection("users")
      .doc(currentUser.uid)
      .get();

    const currentEmail = userDoc.exists
      ? ((userDoc.data() as Record<string, unknown>).email as string) ||
        currentUser.email
      : currentUser.email;

    // update email
    if (email && typeof email === "string" && email !== currentEmail) {
      try {
        const existing = await adminAuth.getUserByEmail(email);
        if (existing.uid !== currentUser.uid) {
          return NextResponse.json(
            { error: "This email is already used by another account" },
            { status: 400 }
          );
        }
      } catch {
        // email not in use, safe to update
      }

      await adminAuth.updateUser(currentUser.uid, { email });
      await adminDb
        .collection("users")
        .doc(currentUser.uid)
        .update({ email });
    }

    // update name
    if (name && typeof name === "string") {
      await adminAuth.updateUser(currentUser.uid, { displayName: name });
      await adminDb
        .collection("users")
        .doc(currentUser.uid)
        .update({ name });
    }

    // update phone
    if (phoneDigits) {
      await adminDb
        .collection("users")
        .doc(currentUser.uid)
        .update({ phone: phoneDigits });
    }

    // update avatar
    if (typeof avatarUrl === "string" && avatarUrl.trim()) {
      await adminAuth.updateUser(currentUser.uid, { photoURL: avatarUrl });
      await adminDb
        .collection("users")
        .doc(currentUser.uid)
        .update({ avatarUrl });
    }

    // update password
    if (password && typeof password === "string" && password.length >= 6) {
      await adminAuth.updateUser(currentUser.uid, { password });
      await storeDevPassword(adminDb, currentUser.uid, password);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/user/settings] PATCH failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 500 }
    );
  }
}
