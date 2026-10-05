import "server-only";
import { cookies } from "next/headers";
import { getAdminAuth, getAdminDb } from "./firebase-admin";
import type { AppUser } from "@/app/types";

export const SESSION_COOKIE = "edu_session";
export const ROLE_COOKIE = "edu_role";

export async function getSessionUser(): Promise<AppUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    console.warn("[getSessionUser] no session token");
    return null;
  }

  const adminAuth = getAdminAuth();
  const adminDb = getAdminDb();
  if (!adminAuth || !adminDb) {
    console.warn("[getSessionUser] admin not initialized");
    return null;
  }

  try {
    const decoded = await adminAuth.verifySessionCookie(token, true);
    const [userRecord, userDoc] = await Promise.all([
      adminAuth.getUser(decoded.uid),
      adminDb.collection("users").doc(decoded.uid).get(),
    ]);

    const docData = userDoc.exists
      ? (userDoc.data() as Record<string, unknown>)
      : null;

    const role: AppUser["role"] =
      (docData?.role as AppUser["role"]) ??
      (decoded.role as AppUser["role"]) ??
      "student";

    console.log("[getSessionUser] user:", {
      uid: decoded.uid,
      email: userRecord.email,
      role,
      centerId: docData?.centerId,
      courseId: docData?.courseId,
    });

    return {
      uid: decoded.uid,
      name: (docData?.name as string) ?? userRecord.displayName ?? "",
      email: (docData?.email as string) ?? userRecord.email ?? "",
      role,
      centerId: (docData?.centerId as string | undefined) ??
        (decoded.centerId as string | undefined),
      courseId: (docData?.courseId as string | undefined) ??
        (decoded.courseId as string | undefined),
      avatarUrl: (docData?.avatarUrl as string | undefined) ??
        userRecord.photoURL ??
        undefined,
      createdAt:
        (docData?.createdAt as string) ?? userRecord.metadata.creationTime ?? "",
    };
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "auth/session-cookie-revoked" || code === "auth/id-token-revoked") {
      console.warn(
        "[getSessionUser] session revoked; clearing cookies and redirecting to login"
      );
    } else if (code === "auth/session-cookie-expired") {
      console.warn("[getSessionUser] session expired; redirecting to login");
    } else {
      console.warn("[getSessionUser] verify failed:", err);
    }

    try {
      cookieStore.delete(SESSION_COOKIE);
      cookieStore.delete(ROLE_COOKIE);
    } catch {
      // cookieStore may be read-only in some server contexts
    }

    return null;
  }
}
