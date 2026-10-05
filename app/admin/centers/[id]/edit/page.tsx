"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { useI18n } from "@/app/lib/i18n/client";
import Link from "next/link";

export default function EditCenterPage({
  params,
}: PageProps<"/admin/centers/[id]/edit">) {
  const { t } = useI18n();
  const router = useRouter();
  const { id } = use(params);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    status: "active",
    ownerEmail: "",
    ownerPhone: "",
    ownerPassword: "",
  });
  const [changePassword, setChangePassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/centers/${id}/update`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || t("failedToLoadCenter"));
        }
        return res.json();
      })
      .then((data) => {
        setForm({
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
          status: data.status || "active",
          ownerEmail: data.ownerEmail || "",
          ownerPhone: data.ownerPhone || "",
          ownerPassword: "",
        });
        setChangePassword(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : t("failedToLoadCenter"));
      })
      .finally(() => setFetching(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/centers/${id}/update`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          address: form.address,
          status: form.status,
          ownerEmail: form.ownerEmail,
          ownerPhone: form.ownerPhone,
          ownerPassword: changePassword ? form.ownerPassword : "",
          changePassword,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t("failedToUpdateCenter"));
      }
      router.push("/admin/centers");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failedToUpdateCenter"));
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
        {t("editCenter")}
      </h1>
      {error && <p className="mb-4 text-red-600 text-sm">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label={t("centerName")}
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Input
          label={t("email")}
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          autoComplete="off"
        />
        <Input
          label={t("phone")}
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <Input
          label={t("address")}
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {t("status")}
          </label>
          <select
            value={form.status}
            onChange={(e) =>
              setForm({ ...form, status: e.target.value })
            }
            className="w-full rounded-lg border border-slate-300 px-4 py-2"
          >
            <option value="active">{t("active")}</option>
            <option value="inactive">{t("inactive")}</option>
          </select>
        </div>
        <div className="border-t border-slate-200 pt-5">
          <h3 className="mb-3 font-semibold">{t("ownerCredentials")}</h3>
          <Input
            label={t("ownerEmail")}
            type="email"
            autoComplete="off"
            value={form.ownerEmail}
            onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })}
          />
          <Input
            label={t("ownerPhone")}
            type="tel"
            required
            className="mt-4"
            autoComplete="off"
            value={form.ownerPhone}
            onChange={(e) =>
              setForm({ ...form, ownerPhone: e.target.value })
            }
          />
          <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={changePassword}
              onChange={(e) => {
                setChangePassword(e.target.checked);
                if (!e.target.checked) {
                  setForm({ ...form, ownerPassword: "" });
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
              className="mt-4"
              value={form.ownerPassword}
              onChange={(e) =>
                setForm({ ...form, ownerPassword: e.target.value })
              }
            />
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? t("saving") : t("saveChanges")}
          </Button>
          <Link href={`/admin/centers/${id}/settings`}>
            <Button type="button" variant="secondary">
              {t("centerSettings")}
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
