import "server-only";
import { apiFetchServer } from "./api-server";
import { toCenterSettings } from "./mappers";
import type { CenterSettings } from "@/app/types";

/** Loads a center's settings (subjects, groups, year packages) via the API. */
export async function loadCenterSettings(
  centerId: string
): Promise<CenterSettings | undefined> {
  const center = await apiFetchServer<Record<string, unknown>>(
    `/centers/${centerId}`
  );
  return toCenterSettings(center);
}

/**
 * Persists a full settings document upstream: PUT /centers/:id/settings for
 * the price list + groups, then wholesale-replaces the year packages.
 */
export async function saveCenterSettings(
  centerId: string,
  settings: CenterSettings
): Promise<void> {
  await apiFetchServer(`/centers/${centerId}/settings`, {
    method: "PUT",
    body: {
      bundlePrice: settings.bundlePrice,
      maxStudentsPerClass: settings.maxStudentsPerClass,
      subjects: settings.subjects.map((s) => ({
        level: s.level.toUpperCase(),
        grade: s.grade,
        track: s.track,
        name: s.name,
        price: s.price,
      })),
      groupsPerYear: settings.groupsPerYear.map((g) => ({
        level: g.level.toUpperCase(),
        grade: g.grade,
        count: g.count,
      })),
    },
  });

  const center = await apiFetchServer<Record<string, unknown>>(
    `/centers/${centerId}`
  );
  const existing = Array.isArray(center.yearPackages)
    ? (center.yearPackages as { id?: string }[])
    : [];
  await Promise.all(
    existing
      .filter((p) => p.id)
      .map((p) =>
        apiFetchServer(`/centers/${centerId}/year-packages/${p.id}`, {
          method: "DELETE",
        })
      )
  );
  for (const year of settings.years ?? []) {
    await apiFetchServer(`/centers/${centerId}/year-packages`, {
      method: "POST",
      body: {
        level: year.level.toUpperCase(),
        grade: year.grade,
        track: year.track,
        teacherId: year.teacher,
        bundlePrice: year.bundlePrice,
        maxStudentsPerClass: year.maxStudentsPerClass || 30,
        subjects: year.subjects.map((s) => ({
          level: s.level.toUpperCase(),
          grade: s.grade,
          track: s.track,
          name: s.name,
          price: s.price,
        })),
        groupsPerYear: year.groupsPerYear.map((g) => ({
          level: g.level.toUpperCase(),
          grade: g.grade,
          count: g.count,
        })),
      },
    });
  }
}
