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
import { toCenter } from "@/app/lib/mappers";
import { Eye, ExternalLink, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import type { Center } from "@/app/types";

export default function AdminCentersPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    fetch("/api/admin/centers", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || t("failedToLoadCenters"));
        }
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          const list = Array.isArray(data) ? data : (data as { items?: unknown[] }).items ?? [];
          setCenters(list.map((row) => toCenter(row as Record<string, unknown>)));
        }
      })
      .catch((err) => {
        console.error("[AdminCentersPage] load error:", err);
        if (!cancelled) setError(t("failedToLoadCenters"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, t]);

  const handleDelete = async (row: Center) => {
    if (!window.confirm(t("confirmDelete"))) return;
    setDeletingId(row.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/centers/${row.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Delete failed");
      }
      // backend deactivates rather than removing the row
      setCenters((prev) =>
        prev.map((c) => (c.id === row.id ? { ...c, status: "inactive" } : c))
      );
    } catch (err) {
      console.error("[AdminCentersPage] delete error:", err);
      setError(t("failedToDeleteCenter"));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t("manageCenters")}
        </h1>
        <Link href="/admin/centers/new">
          <Button>{t("addCenter")}</Button>
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
              render: (row: Center) => (
                <Link
                  href={`/admin/centers/${row.id}/${encodeURIComponent(row.slug)}`}
                  className="font-medium text-foreground hover:text-primary hover:underline"
                >
                  {row.name}
                </Link>
              ),
            },
            { key: "email", header: t("email") },
            {
              key: "status",
              header: t("status"),
              render: (row: Center) => (
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    row.status === "active"
                      ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
                      : "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"
                  }`}
                >
                  {t(row.status)}
                </span>
              ),
            },
            {
              key: "url",
              header: t("url"),
              render: (row: Center) => (
                <Link
                  href={`/center/${encodeURIComponent(row.slug)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={t("openPublicPage")}
                  className="inline-flex items-center gap-1.5 text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  <span dir="ltr">/center/{row.slug}</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </Link>
              ),
            },
            {
              key: "actions",
              header: t("actions"),
              render: (row: Center) => (
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
                        href={`/admin/centers/${row.id}/${encodeURIComponent(row.slug)}`}
                      >
                        <Eye />
                        {t("view")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/admin/centers/${row.id}/edit`}>
                        <Pencil />
                        {t("edit")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:focus:bg-red-950/40"
                      disabled={deletingId === row.id || row.status !== "active"}
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
          rows={centers}
          keyExtractor={(row) => row.id}
          emptyText={t("noCentersFound")}
        />
      )}
    </div>
  );
}
