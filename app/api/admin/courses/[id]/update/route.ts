import { NextResponse, type NextRequest } from "next/server";
import { getAdminAuth, getAdminDb } from "@/app/lib/firebase-admin";
import { getSessionUser } from "@/app/lib/auth-cookies";
import { toPhoneDigits } from "@/app/lib/phone";
import { FieldValue } from "firebase-admin/firestore";
import { storeDevPassword } from "@/app/lib/auth-helpers";

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
    const courseDoc = await adminDb.collection("courses").doc(id).get();
    if (!courseDoc.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const courseData = courseDoc.data() as Record<string, unknown>;
    const ownerId = (courseData.ownerId as string) || "";

    let ownerEmail = "";
    let ownerPhone = "";
    let ownerDoc = null;
    if (ownerId) {
      ownerDoc = await adminDb.collection("users").doc(ownerId).get();
      if (ownerDoc.exists) {
        const d = ownerDoc.data() as Record<string, unknown>;
        ownerEmail = (d.email as string) || "";
        ownerPhone = (d.phone as string) || "";
      }
    }

    return NextResponse.json({
      id,
      name: courseData.name,
      type: courseData.type,
      level: courseData.level,
      gradeFrom: courseData.gradeFrom,
      gradeTo: courseData.gradeTo,
      description: courseData.description,
      content: courseData.content,
      status: courseData.status,
      ownerId,
      ownerEmail,
      ownerPhone,
    });
  } catch (err) {
    console.error("[api/admin/courses/[id]/update] GET failed:", err);
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

  const adminAuth = getAdminAuth();
  const adminDb = getAdminDb();
  if (!adminAuth || !adminDb) {
    return NextResponse.json(
      { error: "Firebase Admin not configured" },
      { status: 500 }
    );
  }

  try {
    const { id } = await params;
    const courseDoc = await adminDb.collection("courses").doc(id).get();
    if (!courseDoc.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const {
      name,
      type,
      level,
      gradeFrom,
      gradeTo,
      description,
      content,
      status,
      ownerEmail,
      ownerPhone,
      ownerPassword,
      changePassword,
    } = body;

  const ownerPhoneDigits =
    typeof ownerPhone === "string" && ownerPhone.trim()
      ? toPhoneDigits(ownerPhone.trim())
      : "";

    const courseData = courseDoc.data() as Record<string, unknown>;
    const ownerId = (courseData.ownerId as string) || "";

    if (!ownerId) {
      return NextResponse.json({ error: "Owner not found" }, { status: 400 });
    }

    const ownerDoc = await adminDb.collection("users").doc(ownerId).get();
    if (!ownerDoc.exists) {
      return NextResponse.json({ error: "Owner not found" }, { status: 400 });
    }

    const ownerData = ownerDoc.data() as Record<string, unknown>;
    if (ownerData.role === "super_admin") {
      return NextResponse.json(
        { error: "Cannot change super admin credentials here" },
        { status: 400 }
      );
    }

    const currentEmail = (ownerData.email as string) || "";

    // update owner email
    if (ownerEmail && typeof ownerEmail === "string" && ownerEmail !== currentEmail) {
      try {
        const existing = await adminAuth.getUserByEmail(ownerEmail);
        if (existing.uid !== ownerId) {
          return NextResponse.json(
            { error: "This email is already used by another account" },
            { status: 400 }
          );
        }
      } catch {
        // email not in use, safe to update
      }

      await adminAuth.updateUser(ownerId, { email: ownerEmail });
      await adminDb
        .collection("users")
        .doc(ownerId)
        .update({ email: ownerEmail });
    }

    // update owner phone
    if (ownerPhoneDigits) {
      await adminDb.collection("users").doc(ownerId).update({ phone: ownerPhoneDigits });
    }

    // update owner password only when explicitly requested
    if (
      ownerPassword &&
      typeof ownerPassword === "string" &&
      ownerPassword.length >= 6 &&
      changePassword !== false
    ) {
      await adminAuth.updateUser(ownerId, { password: ownerPassword });
      await storeDevPassword(adminDb, ownerId, ownerPassword);
    }

    // update course data
    const update: Record<string, unknown> = {};
    if (name !== undefined) update.name = name;
    if (type !== undefined) update.type = type;
    if (level !== undefined) update.level = level;
    if (gradeFrom !== undefined) update.gradeFrom = gradeFrom;
    if (gradeTo !== undefined) update.gradeTo = gradeTo;
    if (description !== undefined) update.description = description;
    if (content !== undefined) update.content = content;
    if (status !== undefined) update.status = status;
    if (Object.keys(update).length > 0) {
      update.updatedAt = FieldValue.serverTimestamp();
      await adminDb.collection("courses").doc(id).update(update);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/courses/[id]/update] PATCH failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 500 }
    );
  }
}
