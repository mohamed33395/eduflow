import { NextResponse } from "next/server";
import {
  apiErrorResponse,
  fetchAllPages,
  getSessionUser,
} from "@/app/lib/api-server";
import { toAppUser } from "@/app/lib/mappers";
import type { AppUser } from "@/app/types";

export async function GET() {
  const currentUser = await getSessionUser();
  if (!currentUser || currentUser.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const rows = await fetchAllPages<Record<string, unknown>>("/users");
    const users: AppUser[] = rows.map(toAppUser);
    return NextResponse.json(users);
  } catch (err) {
    console.error("[api/admin/users] list failed:", err);
    return apiErrorResponse(err, "List failed");
  }
}
