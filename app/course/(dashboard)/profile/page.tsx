import { notFound } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth-cookies";
import { ApiError } from "@/app/lib/api";
import { apiFetchServer } from "@/app/lib/api-server";
import { toCourse } from "@/app/lib/mappers";
import { getI18n } from "@/app/lib/i18n/server";
import { LandingProfileForm } from "@/app/components/LandingProfileForm";
import type { LandingRequest } from "@/app/types";

export const dynamic = "force-dynamic";

export default async function CourseProfilePage() {
  const { t } = await getI18n();
  const user = await getSessionUser();
  const courseId = user?.courseId;
  if (!courseId) notFound();

  const row = await apiFetchServer<Record<string, unknown>>(
    `/courses/${courseId}`
  ).catch((err) => {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  });
  if (!row) notFound();
  const course = toCourse(row);
  // Booking requests submitted through this course's public landing page.
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
        kind="course"
        id={course.id}
        slug={course.slug}
        initial={course.landing ?? {}}
        base={{
          coverImage: course.coverImage,
          description: course.description,
        }}
        requests={requests}
      />
    </div>
  );
}
