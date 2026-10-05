import type { UserRecord } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";

export function generatePassword(length = 12): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$";
  let pass = "";
  for (let i = 0; i < length; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

export function hasPasswordProvider(owner: UserRecord): boolean {
  // Email/password provider is usually "password" (Firebase) or "email" (Identity Platform).
  // It only appears in providerData once a password has actually been set.
  return owner.providerData.some(
    (p) => p.providerId === "password" || p.providerId === "email"
  );
}

/**
 * Stores the plaintext password in the user doc for the dev reset endpoint.
 * This is a dev-only convenience and should never be used in production.
 */
export async function storeDevPassword(
  adminDb: Firestore,
  uid: string,
  password: string
): Promise<void> {
  if (!password || process.env.NODE_ENV === "production") return;
  try {
    await adminDb
      .collection("users")
      .doc(uid)
      .set({ devPassword: password }, { merge: true });
  } catch (err) {
    console.error("[storeDevPassword] failed:", err);
  }
}
