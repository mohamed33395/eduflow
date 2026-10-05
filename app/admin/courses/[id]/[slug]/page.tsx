"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import { useAuth } from "@/app/hooks/useAuth";
import { StatsCard } from "@/app/components/ui/StatsCard";
import { Card } from "@/app/components/ui/card";
import type { Course, Lesson, Assignment, Student } from "@/app/types";
import { BookOpen, FileText, Users, Layout } from "lucide-react";

export default function AdminCourseViewPage({
  params,
}: PageProps<"/admin/courses/[id]/[slug]">) {
  const { slug } = use(params);
  const { user, loading: authLoading } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [enrolled, setEnrolled] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading || !user) {
      if (!authLoading) setLoading(false);
      return;
    }

    let cancelled = false;
    fetch(`/api/admin/courses/${slug}`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load course");
        }
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setCourse(data.course as Course);
          setLessons(data.lessons as Lesson[]);
          setAssignments(data.assignments as Assignment[]);
          setEnrolled(data.enrolled as Student[]);
        }
      })
      .catch((err) => {
        console.error("[AdminCourseViewPage] load error:", err);
        if (!cancelled) setError("Failed to load course.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, slug]);

  const stats = course
    ? [
        {
          title: "Course",
          value: course.name,
          icon: <Layout size={22} />,
        },
        {
          title: "Lessons",
          value: lessons.length,
          icon: <BookOpen size={22} />,
        },
        {
          title: "Assignments",
          value: assignments.length,
          icon: <FileText size={22} />,
        },
        {
          title: "Students",
          value: enrolled.length,
          icon: <Users size={22} />,
        },
      ]
    : [];

  if (authLoading || loading) {
    return <p className="text-slate-500">Loading...</p>;
  }

  if (error) {
    return <p className="text-red-600 text-sm">{error}</p>;
  }

  if (!course) {
    return <p className="text-slate-500">Course not found.</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {course.name}
        </h1>
        <p className="text-slate-500">
          Manage content, lessons and students for this course.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <StatsCard key={s.title} title={s.title} value={s.value} icon={s.icon} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 text-lg font-semibold">Lessons</h3>
          <ul className="space-y-3">
            {lessons.slice(0, 5).map((l) => (
              <li key={l.id} className="text-slate-700">
                {l.title}
              </li>
            ))}
            {lessons.length === 0 && (
              <li className="text-sm text-slate-500">No lessons yet.</li>
            )}
          </ul>
        </Card>
        <Card>
          <h3 className="mb-4 text-lg font-semibold">Assignments</h3>
          <ul className="space-y-3">
            {assignments.slice(0, 5).map((a) => (
              <li key={a.id} className="text-slate-700">
                {a.title}
              </li>
            ))}
            {assignments.length === 0 && (
              <li className="text-sm text-slate-500">No assignments yet.</li>
            )}
          </ul>
        </Card>
      </div>

      <Card>
        <h3 className="mb-4 text-lg font-semibold">Enrolled Students</h3>
        <ul className="space-y-3">
          {enrolled.slice(0, 10).map((s) => (
            <li key={s.id} className="text-slate-700">
              {s.name} — <span className="text-slate-400">{s.username}</span>
            </li>
          ))}
          {enrolled.length === 0 && (
            <li className="text-sm text-slate-500">No students enrolled yet.</li>
          )}
        </ul>
      </Card>

      <Card>
        <h3 className="mb-4 text-lg font-semibold">Course Content</h3>
        <p className="whitespace-pre-wrap text-slate-700">
          {course.content || "No content added yet."}
        </p>
      </Card>
    </div>
  );
}
