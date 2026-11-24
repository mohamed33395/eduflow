"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/app/lib/api";
import { useI18n } from "@/app/lib/i18n/client";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Switch } from "@/app/components/ui/switch";
import { ImageUpload } from "@/app/components/ui/ImageUpload";
import { LandingRequestsList } from "@/app/components/LandingRequestsList";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import type { LandingProfile, LandingRequest } from "@/app/types";

/**
 * Shared "الملف التعريفي" editor used by the center and the course dashboards.
 * Everything the owner types here is saved into the `landing` JSON column
 * (plus the matching base columns like logo/cover) and rendered on the
 * public /center/[slug] or /course/[slug] landing page.
 */

interface LandingProfileFormProps {
  kind: "center" | "course";
  id: string;
  /** Slug — used to show the public page link. */
  slug: string;
  initial: LandingProfile;
  /** Base entity columns the form also edits (kind-dependent). */
  base: {
    logo?: string;
    coverImage?: string;
    phone?: string;
    address?: string;
    description?: string;
  };
  /** Booking requests — rendered inside the "طلبات الحجز" tab. */
  requests?: LandingRequest[];
}

const MAX_GALLERY = 12;
const MAX_FEATURES = 12;
const MAX_STUDENTS = 12;

export function LandingProfileForm({
  kind,
  id,
  slug,
  initial,
  base,
  requests,
}: LandingProfileFormProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [data, setData] = useState<LandingProfile>(initial);
  const [baseData, setBaseData] = useState(base);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  /** Which vertical tab is active. */
  const [tab, setTab] = useState("general");

  const set = <K extends keyof LandingProfile>(key: K, value: LandingProfile[K]) =>
    setData((prev) => ({ ...prev, [key]: value }));

  const published = data.published !== false;
  const publicPath = `/${kind}/${slug}`;

  const setFeature = (
    index: number,
    patch: Partial<NonNullable<LandingProfile["features"]>[number]>
  ) =>
    setData((prev) => ({
      ...prev,
      features: (prev.features ?? []).map((f, i) =>
        i === index ? { ...f, ...patch } : f
      ),
    }));

  const setStudent = (
    index: number,
    patch: Partial<NonNullable<LandingProfile["topStudents"]>[number]>
  ) =>
    setData((prev) => ({
      ...prev,
      topStudents: (prev.topStudents ?? []).map((s, i) =>
        i === index ? { ...s, ...patch } : s
      ),
    }));

  const clean = (): LandingProfile => {
    const out: LandingProfile = { published: data.published ?? true };
    out.bookingEnabled = data.bookingEnabled ?? true;
    out.ctaEnabled = data.ctaEnabled ?? true;
    const put = (k: keyof LandingProfile, v: unknown) => {
      if (typeof v === "string" && v.trim() !== "") {
        (out as Record<string, unknown>)[k] = v.trim();
      }
    };
    put("headline", data.headline);
    put("tagline", data.tagline);
    put("subtitle", data.subtitle);
    put("footerText", data.footerText);
    put("about", data.about);
    put("ctaLabel", data.ctaLabel);
    put("ctaUrl", data.ctaUrl);
    put("phone", data.phone);
    put("whatsapp", data.whatsapp);
    put("address", data.address);
    put("website", data.website);
    put("heroImage", data.heroImage);
    put("heroLogo", data.heroLogo);
    put("accentColor", data.accentColor);
    const gallery = (data.gallery ?? []).map((g) => g.trim()).filter(Boolean);
    if (gallery.length) out.gallery = gallery;
    const features = (data.features ?? []).filter((f) => f.title.trim());
    if (features.length) {
      out.features = features.map((f) => ({
        title: f.title.trim(),
        ...(f.description?.trim() && { description: f.description.trim() }),
      }));
    }
    const topStudents = (data.topStudents ?? []).filter((s) => s.name.trim());
    if (topStudents.length) {
      out.topStudents = topStudents.map((s) => ({
        name: s.name.trim(),
        ...(s.subtitle?.trim() && { subtitle: s.subtitle.trim() }),
        ...(s.image?.trim() && { image: s.image.trim() }),
      }));
    }
    const s = data.socials ?? {};
    const socials = Object.fromEntries(
      Object.entries(s).filter(([, v]) => typeof v === "string" && v.trim())
    ) as LandingProfile["socials"];
    if (socials && Object.keys(socials).length) out.socials = socials;
    const l = data.labels ?? {};
    const labels = Object.fromEntries(
      Object.entries(l).filter(([, v]) => typeof v === "string" && v.trim())
    ) as LandingProfile["labels"];
    if (labels && Object.keys(labels).length) out.labels = labels;
    const c = data.colors ?? {};
    const colors = Object.fromEntries(
      Object.entries(c).filter(([, v]) => typeof v === "string" && v.trim())
    ) as LandingProfile["colors"];
    if (colors && Object.keys(colors).length) out.colors = colors;
    return out;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const payload: Record<string, unknown> = { landing: clean() };
      if (kind === "center") {
        payload.logo = baseData.logo || undefined;
        payload.phone = baseData.phone || undefined;
        payload.address = baseData.address || undefined;
      } else {
        payload.coverImage = baseData.coverImage || undefined;
        payload.description = baseData.description || undefined;
      }
      await api.patch(`/${kind}s/${id}`, payload);
      setSuccess(t("landingSaved"));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("landingSaveFailed"));
    } finally {
      setLoading(false);
    }
  };

  const section =
    "space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800";
  const h2 =
    "text-lg font-semibold text-slate-900 dark:text-white";

  const tabs = [
    ["general", t("landingTabGeneral")],
    ["basics", t("landingBasics")],
    ["media", t("landingMedia")],
    ["features", t("landingFeatures")],
    ["students", t("landingTopStudents")],
    ["contact", t("landingContact")],
    ["socials", t("landingSocials")],
    ["colors", t("landingColors")],
    ["labels", t("landingLabels")],
    ...(requests ? [["requests", t("bookingRequests")]] : []),
  ] as const;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        {/* ── vertical tab rail ── */}
        <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200 pb-3 dark:border-slate-700 sm:sticky sm:top-6 sm:w-48 sm:flex-col sm:border-b-0 sm:border-e sm:pe-4 sm:pb-0">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-start text-sm font-medium transition ${
                tab === key
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                  : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
        {/* ── active tab content ── */}
        <div className="min-w-0 flex-1 space-y-6">
      {/* ── publish + public link ── */}
      {tab === "general" && (
      <section className={section}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Switch
              checked={published}
              onCheckedChange={(v) => set("published", v)}
            />
            <div>
              <p className={h2}>{t("landingPublished")}</p>
              <p className="text-sm text-slate-500">
                {t("landingPublishedHint")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={data.bookingEnabled !== false}
              onCheckedChange={(v) => set("bookingEnabled", v)}
            />
            <div>
              <p className={h2}>{t("landingBooking")}</p>
              <p className="text-sm text-slate-500">
                {t("landingBookingHint")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={data.ctaEnabled !== false}
              onCheckedChange={(v) => set("ctaEnabled", v)}
            />
            <div>
              <p className={h2}>{t("landingCtaEnabled")}</p>
              <p className="text-sm text-slate-500">
                {t("landingCtaEnabledHint")}
              </p>
            </div>
          </div>
          {slug && (
            <Link
              href={publicPath}
              target="_blank"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-slate-50 dark:border-slate-700 dark:text-indigo-400 dark:hover:bg-slate-900"
            >
              {publicPath}
              <ExternalLink size={15} />
            </Link>
          )}
        </div>
      </section>
      )}

      {/* ── basics ── */}
      {tab === "basics" && (
      <section className={section}>
        <h2 className={h2}>{t("landingBasics")}</h2>
        <Input
          label={t("landingHeadline")}
          value={data.headline ?? ""}
          onChange={(e) => set("headline", e.target.value)}
          maxLength={300}
        />
        <Input
          label={t("landingTagline")}
          value={data.tagline ?? ""}
          onChange={(e) => set("tagline", e.target.value)}
          maxLength={500}
        />
        <Input
          label={t("landingSubtitle")}
          value={data.subtitle ?? ""}
          onChange={(e) => set("subtitle", e.target.value)}
          maxLength={300}
        />
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t("landingAbout")}
          </label>
          <Textarea
            rows={5}
            value={data.about ?? ""}
            onChange={(e) => set("about", e.target.value)}
            maxLength={5000}
          />
        </div>
        {kind === "course" && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              {t("landingDescription")}
            </label>
            <Textarea
              rows={3}
              value={baseData.description ?? ""}
              onChange={(e) =>
                setBaseData((p) => ({ ...p, description: e.target.value }))
              }
            />
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t("landingCtaLabel")}
            value={data.ctaLabel ?? ""}
            onChange={(e) => set("ctaLabel", e.target.value)}
            maxLength={100}
          />
          <Input
            label={t("landingCtaUrl")}
            value={data.ctaUrl ?? ""}
            onChange={(e) => set("ctaUrl", e.target.value)}
            placeholder="/login"
            dir="ltr"
            maxLength={500}
          />
        </div>
        <Input
          label={t("landingAccentColor")}
          type="color"
          value={data.accentColor ?? "#4f46e5"}
          onChange={(e) => set("accentColor", e.target.value)}
          className="h-12 w-24 cursor-pointer p-1"
        />
        <Input
          label={t("landingFooterText")}
          value={data.footerText ?? ""}
          onChange={(e) => set("footerText", e.target.value)}
          maxLength={200}
        />
      </section>
      )}

      {/* ── media ── */}
      {tab === "media" && (
      <section className={section}>
        <h2 className={h2}>{t("landingMedia")}</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {kind === "center" && (
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("landingLogo")}
              </p>
              <ImageUpload
                folder="centers"
                compact
                value={baseData.logo ?? ""}
                onUpload={(url) =>
                  setBaseData((p) => ({ ...p, logo: url }))
                }
              />
            </div>
          )}
          {kind === "course" && (
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("landingCoverImage")}
              </p>
              <ImageUpload
                folder="courses"
                compact
                value={baseData.coverImage ?? ""}
                onUpload={(url) =>
                  setBaseData((p) => ({ ...p, coverImage: url }))
                }
              />
            </div>
          )}
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              {t("landingHeroImage")}
            </p>
            <ImageUpload
              folder={kind === "center" ? "centers" : "courses"}
              compact
              value={data.heroImage ?? ""}
              onUpload={(url) => set("heroImage", url)}
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              {t("landingHeroLogo")}
            </p>
            <p className="mb-2 text-xs text-slate-400">
              {t("landingHeroLogoHint")}
            </p>
            <ImageUpload
              folder={kind === "center" ? "centers" : "courses"}
              compact
              value={data.heroLogo ?? ""}
              onUpload={(url) => set("heroLogo", url)}
            />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4 dark:border-slate-700">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="font-medium text-slate-900 dark:text-white">
                {t("landingGallery")}
              </h3>
              <p className="text-sm text-slate-500">{t("landingGalleryHint")}</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={(data.gallery ?? []).length >= MAX_GALLERY}
              onClick={() =>
                set("gallery", [...(data.gallery ?? []), ""])
              }
            >
              <Plus size={15} className="me-1" />
              {t("addImage")}
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(data.gallery ?? []).map((url, i) => (
              <div key={i} className="relative">
                <ImageUpload
                  folder={kind === "center" ? "centers" : "courses"}
                  compact
                  value={url}
                  onUpload={(u) =>
                    set(
                      "gallery",
                      (data.gallery ?? []).map((g, gi) =>
                        gi === i ? u : g
                      )
                    )
                  }
                />
                <button
                  type="button"
                  onClick={() =>
                    set(
                      "gallery",
                      (data.gallery ?? []).filter((_, gi) => gi !== i)
                    )
                  }
                  className="absolute -top-2 -end-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white shadow hover:bg-red-700"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* ── features ── */}
      {tab === "features" && (
      <section className={section}>
        <div className="flex items-center justify-between">
          <h2 className={h2}>{t("landingFeatures")}</h2>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={(data.features ?? []).length >= MAX_FEATURES}
            onClick={() =>
              set("features", [
                ...(data.features ?? []),
                { title: "", description: "" },
              ])
            }
          >
            <Plus size={15} className="me-1" />
            {t("landingAddFeature")}
          </Button>
        </div>
        <div className="space-y-3">
          {(data.features ?? []).map((f, i) => (
            <div
              key={i}
              className="grid gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900 sm:grid-cols-[1fr,2fr,auto] items-start"
            >
              <Input
                label={t("landingFeatureTitle")}
                value={f.title}
                onChange={(e) => setFeature(i, { title: e.target.value })}
                maxLength={150}
              />
              <Input
                label={t("landingFeatureDescription")}
                value={f.description ?? ""}
                onChange={(e) =>
                  setFeature(i, { description: e.target.value })
                }
                maxLength={500}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-6 px-2 text-red-600"
                onClick={() =>
                  set(
                    "features",
                    (data.features ?? []).filter((_, fi) => fi !== i)
                  )
                }
              >
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
        </div>
      </section>
      )}

      {/* ── top students ── */}
      {tab === "students" && (
      <section className={section}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className={h2}>{t("landingTopStudents")}</h2>
            <p className="text-sm text-slate-500">
              {t("landingTopStudentsHint")}
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={(data.topStudents ?? []).length >= MAX_STUDENTS}
            onClick={() =>
              set("topStudents", [
                ...(data.topStudents ?? []),
                { name: "", subtitle: "" },
              ])
            }
          >
            <Plus size={15} className="me-1" />
            {t("landingAddStudent")}
          </Button>
        </div>
        <div className="space-y-3">
          {(data.topStudents ?? []).map((s, i) => (
            <div
              key={i}
              className="grid gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900 sm:grid-cols-[1fr,1fr,140px,auto] items-start"
            >
              <Input
                label={t("landingStudentName")}
                value={s.name}
                onChange={(e) => setStudent(i, { name: e.target.value })}
                maxLength={100}
              />
              <Input
                label={t("landingStudentSubtitle")}
                value={s.subtitle ?? ""}
                onChange={(e) =>
                  setStudent(i, { subtitle: e.target.value })
                }
                maxLength={200}
              />
              <ImageUpload
                folder={kind === "center" ? "centers" : "courses"}
                compact
                value={s.image ?? ""}
                onUpload={(url) => setStudent(i, { image: url })}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-6 px-2 text-red-600"
                onClick={() =>
                  set(
                    "topStudents",
                    (data.topStudents ?? []).filter((_, si) => si !== i)
                  )
                }
              >
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
        </div>
      </section>
      )}

      {/* ── contact ── */}
      {tab === "contact" && (
      <section className={section}>
        <h2 className={h2}>{t("landingContact")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t("phone")}
            value={kind === "center" ? baseData.phone ?? "" : data.phone ?? ""}
            onChange={(e) =>
              kind === "center"
                ? setBaseData((p) => ({ ...p, phone: e.target.value }))
                : set("phone", e.target.value)
            }
            dir="ltr"
            maxLength={30}
          />
          <Input
            label={t("landingWhatsapp")}
            value={data.whatsapp ?? ""}
            onChange={(e) => set("whatsapp", e.target.value)}
            placeholder="2010XXXXXXXX"
            dir="ltr"
            maxLength={30}
          />
          <Input
            label={t("address")}
            value={
              kind === "center" ? baseData.address ?? "" : data.address ?? ""
            }
            onChange={(e) =>
              kind === "center"
                ? setBaseData((p) => ({ ...p, address: e.target.value }))
                : set("address", e.target.value)
            }
            maxLength={300}
          />
          <Input
            label={t("landingWebsite")}
            value={data.website ?? ""}
            onChange={(e) => set("website", e.target.value)}
            placeholder="https://"
            dir="ltr"
            maxLength={500}
          />
        </div>
      </section>
      )}

      {/* ── socials ── */}
      {tab === "socials" && (
      <section className={section}>
        <h2 className={h2}>{t("landingSocials")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            ["facebook", "instagram", "youtube", "tiktok", "telegram"] as const
          ).map((key) => (
            <Input
              key={key}
              label={key[0].toUpperCase() + key.slice(1)}
              value={data.socials?.[key] ?? ""}
              onChange={(e) =>
                set("socials", { ...data.socials, [key]: e.target.value })
              }
              placeholder="https://"
              dir="ltr"
              maxLength={500}
            />
          ))}
        </div>
      </section>
      )}

      {/* ── section colors ── */}
      {tab === "colors" && (
      <section className={section}>
        <h2 className={h2}>{t("landingColors")}</h2>
        <p className="text-sm text-slate-500">{t("landingColorsHint")}</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ["heroBg", "landingColorHero"],
              ["featuresBg", "landingColorFeatures"],
              ["aboutBg", "landingColorAbout"],
              ["topStudentsBg", "landingColorTopStudents"],
              ["galleryBg", "landingColorGallery"],
              ["bookingBg", "landingColorBooking"],
              ["contactBg", "landingColorContact"],
              ["footerBg", "landingColorFooter"],
              ["cardBg", "landingColorCard"],
              ["titleColor", "landingColorTitle"],
              ["textColor", "landingColorText"],
            ] as const
          ).map(([key, labelKey]) => {
            const val = data.colors?.[key];
            return (
              <div key={key} className="flex items-center gap-3">
                <Input
                  label={t(labelKey)}
                  type="color"
                  value={val && /^#([0-9a-fA-F]{3}){1,2}$/.test(val) ? val : "#ffffff"}
                  onChange={(e) =>
                    set("colors", { ...data.colors, [key]: e.target.value })
                  }
                  className="h-12 w-20 cursor-pointer p-1"
                />
                {val ? (
                  <button
                    type="button"
                    onClick={() =>
                      set("colors", { ...data.colors, [key]: "" })
                    }
                    className="mt-6 text-xs text-red-500 hover:underline"
                  >
                    {t("landingColorReset")}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
      )}

      {/* ── page text overrides ── */}
      {tab === "labels" && (
      <section className={section}>
        <h2 className={h2}>{t("landingLabels")}</h2>
        <p className="text-sm text-slate-500">{t("landingLabelsHint")}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["featuresTitle", "landingFeatures"],
              ["aboutTitle", "landingAboutTitle"],
              ["galleryTitle", "landingGallery"],
              ["topStudentsTitle", "landingTopStudents"],
              ["contactTitle", "landingContactTitle"],
              ["bookingTitle", "requestFormTitle"],
              ["bookingSubtitle", "requestFormSubtitle"],
              ["bookingRoleStudent", "requestStudent"],
              ["bookingRoleTeacher", "requestTeacher"],
              ["bookingNameLabel", "requestName"],
              ["bookingPhoneLabel", "requestPhone"],
              ["bookingEmailLabel", "requestEmail"],
              ["bookingMessageLabel", "requestMessage"],
              ["bookingSubmitLabel", "requestSubmit"],
              ["bookingSuccess", "requestSuccess"],
            ] as const
          ).map(([key, defaultKey]) => (
            <Input
              key={key}
              label={t(defaultKey)}
              placeholder={t(defaultKey)}
              value={data.labels?.[key] ?? ""}
              onChange={(e) =>
                set("labels", { ...data.labels, [key]: e.target.value })
              }
              maxLength={300}
            />
          ))}
        </div>
      </section>
      )}

      {tab === "requests" && requests && (
        <section className={section}>
          <h2 className={h2}>{t("bookingRequests")}</h2>
          <p className="mb-4 text-sm text-slate-500">
            {t("bookingRequestsHint")}
          </p>
          <LandingRequestsList initial={requests} />
        </section>
      )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}

      <Button type="submit" loading={loading}>
        {loading ? t("saving") : t("saveChanges")}
      </Button>
    </form>
  );
}
