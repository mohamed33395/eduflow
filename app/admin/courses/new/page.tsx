"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/app/components/ui/input";
import { Select } from "@/app/components/ui/select";
import { Button } from "@/app/components/ui/button";
import { useI18n } from "@/app/lib/i18n/client";
import type { Course } from "@/app/types";

const LEVELS = [
  { value: "kindergarten", label: "Kindergarten" },
  { value: "primary", label: "Primary" },
  { value: "middle", label: "Middle School" },
  { value: "high", label: "High School" },
];

export default function NewCoursePage() {
  const { t } = useI18n();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    type: "",
    level: "primary" as Course["level"],
    gradeFrom: 1,
    gradeTo: 12,
    description: "",
    content: "",
    coverImage: "",
    ownerEmail: "",
    ownerPhone: "",
    ownerPassword: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/courses", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          level: form.level,
          gradeFrom: form.gradeFrom,
          gradeTo: form.gradeTo,
          description: form.description,
          content: form.content,
          coverImage: form.coverImage,
          ownerEmail: form.ownerEmail,
          ownerPhone: form.ownerPhone,
          ownerPassword: form.ownerPassword,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t("failedToCreateCourse"));
      }
      router.push("/admin/courses");
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : t("failedToCreateCourse"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">
        {t("addCourse")}
      </h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label={t("courseName")}
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Input
          label={t("courseType")}
          required
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
        />
        <Select
          label={t("educationLevel")}
          options={LEVELS.map((l) => ({ value: l.value, label: t(l.value) }))}
          value={form.level}
          onChange={(e) =>
            setForm({ ...form, level: e.target.value as Course["level"] })
          }
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t("gradeFrom")}
            type="number"
            required
            value={form.gradeFrom}
            onChange={(e) =>
              setForm({ ...form, gradeFrom: Number(e.target.value) })
            }
          />
          <Input
            label={t("gradeTo")}
            type="number"
            required
            value={form.gradeTo}
            onChange={(e) =>
              setForm({ ...form, gradeTo: Number(e.target.value) })
            }
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {t("description")}
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-4 py-2"
            rows={4}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {t("courseContent")}
          </label>
          <textarea
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-4 py-2"
            rows={6}
          />
        </div>
        <Input
          label={t("coverImageUrl")}
          type="url"
          value={form.coverImage}
          onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
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
          {loading ? t("creating") : t("createCourse")}
        </Button>
      </form>
    </div>
  );
}
