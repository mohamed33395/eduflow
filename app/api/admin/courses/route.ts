import { NextResponse, type NextRequest } from "next/server";
import { getAdminAuth, getAdminDb } from "@/app/lib/firebase-admin";
import { getSessionUser } from "@/app/lib/auth-cookies";
import { slugify } from "@/app/lib/utils";
import { FieldValue, type Timestamp } from "firebase-admin/firestore";
import { toPhoneDigits } from "@/app/lib/phone";
import { generatePassword, storeDevPassword } from "@/app/lib/auth-helpers";

export async function GET(req: NextRequest) {
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
    const snap = await adminDb.collection("courses").get();
    const courses = snap.docs.map((d) => {
      const data = d.data();
      const createdAt =
        data.createdAt && (data.createdAt as Timestamp).toDate
          ? (data.createdAt as Timestamp).toDate().toISOString()
          : (data.createdAt as string) || "";
      return { ...data, id: d.id, createdAt };
    });
    return NextResponse.json(courses);
  } catch (err) {
    console.error("[api/admin/courses] list failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "List failed" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
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

  const {
    name,
    type,
    level,
    gradeFrom,
    gradeTo,
    description,
    content,
    coverImage,
    ownerEmail,
    ownerPhone,
    ownerPassword,
  } = await req.json();

  const ownerPhoneDigits =
    typeof ownerPhone === "string" && ownerPhone.trim()
      ? toPhoneDigits(ownerPhone.trim())
      : "";

  try {
    let owner;
    let isExisting = false;
    let ownerPasswordForCreate = "";
    try {
      owner = await adminAuth.getUserByEmail(ownerEmail);
      isExisting = true;
    } catch {
      ownerPasswordForCreate =
        typeof ownerPassword === "string" && ownerPassword.length >= 6
          ? ownerPassword
          : generatePassword(12);
      owner = await adminAuth.createUser({
        email: ownerEmail,
        password: ownerPasswordForCreate,
        displayName: `${name} Owner`,
      });
    }

    const existingUserDoc = await adminDb
      .collection("users")
      .doc(owner.uid)
      .get();
    const existingRole = existingUserDoc.exists
      ? (existingUserDoc.data()?.role as string | undefined)
      : undefined;

    if (isExisting && existingRole === "super_admin") {
      return NextResponse.json(
        { error: "This email is already used by the super admin" },
        { status: 400 }
      );
    }

    // Never overwrite an existing owner's password from the create form.
    // New owners are created above with the provided or a generated password.
    // Existing owners keep their current password and can use forgot-password.

    const courseRef = adminDb.collection("courses").doc();
    const courseId = courseRef.id;
    const slug = slugify(name);

    await courseRef.set({
      id: courseId,
      name,
      type,
      level,
      gradeFrom,
      gradeTo,
      description: description || "",
      content: content || "",
      coverImage: typeof coverImage === "string" ? coverImage : "",
      status: "active",
      ownerId: owner.uid,
      slug,
      createdAt: FieldValue.serverTimestamp(),
    });

    await adminDb
      .collection("users")
      .doc(owner.uid)
      .set(
        {
          uid: owner.uid,
          name: owner.displayName || `${name} Owner`,
          email: ownerEmail,
          phone: ownerPhoneDigits,
          role: "course_owner",
          courseId,
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    await storeDevPassword(adminDb, owner.uid, ownerPasswordForCreate);

    return NextResponse.json({ id: courseId, slug });
  } catch (err) {
    console.error("[api/admin/courses] create failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Create failed" },
      { status: 500 }
    );
  }
}
