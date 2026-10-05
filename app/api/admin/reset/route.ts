import { NextResponse, type NextRequest } from "next/server";
import { getAdminAuth, getAdminDb } from "@/app/lib/firebase-admin";
import { storeDevPassword } from "@/app/lib/auth-helpers";
import type { Firestore } from "firebase-admin/firestore";
import type { Auth } from "firebase-admin/auth";

function getResetPassword(searchParams: URLSearchParams): string {
  return searchParams.get("password")?.trim() || "eduflow";
}

async function getUserDevPassword(
  adminDb: Firestore,
  adminAuth: Auth,
  uid: string,
  defaultPassword: string,
  force: boolean,
  sync: boolean
): Promise<string> {
  const userDoc = await adminDb.collection("users").doc(uid).get();
  const data = userDoc.exists
    ? (userDoc.data() as Record<string, unknown>)
    : null;
  const devPassword = data?.devPassword as string | undefined;

  if (force) {
    await adminAuth.updateUser(uid, { password: defaultPassword });
    await storeDevPassword(adminDb, uid, defaultPassword);
    return defaultPassword;
  }

  if (sync && devPassword) {
    await adminAuth.updateUser(uid, { password: devPassword });
    return devPassword;
  }

  if (devPassword) {
    return devPassword;
  }

  await adminAuth.updateUser(uid, { password: defaultPassword });
  await storeDevPassword(adminDb, uid, defaultPassword);
  return defaultPassword;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("secret") !== "eduflow-reset") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    const results: {
      name: string;
      type: "super_admin" | "center" | "course";
      email: string;
      password: string;
    }[] = [];

    const defaultPassword = getResetPassword(searchParams);
    const force = searchParams.get("force") === "1";
    const sync = searchParams.get("sync") === "1";

    // super admin
    const superAdminSnap = await adminDb
      .collection("users")
      .where("role", "==", "super_admin")
      .limit(1)
      .get();

    if (!superAdminSnap.empty) {
      const superAdmin = superAdminSnap.docs[0];
      const data = superAdmin.data() as Record<string, unknown>;
      const email = (data.email as string) || "";
      const name = (data.name as string) || "EduFlow Admin";
      if (email) {
        const password = await getUserDevPassword(
          adminDb,
          adminAuth,
          superAdmin.id,
          defaultPassword,
          force,
          sync
        );
        results.push({ name, type: "super_admin", email, password });
      }
    } else {
      // create default super admin
      const defaultAdminEmail = "admin@eduflow.com";
      let owner;
      try {
        owner = await adminAuth.getUserByEmail(defaultAdminEmail);
      } catch {
        owner = await adminAuth.createUser({
          email: defaultAdminEmail,
          password: defaultPassword,
          displayName: "EduFlow Admin",
        });
      }
      const password = await getUserDevPassword(
        adminDb,
        adminAuth,
        owner.uid,
        defaultPassword,
        force,
        sync
      );
      await adminDb
        .collection("users")
        .doc(owner.uid)
        .set(
          {
            uid: owner.uid,
            name: "EduFlow Admin",
            email: defaultAdminEmail,
            role: "super_admin",
            createdAt: new Date().toISOString(),
          },
          { merge: true }
        );
      results.push({
        name: "EduFlow Admin",
        type: "super_admin",
        email: defaultAdminEmail,
        password,
      });
    }

    // centers
    const centersSnap = await adminDb.collection("centers").get();
    for (const centerDoc of centersSnap.docs) {
      const centerData = centerDoc.data() as Record<string, unknown>;
      const centerName = (centerData.name as string) || centerDoc.id;
      const ownerId = (centerData.ownerId as string) || "";
      if (!ownerId) continue;

      const ownerDoc = await adminDb.collection("users").doc(ownerId).get();
      if (!ownerDoc.exists) continue;
      const ownerData = ownerDoc.data() as Record<string, unknown>;
      const email = (ownerData.email as string) || "";
      if (!email) continue;

      const password = await getUserDevPassword(
        adminDb,
        adminAuth,
        ownerId,
        defaultPassword,
        force,
        sync
      );
      results.push({
        name: centerName,
        type: "center",
        email,
        password,
      });
    }

    // courses
    const coursesSnap = await adminDb.collection("courses").get();
    for (const courseDoc of coursesSnap.docs) {
      const courseData = courseDoc.data() as Record<string, unknown>;
      const courseName = (courseData.name as string) || courseDoc.id;
      const ownerId = (courseData.ownerId as string) || "";
      if (!ownerId) continue;

      const ownerDoc = await adminDb.collection("users").doc(ownerId).get();
      if (!ownerDoc.exists) continue;
      const ownerData = ownerDoc.data() as Record<string, unknown>;
      const email = (ownerData.email as string) || "";
      if (!email) continue;

      const password = await getUserDevPassword(
        adminDb,
        adminAuth,
        ownerId,
        defaultPassword,
        force,
        sync
      );
      results.push({
        name: courseName,
        type: "course",
        email,
        password,
      });
    }

    return NextResponse.json({ credentials: results });
  } catch (err) {
    console.error("[reset] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Reset failed" },
      { status: 500 }
    );
  }
}
