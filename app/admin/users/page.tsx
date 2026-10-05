"use client";

import { useEffect, useState } from "react";
import { Table } from "@/app/components/ui/table";
import { useI18n } from "@/app/lib/i18n/client";
import type { AppUser } from "@/app/types";

export default function AdminUsersPage() {
  const { t } = useI18n();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    fetch("/api/admin/users", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || t("failedToLoadUsers"));
        }
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setUsers(data as AppUser[]);
      })
      .catch((err) => {
        console.error("[AdminUsersPage] load error:", err);
        if (!cancelled) setError(t("failedToLoadUsers"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [t]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        {t("manageUsers")}
      </h1>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-slate-500">{t("loading")}</p>
      ) : (
        <Table
          columns={[
            { key: "name", header: t("name") },
            { key: "email", header: t("email") },
            {
              key: "role",
              header: t("role"),
              render: (row: AppUser) => (
                <span className="capitalize">{row.role.replace("_", " ")}</span>
              ),
            },
          ]}
          rows={users}
          keyExtractor={(row) => row.uid}
          emptyText={t("noUsersFound")}
        />
      )}
    </div>
  );
}
