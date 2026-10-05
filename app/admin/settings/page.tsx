"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { useI18n } from "@/app/lib/i18n/client";

export default function AdminSettingsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    avatarUrl: "",
  });
  const [changePassword, setChangePassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || t("failedToLoadSettings"));
        }
        return res.json();
      })
      .then((data) => {
        setForm({
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          password: "",
          avatarUrl: data.avatarUrl || "",
        });
        setChangePassword(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : t("failedToLoadSettings"));
      })
      .finally(() => setFetching(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          avatarUrl: form.avatarUrl,
          password: changePassword ? form.password : "",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t("failedToUpdateSettings"));
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failedToUpdateSettings"));
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <p className="text-slate-500">{t("loading")}</p>;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">
        {t("settings")}
      </h1>
      {error && <p className="mb-4 text-red-600 text-sm">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label={t("name")}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Input
          label={t("email")}
          type="email"
          autoComplete="off"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <Input
          label={t("phone")}
          type="tel"
          required
          autoComplete="off"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <Input
          label={t("avatarUrl")}
          type="url"
          value={form.avatarUrl}
          onChange={(e) => setForm((prev) => ({ ...prev, avatarUrl: e.target.value }))}
          placeholder="https://..."
        />
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={changePassword}
            onChange={(e) => {
              setChangePassword(e.target.checked);
              if (!e.target.checked) {
                setForm({ ...form, password: "" });
              }
            }}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          {t("changePasswordToo")}
        </label>
        {changePassword && (
          <Input
            label={t("newPassword")}
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        )}
        <Button type="submit" disabled={loading}>
          {loading ? t("saving") : t("saveChanges")}
        </Button>
      </form>
    </div>
  );
}
