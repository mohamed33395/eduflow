import { NextResponse, type NextRequest } from "next/server";
import { getAdminDb } from "@/app/lib/firebase-admin";
import { getSessionUser } from "@/app/lib/auth-cookies";
import { FieldValue } from "firebase-admin/firestore";
import { sanitizeSettings } from "@/app/lib/center-settings";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getSessionUser();
  if (!currentUser || currentUser.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json(
      { error: "Firebase Admin not configured" },
      { status: 500 }
    );
  }

  try {
    const { id } = await params;
    const centerDoc = await adminDb.collection("centers").doc(id).get();
    if (!centerDoc.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data = centerDoc.data() as { settings?: unknown } | undefined;
    const settings = sanitizeSettings(data?.settings);

    return NextResponse.json({ id, settings });
  } catch (err) {
    console.error("[api/admin/centers/[id]/settings] GET failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Load failed" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getSessionUser();
  if (!currentUser || currentUser.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json(
      { error: "Firebase Admin not configured" },
      { status: 500 }
    );
  }

  try {
    const { id } = await params;
    const centerDoc = await adminDb.collection("centers").doc(id).get();
    if (!centerDoc.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = (await req.json()) as { settings?: unknown };
    const settings = sanitizeSettings(body.settings);

    await adminDb
      .collection("centers")
      .doc(id)
      .update({
        settings,
        updatedAt: FieldValue.serverTimestamp(),
      });

    return NextResponse.json({ ok: true, settings });
  } catch (err) {
    console.error("[api/admin/centers/[id]/settings] PATCH failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 500 }
    );
  }
}
