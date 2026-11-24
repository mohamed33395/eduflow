import { notFound } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth-cookies";
import { ApiError } from "@/app/lib/api";
import { apiFetchServer } from "@/app/lib/api-server";
import { toCenter } from "@/app/lib/mappers";
import { getI18n } from "@/app/lib/i18n/server";
import { LandingProfileForm } from "@/app/components/LandingProfileForm";
import type { LandingRequest } from "@/app/types";

export const dynamic = "force-dynamic";

export default async function CenterProfilePage() {
  const { t } = await getI18n();
  const user = await getSessionUser();
  const centerId = user?.centerId;
  if (!centerId) notFound();

  const row = await apiFetchServer<Record<string, unknown>>(
    `/centers/${centerId}`
  ).catch((err) => {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  });
  if (!row) notFound();
  const center = toCenter(row);
  // Booking requests submitted through this center's public landing page.
  const requests = await apiFetchServer<LandingRequest[]>(
    "/landing-requests"
  ).catch(() => [] as LandingRequest[]);

  return (
    <div className="max-w-4xl space-y-2">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t("landingProfile")}
        </h1>
        <p className="text-slate-500">{t("landingProfileDescription")}</p>
      </div>
      <LandingProfileForm
        kind="center"
        id={center.id}
        slug={center.slug}
        initial={center.landing ?? {}}
        base={{
          logo: center.logo,
          phone: center.phone,
          address: center.address,
        }}
        requests={requests}
      />
    </div>
  );
}
