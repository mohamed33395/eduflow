"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { useI18n } from "@/app/lib/i18n/client";

export default function NewCenterPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    logo: "",
    ownerEmail: "",
    ownerPhone: "",
    ownerPassword: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/centers", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          address: form.address,
          logo: form.logo,
          ownerEmail: form.ownerEmail,
          ownerPhone: form.ownerPhone,
          ownerPassword: form.ownerPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || t("failedToCreateCenter"));
      }
      router.push(`/admin/centers/${data.id}/settings`);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : t("failedToCreateCenter"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">
        {t("addCenter")}
      </h1>
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
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
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
        <Input
          label={t("logoUrl")}
          type="url"
          value={form.logo}
          onChange={(e) => setForm({ ...form, logo: e.target.value })}
          placeholder="https://..."
        />
        <div className="border-t border-slate-200 pt-5">
          <h3 className="mb-3 font-semibold">{t("ownerCredentials")}</h3>
          <Input
            label={t("ownerEmail")}
            type="email"
            required
            value={form.ownerEmail}
            onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })}
          />
          <Input
            label={t("ownerPhone")}
            type="tel"
            required
            value={form.ownerPhone}
            onChange={(e) =>
              setForm({ ...form, ownerPhone: e.target.value })
            }
          />
          <Input
            label={`${t("ownerPassword")} (${t("optional")} - ${t("optionalPasswordHint")})`}
            type="password"
            minLength={6}
            className="mt-4"
            value={form.ownerPassword}
            onChange={(e) =>
              setForm({ ...form, ownerPassword: e.target.value })
            }
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? t("creating") : t("createCenter")}
        </Button>
      </form>
    </div>
  );
}
