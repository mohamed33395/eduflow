import { NextResponse, type NextRequest } from "next/server";
import {
  apiErrorResponse,
  apiFetchServer,
  getSessionUser,
} from "@/app/lib/api-server";
import { toPhoneDigits } from "@/app/lib/phone";

type Row = Record<string, unknown>;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getSessionUser();
  if (!currentUser || currentUser.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const center = await apiFetchServer<Row>(`/centers/${id}`);
    const ownerId = (center.ownerId as string) || "";

    let ownerEmail = "";
    let ownerPhone = "";
    if (ownerId) {
      try {
        const owner = await apiFetchServer<Row>(`/users/${ownerId}`);
        ownerEmail = (owner.email as string) || "";
        ownerPhone = (owner.phone as string) || "";
      } catch {
        // owner lookup failed — return empty fields
      }
    }

    return NextResponse.json({
      id,
      name: center.name,
      slug: center.slug,
      email: center.email,
      phone: center.phone,
      address: center.address,
      status: typeof center.status === "string" ? center.status.toLowerCase() : center.status,
      ownerId,
      ownerEmail,
      ownerPhone,
    });
  } catch (err) {
    console.error("[api/admin/centers/[id]/update] GET failed:", err);
    return apiErrorResponse(err, "Load failed");
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

  try {
    const { id } = await params;
    const center = await apiFetchServer<Row>(`/centers/${id}`).catch(() => null);
    if (!center) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const { name, slug, email, phone, address, status, ownerEmail, ownerPhone, ownerPassword, changePassword } = body;

    const centerPhoneDigits =
      typeof phone === "string" && phone.trim()
        ? toPhoneDigits(phone.trim())
        : "";
    const ownerPhoneDigits =
      typeof ownerPhone === "string" && ownerPhone.trim()
        ? toPhoneDigits(ownerPhone.trim())
        : "";

    const ownerId = (center.ownerId as string) || "";
    if (!ownerId) {
      return NextResponse.json({ error: "Owner not found" }, { status: 400 });
    }

    const owner = await apiFetchServer<Row>(`/users/${ownerId}`).catch(() => null);
    if (!owner) {
      return NextResponse.json({ error: "Owner not found" }, { status: 400 });
    }
    if (owner.role === "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Cannot change super admin credentials here" },
        { status: 400 }
      );
    }

    const ownerUpdate: Record<string, unknown> = {};
    if (typeof ownerEmail === "string" && ownerEmail && ownerEmail !== owner.email) {
      ownerUpdate.email = ownerEmail;
    }
    if (ownerPhoneDigits) ownerUpdate.phone = ownerPhoneDigits;
    if (
      typeof ownerPassword === "string" &&
      ownerPassword.length >= 8 &&
      changePassword !== false
    ) {
      ownerUpdate.newPassword = ownerPassword;
    }
    if (Object.keys(ownerUpdate).length > 0) {
      await apiFetchServer(`/users/${ownerId}`, {
        method: "PATCH",
        body: ownerUpdate,
      });
    }

    const centerUpdate: Record<string, unknown> = {};
    if (name !== undefined) centerUpdate.name = name;
    if (typeof slug === "string" && slug.trim()) centerUpdate.slug = slug.trim();
    if (email !== undefined) centerUpdate.email = email;
    if (centerPhoneDigits) centerUpdate.phone = centerPhoneDigits;
    if (address !== undefined) centerUpdate.address = address;
    if (status !== undefined) {
      centerUpdate.status =
        typeof status === "string" ? status.toUpperCase() : status;
    }
    if (Object.keys(centerUpdate).length > 0) {
      await apiFetchServer(`/centers/${id}`, {
        method: "PATCH",
        body: centerUpdate,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/centers/[id]/update] PATCH failed:", err);
    return apiErrorResponse(err, "Update failed");
  }
}
