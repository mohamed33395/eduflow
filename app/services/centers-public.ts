import "server-only";
import { API_BASE } from "@/app/lib/api-server";
import { toCenter } from "@/app/lib/mappers";
import type { Center } from "@/app/types";

/** Public (unauthenticated) lookup for the center landing page. */
export async function getCenterBySlugPublic(slug: string): Promise<Center | null> {
  // `params.slug` can arrive still URL-encoded (non-ASCII slugs); decode first
  // so we never double-encode before calling the API.
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    // already decoded — use as-is
  }
  const res = await fetch(
    `${API_BASE}/api/centers/slug/${encodeURIComponent(decoded)}`,
    { cache: "no-store" }
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Center lookup failed (${res.status})`);
  const row = (await res.json()) as Record<string, unknown>;
  return toCenter(row);
}
