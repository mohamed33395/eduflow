import Image from "next/image";
import Link from "next/link";
import {
  GraduationCap,
  MapPin,
  Phone,
  Mail,
  Globe,
  MessageCircle,
  Sparkles,
  BookOpen,
  Trophy,
} from "lucide-react";
import { getI18n } from "@/app/lib/i18n/server";
import { LandingRequestForm } from "@/app/components/LandingRequestForm";
import type { LandingProfile } from "@/app/types";

/**
 * Shared public landing-page renderer for /center/[slug] and /course/[slug].
 * Renders whatever the owner filled in "الملف التعريفي" and falls back to the
 * entity's base columns (name, logo, phone…) so the page always looks
 * complete even before the profile is edited.
 */

export interface PublicLandingProps {
  /** Which public page this is — picks the booking slug key. */
  kind: "center" | "course";
  /** Public slug — posted with booking requests. */
  slug: string;
  /** Display name of the entity (center or course). */
  name: string;
  /** Logo (center) or cover image (course) shown as the brand mark. */
  image?: string;
  /** Pre-rendered meta chip, e.g. "online · high · grades 9–12". */
  subtitle?: string;
  /** Base description used when landing.about is empty. */
  description?: string;
  email?: string;
  phone?: string;
  address?: string;
  landing?: LandingProfile;
  /** Fallback CTA when the profile has none — typically the login URL. */
  defaultCta: { label: string; href: string };
}

