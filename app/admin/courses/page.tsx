"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/hooks/useAuth";
import { Table } from "@/app/components/ui/table";
import { Button } from "@/app/components/ui/button";
import { useI18n } from "@/app/lib/i18n/client";
import Link from "next/link";
import type { Course } from "@/app/types";

export default function AdminCoursesPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    fetch("/api/admin/courses", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || t("failedToLoadCourses"));
        }
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setCourses(data as Course[]);
      })
      .catch((err) => {
        console.error("[AdminCoursesPage] load error:", err);
        if (!cancelled) setError(t("failedToLoadCourses"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t("manageCourses")}
        </h1>
        <Link href="/admin/courses/new">
          <Button>{t("addCourse")}</Button>
        </Link>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {authLoading || loading ? (
        <p className="text-slate-500">{t("loading")}</p>
      ) : (
        <Table
          columns={[
            { key: "name", header: t("name") },
            { key: "type", header: t("type") },
            { key: "level", header: t("level") },
            {
              key: "grades",
              header: t("grades"),
              render: (row: Course) => `${row.gradeFrom} - ${row.gradeTo}`,
            },
            {
              key: "url",
              header: t("url"),
              render: (row: Course) => (
                <Link
                  href={`/course/${row.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:underline"
                >
                  {row.name}
                </Link>
              ),
            },
            {
              key: "actions",
              header: t("actions"),
              render: (row: Course) => (
                <Link href={`/admin/courses/${row.id}/edit`}>
                  <Button variant="ghost" size="sm">
                    {t("edit")}
                  </Button>
                </Link>
              ),
            },
          ]}
          rows={courses}
          keyExtractor={(row) => row.id}
          emptyText={t("noCoursesFound")}
        />
      )}
    </div>
  );
}
