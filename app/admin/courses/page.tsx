"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/hooks/useAuth";
import { Table } from "@/app/components/ui/table";
import { Button } from "@/app/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { useI18n } from "@/app/lib/i18n/client";
import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import type { Course } from "@/app/types";

export default function AdminCoursesPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
  }, [authLoading, user, t]);

  const handleDelete = async (row: Course) => {
    if (!window.confirm(t("confirmDelete"))) return;
    setDeletingId(row.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/courses/${row.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Delete failed");
      }
      // backend removes the row entirely
      setCourses((prev) => prev.filter((c) => c.id !== row.id));
    } catch (err) {
      console.error("[AdminCoursesPage] delete error:", err);
      setError(t("failedToDeleteCourse"));
    } finally {
      setDeletingId(null);
    }
  };

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
            {
              key: "name",
              header: t("name"),
              render: (row: Course) => (
                <Link
                  href={`/admin/courses/${row.id}/${encodeURIComponent(row.slug)}`}
                  className="font-medium text-foreground hover:text-primary hover:underline"
                >
                  {row.name}
                </Link>
              ),
            },
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label={t("actions")}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link
                        href={`/admin/courses/${row.id}/${encodeURIComponent(row.slug)}`}
                      >
                        <Eye />
                        {t("view")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/admin/courses/${row.id}/edit`}>
                        <Pencil />
                        {t("edit")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:focus:bg-red-950/40"
                      disabled={deletingId === row.id}
                      onSelect={() => void handleDelete(row)}
                    >
                      <Trash2 />
                      {deletingId === row.id ? t("deleting") : t("delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
