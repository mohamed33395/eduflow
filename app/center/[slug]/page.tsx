import { getCenterBySlugPublic } from "@/app/services/centers-public";
import { PublicLanding } from "@/app/components/public-landing";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const center = await getCenterBySlugPublic(slug).catch(() => null);
  if (!center) return {};
  return {
    title: center.landing?.headline || center.name,
    description: center.landing?.tagline || center.landing?.about || undefined,
  };
}

export default async function CenterPublicPage({ params }: Params) {
  const { slug } = await params;
  const center = await getCenterBySlugPublic(slug);
  if (!center) notFound();
  // The owner can hide the public page from "الملف التعريفي".
  if (center.landing?.published === false) notFound();

  return (
    <PublicLanding
      kind="center"
      slug={center.slug}
      name={center.name}
      image={center.logo}
      email={center.email}
      phone={center.phone}
      address={center.address}
      landing={center.landing}
      defaultCta={{ label: "Login to Dashboard", href: "/login?redirect=/center" }}
    />
  );
}
