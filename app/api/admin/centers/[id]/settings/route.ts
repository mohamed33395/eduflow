import { NextResponse, type NextRequest } from "next/server";
import {
  apiErrorResponse,
  getSessionUser,
} from "@/app/lib/api-server";
import { sanitizeSettings } from "@/app/lib/center-settings";
import {
  loadCenterSettings,
  saveCenterSettings,
} from "@/app/lib/center-settings-server";

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
    const settings = (await loadCenterSettings(id)) ?? sanitizeSettings(undefined);
    return NextResponse.json({ id, settings });
  } catch (err) {
    console.error("[api/admin/centers/[id]/settings] GET failed:", err);
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
    const body = (await req.json()) as { settings?: unknown };
    const settings = sanitizeSettings(body.settings);

    await saveCenterSettings(id, settings);
    return NextResponse.json({ ok: true, settings });
  } catch (err) {
    console.error("[api/admin/centers/[id]/settings] PATCH failed:", err);
    return apiErrorResponse(err, "Update failed");
  }
}
