import { NextResponse, type NextRequest } from "next/server";
import { getAdminAuth, getAdminDb } from "@/app/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { ROLE_COOKIE, SESSION_COOKIE } from "@/app/lib/auth-cookies";
import type { AppUser } from "@/app/types";

const FIVE_DAYS = 60 * 60 * 24 * 5 * 1000;

export async function POST(req: NextRequest) {
  const adminAuth = getAdminAuth();
  const adminDb = getAdminDb();
  if (!adminAuth) {
    return NextResponse.json(
      { error: "Firebase Admin not configured" },
      { status: 500 }
    );
  }
  const { idToken } = await req.json();
  try {
    let role: AppUser["role"] = "student";
    try {
      const decoded = await adminAuth.verifyIdToken(idToken);
      if (adminDb) {
        const userRef = adminDb.collection("users").doc(decoded.uid);
        const userDoc = await userRef.get();

        if (userDoc.exists) {
          role = (userDoc.data()?.role as AppUser["role"]) || "student";
        } else {
          const existing = await adminDb.collection("users").limit(1).get();
          role = existing.empty ? "super_admin" : "student";

          const userRecord = await adminAuth.getUser(decoded.uid);
          await userRef.set({
            uid: decoded.uid,
            name: userRecord.displayName || decoded.name || "",
            email: userRecord.email || decoded.email || "",
            role,
            createdAt: FieldValue.serverTimestamp(),
          });
        }
      }
    } catch (err) {
      console.error("[api/auth/session] role lookup/creation failed:", err);
    }

    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: FIVE_DAYS,
    });

    const response = NextResponse.json({ ok: true, role });
    response.cookies.set(SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: FIVE_DAYS / 1000,
      path: "/",
    });
    response.cookies.set(ROLE_COOKIE, role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: FIVE_DAYS / 1000,
      path: "/",
    });
    return response;
  } catch (err) {
    console.error("[api/auth/session] createSessionCookie failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unauthorized" },
      { status: 401 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  response.cookies.delete(ROLE_COOKIE);
  return response;
}
