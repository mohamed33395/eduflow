import { api, ApiError } from "@/app/lib/api";
import { toCenter, unwrapList } from "@/app/lib/mappers";
import { slugify } from "@/app/lib/utils";
import type { Center } from "@/app/types";

type Row = Record<string, unknown>;

export async function getCenters(): Promise<Center[]> {
  const data = await api.get<unknown>("/centers");
  return unwrapList<Row>(data).map(toCenter);
}

export async function getCenterBySlug(slug: string): Promise<Center | null> {
  try {
    const data = await api.get<unknown>("/centers");
    const found = unwrapList<Row>(data).find((c) => c.slug === slug);
    if (found) return toCenter(found);
  } catch {
    // fall through to the public endpoint
  }
  try {
    const data = await api.get<Row>(`/centers/slug/${slug}`);
    return toCenter(data);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function getCenterById(id: string): Promise<Center | null> {
  if (!id || id === "???") return null;
  try {
    const data = await api.get<Row>(`/centers/${id}`);
    return toCenter(data);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function createCenter(
  data: Omit<Center, "id" | "slug" | "createdAt">
): Promise<string> {
  const created = await api.post<Row>("/centers", {
    name: data.name,
    slug: slugify(data.name),
    email: data.email,
    phone: data.phone,
    address: data.address,
    logo: data.logo,
    ownerId: data.ownerId,
    bundlePrice: data.settings?.bundlePrice,
    maxStudentsPerClass: data.settings?.maxStudentsPerClass,
  });
  return created.id as string;
}

export async function updateCenter(
  id: string,
  data: Partial<Omit<Center, "id" | "createdAt">>
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (data.name !== undefined) {
    payload.name = data.name;
    payload.slug = slugify(data.name);
  }
  if (data.email !== undefined) payload.email = data.email;
  if (data.phone !== undefined) payload.phone = data.phone;
  if (data.address !== undefined) payload.address = data.address;
  if (data.logo !== undefined) payload.logo = data.logo;
  if (data.status !== undefined) payload.status = data.status.toUpperCase();
  await api.patch(`/centers/${id}`, payload);
}

export async function deleteCenter(id: string): Promise<void> {
  await api.delete(`/centers/${id}`);
}

export async function toggleCenterStatus(
  id: string,
  status: Center["status"]
): Promise<void> {
  await api.patch(`/centers/${id}`, { status: status.toUpperCase() });
}