export async function PublicLanding({
  kind,
  slug,
  name,
  image,
  subtitle,
  description,
  email,
  phone,
  address,
  landing,
  defaultCta,
}: PublicLandingProps) {
  const { t } = await getI18n();

  const accent = landing?.accentColor || "#4f46e5";
  const colors = landing?.colors ?? {};
  /** Style helpers — inline styles beat the Tailwind text/bg classes. */
  const cardStyle = colors.cardBg
    ? { backgroundColor: colors.cardBg }
    : undefined;
  const titleStyle = colors.titleColor
    ? { color: colors.titleColor }
    : undefined;
  const textStyle = colors.textColor
    ? { color: colors.textColor }
    : undefined;
  const labels = landing?.labels;
  const L = (key: keyof NonNullable<typeof labels>, fallback: string) =>
    labels?.[key]?.trim() || fallback;
  const heroImage = landing?.heroImage || undefined;
  // Brand mark beside the title: owner override → entity logo/cover.
  const brandImage = landing?.heroLogo?.trim() || image;
  const headline = landing?.headline || name;
  const tagline = landing?.tagline || landing?.subtitle || subtitle;
  const about = landing?.about || description;
  const cta = {
    label: landing?.ctaLabel || defaultCta.label,
    href: landing?.ctaUrl || defaultCta.href,
  };
  const contactPhone = landing?.phone || phone;
  const contactAddress = landing?.address || address;
  const whatsapp = landing?.whatsapp
    ? `https://wa.me/${landing.whatsapp.replace(/[^\d+]/g, "").replace(/^\+/, "")}`
    : undefined;
  const socials = (landing?.socials ?? {}) as Record<string, string | undefined>;
  const socialEntries = (
    ["facebook", "instagram", "youtube", "tiktok", "telegram"] as const
  )
    .map((k) => ({ key: k, url: socials[k]?.trim() }))
    .filter((s) => s.url);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* ── hero ── */}
      <section
        className="relative overflow-hidden"
        style={colors.heroBg ? { backgroundColor: colors.heroBg } : undefined}
      >
        {heroImage && (
          <Image
            src={heroImage}
            alt={name}
            fill
            unoptimized
            priority
            className="object-cover"
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background: heroImage
              ? "linear-gradient(135deg, rgba(15,23,42,0.85), rgba(15,23,42,0.45))"
              : `linear-gradient(135deg, ${accent}22, ${accent}0d), #ffffff`,
          }}
        />
        <div className="relative mx-auto flex min-h-[70vh] max-w-5xl flex-col items-center justify-center gap-6 px-6 py-20 text-center">
          {brandImage && (
            <div className="overflow-hidden rounded-2xl bg-white/90 p-2 shadow-xl ring-1 ring-black/5">
              <Image
                src={brandImage}
                alt={name}
                width={140}
                height={140}
                unoptimized
                className="h-24 w-auto rounded-xl object-contain"
              />
            </div>
          )}
          <h1
            className={`max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl ${
              heroImage ? "text-white" : "text-slate-900"
            }`}
            style={titleStyle}
          >
            {headline}
          </h1>
          {tagline && (
            <p
              className={`max-w-2xl text-lg ${
                heroImage ? "text-slate-200" : "text-slate-600"
              }`}
            >
              {tagline}
            </p>
          )}
          {subtitle && landing?.headline && (
            <p
              className={`text-sm font-medium ${
                heroImage ? "text-slate-300" : "text-slate-500"
              }`}
            >
              {subtitle}
            </p>
          )}
          {landing?.ctaEnabled !== false && (
            <Link
              href={cta.href}
              className="mt-2 inline-block rounded-full px-8 py-3 text-base font-semibold text-white shadow-lg transition hover:opacity-90"
              style={{ backgroundColor: accent }}
            >
              {cta.label}
            </Link>
          )}
        </div>
      </section>

      {/* ── features ── */}
      {landing?.features?.length ? (
        <section
          className="px-6 py-16"
          style={colors.featuresBg ? { backgroundColor: colors.featuresBg } : undefined}
        >
          <div className="mx-auto max-w-5xl">
          <h2 className="mb-8 text-2xl font-bold" style={titleStyle}>
            {L("featuresTitle", t("landingFeatures"))}
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {landing.features.map((f, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                style={cardStyle}
              >
                <div
                  className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${accent}1a`, color: accent }}
                >
                  <Sparkles size={18} />
                </div>
                <h3 className="font-semibold" style={titleStyle}>{f.title}</h3>
                {f.description && (
                  <p className="mt-1 text-sm text-slate-600" style={textStyle}>{f.description}</p>
                )}
              </div>
            ))}
          </div>
          </div>
        </section>
      ) : null}

      {/* ── about ── */}
      {about && (
        <section
          className="px-6 py-8"
          style={colors.aboutBg ? { backgroundColor: colors.aboutBg } : undefined}
        >
          <div className="mx-auto max-w-5xl">
          <div
            className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
            style={cardStyle}
          >
            <div className="mb-4 flex items-center gap-2 text-slate-500">
              <BookOpen size={18} />
              <h2 className="text-lg font-semibold text-slate-900" style={titleStyle}>
                {L("aboutTitle", t("landingAboutTitle"))}
              </h2>
            </div>
            <p
              className="whitespace-pre-wrap leading-relaxed text-slate-700"
              style={textStyle}
            >
              {about}
            </p>
          </div>
          </div>
        </section>
      )}

      {/* ── gallery ── */}
      {landing?.gallery?.length ? (
        <section
          className="px-6 py-12"
          style={colors.galleryBg ? { backgroundColor: colors.galleryBg } : undefined}
        >
          <div className="mx-auto max-w-5xl">
          <h2 className="mb-8 text-2xl font-bold" style={titleStyle}>
            {L("galleryTitle", t("landingGallery"))}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {landing.gallery.map((url, i) => (
              <div
                key={i}
                className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
              >
                <Image
                  src={url}
                  alt={`${name} ${i + 1}`}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
            ))}
          </div>
          </div>
        </section>
      ) : null}

      {/* ── top students ── */}
      {landing?.topStudents?.length ? (
        <section
          className="px-6 py-12"
          style={colors.topStudentsBg ? { backgroundColor: colors.topStudentsBg } : undefined}
        >
          <div className="mx-auto max-w-5xl">
          <h2
            className="mb-8 flex items-center gap-2 text-2xl font-bold"
            style={titleStyle}
          >
            <Trophy size={24} style={{ color: accent }} />
            {L("topStudentsTitle", t("landingTopStudents"))}
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {landing.topStudents.map((s, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm"
                style={cardStyle}
              >
                {s.image ? (
                  <div
                    className="relative mx-auto mb-3 h-20 w-20 overflow-hidden rounded-full"
                    style={{ boxShadow: `0 0 0 2px ${accent}` }}
                  >
                    <Image
                      src={s.image}
                      alt={s.name}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div
                    className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white"
                    style={{ backgroundColor: accent }}
                  >
                    {s.name.trim()[0]}
                  </div>
                )}
                <h3 className="font-semibold" style={titleStyle}>{s.name}</h3>
                {s.subtitle && (
                  <p className="mt-1 text-sm text-slate-500" style={textStyle}>{s.subtitle}</p>
                )}
              </div>
            ))}
          </div>
          </div>
        </section>
      ) : null}

      {/* ── booking request ── */}
      {landing?.bookingEnabled !== false && (
        <section
          className="px-6 py-12"
          style={colors.bookingBg ? { backgroundColor: colors.bookingBg } : undefined}
        >
          <div className="mx-auto max-w-5xl">
          <div
            className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
            style={cardStyle}
          >
            <h2 className="text-2xl font-bold" style={titleStyle}>
              {L("bookingTitle", t("requestFormTitle"))}
            </h2>
            <p className="mt-1 mb-6 text-sm text-slate-500" style={textStyle}>
              {L("bookingSubtitle", t("requestFormSubtitle"))}
            </p>
            <LandingRequestForm
              kind={kind}
              slug={slug}
              accent={accent}
              labels={labels}
            />
          </div>
          </div>
        </section>
      )}

      {/* ── contact + socials ── */}
      {(contactPhone || whatsapp || contactAddress || email || socialEntries.length) ? (
        <section
          className="px-6 py-12"
          style={colors.contactBg ? { backgroundColor: colors.contactBg } : undefined}
        >
          <div className="mx-auto max-w-5xl">
          <div
            className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
            style={cardStyle}
          >
            <h2 className="mb-6 text-2xl font-bold" style={titleStyle}>
              {L("contactTitle", t("landingContactTitle"))}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {contactPhone && (
                <a
                  href={`tel:${contactPhone}`}
                  className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 transition hover:bg-slate-100"
                >
                  <Phone size={18} style={{ color: accent }} />
                  <span dir="ltr">{contactPhone}</span>
                </a>
              )}
              {whatsapp && (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 transition hover:bg-slate-100"
                >
                  <MessageCircle size={18} style={{ color: accent }} />
                  <span dir="ltr">{landing?.whatsapp}</span>
                </a>
              )}
              {contactAddress && (
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
                  <MapPin size={18} style={{ color: accent }} />
                  <span>{contactAddress}</span>
                </div>
              )}
              {email && (
                <a
                  href={`mailto:${email}`}
                  className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 transition hover:bg-slate-100"
                >
                  <Mail size={18} style={{ color: accent }} />
                  <span dir="ltr">{email}</span>
                </a>
              )}
            </div>
            {socialEntries.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-3">
                {socialEntries.map((s) => (
                  <a
                    key={s.key}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-400"
                  >
                    {s.key[0].toUpperCase() + s.key.slice(1)}
                  </a>
                ))}
              </div>
            )}
          </div>
          </div>
        </section>
      ) : null}

      {/* ── footer ── */}
      <footer
        className="border-t border-slate-200"
        style={{ backgroundColor: colors.footerBg || "#ffffff" }}
      >
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-sm text-slate-500">
          <span className="flex items-center gap-2 font-medium text-slate-700">
            <GraduationCap size={16} />
            {name}
          </span>
          <a
            href="/"
            className="flex items-center gap-1.5 hover:text-slate-700"
          >
            <Globe size={14} />
            {landing?.footerText?.trim() || `${t("poweredBy")} EduFlow`}
          </a>
        </div>
      </footer>
    </main>
  );
}
