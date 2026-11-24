import { getCourseBySlugPublic } from "@/app/services/courses-public";
import { PublicLanding } from "@/app/components/public-landing";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseBySlugPublic(slug).catch(() => null);
  if (!course) return {};
  return {
    title: course.landing?.headline || course.name,
    description:
      course.landing?.tagline || course.landing?.about || course.description || undefined,
  };
}

export default async function CoursePublicPage({ params }: Params) {
  const { slug } = await params;
  const course = await getCourseBySlugPublic(slug);
  if (!course) notFound();
  // The owner can hide the public page from "الملف التعريفي".
  if (course.landing?.published === false) notFound();

  return (
    <PublicLanding
      kind="course"
      slug={course.slug}
      name={course.name}
      image={course.coverImage}
      subtitle={`${course.type} • ${course.level} • Grades ${course.gradeFrom} - ${course.gradeTo}`}
      description={course.description}
      landing={course.landing}
      defaultCta={{ label: "Login to Course", href: "/login?redirect=/course" }}
    />
  );
}
