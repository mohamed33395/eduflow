import { NextResponse, type NextRequest } from "next/server";
import {
  apiErrorResponse,
  apiFetchServer,
  findUserByEmail,
  getSessionUser,
} from "@/app/lib/api-server";
import { slugify } from "@/app/lib/utils";
import { toPhoneDigits } from "@/app/lib/phone";
import { generatePassword } from "@/app/lib/auth-helpers";
import { usernameFromEmail } from "@/app/lib/mappers";

export async function GET() {
  const currentUser = await getSessionUser();
  if (!currentUser || currentUser.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const courses = await apiFetchServer<unknown>("/courses");
    return NextResponse.json(courses);
  } catch (err) {
    console.error("[api/admin/courses] list failed:", err);
    return apiErrorResponse(err, "List failed");
  }
}

export async function POST(req: NextRequest) {
  const currentUser = await getSessionUser();
  if (!currentUser || currentUser.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    // resolve or provision the course owner account
    let owner = await findUserByEmail(ownerEmail);
    if (owner && owner.role === "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "This email is already used by the super admin" },
        { status: 400 }
      );
    }
    if (!owner) {
      owner = await apiFetchServer<Record<string, unknown>>("/users", {
        method: "POST",
        body: {
          name: `${name} Owner`,
          username: usernameFromEmail(ownerEmail),
          email: ownerEmail,
          password:
            typeof ownerPassword === "string" && ownerPassword.length >= 8
              ? ownerPassword
              : generatePassword(12),
          role: "COURSE_OWNER",
          phone: ownerPhoneDigits || undefined,
        },
      });
    }

    const course = await apiFetchServer<{ id: string; slug: string }>(
      "/courses",
      {
        method: "POST",
        body: {
          name,
          slug: slugify(name),
          type,
          level: typeof level === "string" ? level.toUpperCase() : level,
          gradeFrom,
          gradeTo,
          description: description || undefined,
          content: content || undefined,
          coverImage: typeof coverImage === "string" ? coverImage : undefined,
          ownerId: owner.id,
        },
      }
    );

    // link the owner's user record to the new course
    await apiFetchServer(`/users/${owner.id}`, {
      method: "PATCH",
      body: { courseId: course.id },
    }).catch(() => null);

    return NextResponse.json({ id: course.id, slug: course.slug });
  } catch (err) {
    console.error("[api/admin/courses] create failed:", err);
    return apiErrorResponse(err, "Create failed");
  }
}
