import { NextResponse, type NextRequest } from "next/server";
import {
  apiErrorResponse,
  apiFetchServer,
  fetchAllPages,
  getSessionUser,
} from "@/app/lib/api-server";
import { unwrapList } from "@/app/lib/mappers";

type Row = Record<string, unknown>;

function getResetPassword(searchParams: URLSearchParams): string {
  const pwd = searchParams.get("password")?.trim();
  return pwd && pwd.length >= 8 ? pwd : "eduflow123";
}

/**
 * Dev credential tool: resets every owner/admin account to `?password=`.
 * Now requires a signed-in super admin session (the backend owns passwords).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const currentUser = await getSessionUser();
  if (!currentUser || currentUser.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const password = getResetPassword(searchParams);
    const results: {
      name: string;
      type: "super_admin" | "center" | "course";
      email: string;
      password: string;
    }[] = [];

    const users = await fetchAllPages<Row>("/users");
    const centers = unwrapList<Row>(await apiFetchServer<unknown>("/centers"));
    const courses = unwrapList<Row>(await apiFetchServer<unknown>("/courses"));

    const reset = async (user: Row, type: "super_admin" | "center" | "course", label: string) => {
      const id = user.id as string;
      const email = (user.email as string) || "";
      if (!id || !email) return;
      await apiFetchServer(`/users/${id}`, {
        method: "PATCH",
        body: { newPassword: password },
      });
      results.push({ name: label, type, email, password });
    };

    for (const u of users) {
      if (u.role !== "SUPER_ADMIN") continue;
      await reset(u, "super_admin", (u.name as string) || "EduFlow Admin");
    }

    for (const center of centers) {
      const owner = users.find((u) => u.id === center.ownerId);
      if (owner) {
        await reset(owner, "center", (center.name as string) || "Center");
      }
    }

    for (const course of courses) {
      const owner = users.find((u) => u.id === course.ownerId);
      if (owner) {
        await reset(owner, "course", (course.name as string) || "Course");
      }
    }

    return NextResponse.json({ credentials: results });
  } catch (err) {
    console.error("[reset] error:", err);
    return apiErrorResponse(err, "Reset failed");
  }
}
