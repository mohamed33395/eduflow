import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/app/lib/auth-cookies";
import {
  apiErrorResponse,
} from "@/app/lib/api-server";
import { sanitizeSettings } from "@/app/lib/center-settings";
import {
  loadCenterSettings,
  saveCenterSettings,
} from "@/app/lib/center-settings-server";
import type { AppUser } from "@/app/types";

function resolveCenterId(req: NextRequest, user: AppUser): string {
  return user.role === "super_admin"
    ? (req.nextUrl.searchParams.get("centerId") ?? user.centerId ?? "")
    : (user.centerId ?? "");
}

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

  const centerId = resolveCenterId(req, currentUser);
  if (!centerId) {
    return NextResponse.json({ error: "No center assigned" }, { status: 400 });
  }

  try {
    const settings =
      (await loadCenterSettings(centerId)) ?? sanitizeSettings(undefined);
    return NextResponse.json({ id: centerId, settings });
  } catch (err) {
    console.error("[api/center/settings] GET failed:", err);
    return apiErrorResponse(err, "Load failed");
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

  const centerId = resolveCenterId(req, currentUser);
  if (!centerId) {
    return NextResponse.json({ error: "No center assigned" }, { status: 400 });
  }

  // Center owners may only update their own center.
  if (
    currentUser.role === "center_owner" &&
    currentUser.centerId !== centerId
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await req.json()) as { settings?: unknown };
    const settings = sanitizeSettings(body.settings);
    await saveCenterSettings(centerId, settings);
    return NextResponse.json({ ok: true, settings });
  } catch (err) {
    console.error("[api/center/settings] PATCH failed:", err);
    return apiErrorResponse(err, "Update failed");
  }
}
