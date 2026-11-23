import { NextResponse, type NextRequest } from "next/server";
import {
  apiErrorResponse,
  apiFetchServer,
  findUserByEmail,
  getSessionUser,
} from "@/app/lib/api-server";
import { toPhoneDigits } from "@/app/lib/phone";
import { generatePassword } from "@/app/lib/auth-helpers";
import { usernameFromEmail } from "@/app/lib/mappers";

export async function GET() {
  const currentUser = await getSessionUser();
  if (!currentUser || currentUser.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const centers = await apiFetchServer<unknown>("/centers");
    return NextResponse.json(centers);
  } catch (err) {
    console.error("[api/admin/centers] list failed:", err);
    return apiErrorResponse(err, "List failed");
  }
}

export async function POST(req: NextRequest) {
  const currentUser = await getSessionUser();
  if (!currentUser || currentUser.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, email, phone, address, logo, ownerEmail, ownerPhone, ownerPassword } =
    await req.json();

  const centerPhoneDigits =
    typeof phone === "string" && phone.trim()
      ? toPhoneDigits(phone.trim())
      : "";
  const ownerPhoneDigits =
    typeof ownerPhone === "string" && ownerPhone.trim()
      ? toPhoneDigits(ownerPhone.trim())
      : "";

  try {
    // resolve or provision the center owner account
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
          role: "CENTER_OWNER",
          phone: ownerPhoneDigits || centerPhoneDigits || undefined,
        },
      });
    }

    const center = await apiFetchServer<{ id: string; slug: string }>(
      "/centers",
      {
        method: "POST",
        body: {
          name,
          email,
          phone: centerPhoneDigits || undefined,
          address: address || undefined,
          logo: typeof logo === "string" ? logo : undefined,
          ownerId: owner.id,
        },
      }
    );

    // backend already links owner.centerId inside the create transaction
    return NextResponse.json({ id: center.id, slug: center.slug });
  } catch (err) {
    console.error("[api/admin/centers] create failed:", err);
    return apiErrorResponse(err, "Create failed");
  }
}
