import { NextResponse, type NextRequest } from "next/server";
import {
  apiErrorResponse,
  apiFetchServer,
  getSessionUser,
} from "@/app/lib/api-server";
import { toPhoneDigits } from "@/app/lib/phone";

export async function GET() {
  const currentUser = await getSessionUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    uid: currentUser.uid,
    name: currentUser.name,
    email: currentUser.email,
    phone: currentUser.phone || "",
    avatarUrl: currentUser.avatarUrl || "",
  });
}

export async function PATCH(req: NextRequest) {
  const currentUser = await getSessionUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const { name, email, phone, password, avatarUrl } = body;
    const phoneDigits =
      typeof phone === "string" && phone.trim() ? toPhoneDigits(phone.trim()) : "";

    const update: Record<string, unknown> = {};
    if (typeof name === "string" && name.trim()) update.name = name.trim();
    if (typeof email === "string" && email) update.email = email;
    if (phoneDigits) update.phone = phoneDigits;
    if (typeof avatarUrl === "string" && avatarUrl.trim()) {
      update.avatarUrl = avatarUrl;
    }
    if (typeof password === "string" && password.length >= 8) {
      update.newPassword = password;
    }
    if (Object.keys(update).length > 0) {
      await apiFetchServer(`/users/${currentUser.uid}`, {
        method: "PATCH",
        body: update,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/user/settings] PATCH failed:", err);
    return apiErrorResponse(err, "Update failed");
  }
}
