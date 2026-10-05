import { NextResponse, type NextRequest } from "next/server";
import { getAdminDb } from "@/app/lib/firebase-admin";
import { getSessionUser } from "@/app/lib/auth-cookies";
import { FieldValue } from "firebase-admin/firestore";
import { sanitizeSettings } from "@/app/lib/center-settings";

export async function GET(req: NextRequest) {
  const currentUser = await getSessionUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (
    currentUser.role !== "super_admin" &&
    currentUser.role !== "center_owner"
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const centerId =
    currentUser.role === "super_admin"
      ? (req.nextUrl.searchParams.get("centerId") ?? currentUser.centerId ?? "")
      : (currentUser.centerId ?? "");

  if (!centerId) {
    return NextResponse.json({ error: "No center assigned" }, { status: 400 });
  }

  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json(
      { error: "Firebase Admin not configured" },
      { status: 500 }
    );
  }

  try {
    const centerDoc = await adminDb.collection("centers").doc(centerId).get();
    if (!centerDoc.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data = centerDoc.data() as { settings?: unknown } | undefined;
    const settings = sanitizeSettings(data?.settings);

    return NextResponse.json({ id: centerId, settings });
  } catch (err) {
    console.error("[api/center/settings] GET failed:", err);
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
  if (
    currentUser.role !== "super_admin" &&
    currentUser.role !== "center_owner"
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const centerId =
    currentUser.role === "super_admin"
      ? (req.nextUrl.searchParams.get("centerId") ?? currentUser.centerId ?? "")
      : (currentUser.centerId ?? "");

  if (!centerId) {
    return NextResponse.json({ error: "No center assigned" }, { status: 400 });
  }

  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json(
      { error: "Firebase Admin not configured" },
      { status: 500 }
    );
  }

  try {
    const centerDoc = await adminDb.collection("centers").doc(centerId).get();
    if (!centerDoc.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Center owners may only update their own center.
    if (
      currentUser.role === "center_owner" &&
      currentUser.centerId !== centerId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await req.json()) as { settings?: unknown };
    const settings = sanitizeSettings(body.settings);

    await adminDb
      .collection("centers")
      .doc(centerId)
      .update({
        settings,
        updatedAt: FieldValue.serverTimestamp(),
      });

    return NextResponse.json({ ok: true, settings });
  } catch (err) {
    console.error("[api/center/settings] PATCH failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 500 }
    );
  }
}
