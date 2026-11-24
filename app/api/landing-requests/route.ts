import { NextResponse, type NextRequest } from "next/server";
import { API_BASE } from "@/app/lib/api-server";

/**
 * Public (unauthenticated) proxy for the landing-page booking form.
 * The BFF requires a session, so this thin route forwards the visitor's
 * request to the Nest `@Public() POST /api/landing-requests` endpoint.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const res = await fetch(`${API_BASE}/api/landing-requests`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    cache: "no-store",
  });
  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: { "content-type": "application/json" },
  });
}
