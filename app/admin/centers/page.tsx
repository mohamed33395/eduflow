"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/hooks/useAuth";
import { Table } from "@/app/components/ui/table";
import { Button } from "@/app/components/ui/button";
import { useI18n } from "@/app/lib/i18n/client";
import Link from "next/link";
import type { Center } from "@/app/types";

export default function AdminCentersPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
        if (!cancelled) setCenters(data as Center[]);
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
  }, [authLoading, user]);

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
            { key: "name", header: t("name") },
            { key: "email", header: t("email") },
            {
              key: "status",
              header: t("status"),
              render: (row: Center) => (
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    row.status === "active"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
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
                  href={`/center/${row.slug}`}
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
              render: (row: Center) => (
                <div className="flex gap-2">
                  <Link href={`/admin/centers/${row.id}/edit`}>
                    <Button variant="ghost" size="sm">
                      {t("edit")}
                    </Button>
                  </Link>
                </div>
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
