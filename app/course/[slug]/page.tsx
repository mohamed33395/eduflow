import { getCourseBySlugPublic } from "@/app/services/courses-public";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CoursePublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = await getCourseBySlugPublic(slug);
  if (!course) notFound();

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 p-6">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="text-3xl font-bold text-slate-900">{course.name}</h1>
        <p className="mt-2 text-sm font-medium text-indigo-600">
          {course.type} • {course.level} • Grades {course.gradeFrom} - {course.gradeTo}
        </p>
        {course.coverImage && (
          <img
            src={course.coverImage}
            alt={course.name}
            className="mt-6 h-48 w-full rounded-lg object-cover"
          />
        )}
        <p className="mt-6 whitespace-pre-wrap text-slate-700">
          {course.description || "No description provided."}
        </p>
        <div className="mt-8">
          <Link
            href="/login?redirect=/course"
            className="inline-block rounded-lg bg-indigo-600 px-6 py-2.5 font-semibold text-white hover:bg-indigo-700"
          >
            Login to Course
          </Link>
        </div>
      </div>
    </main>
  );
}
