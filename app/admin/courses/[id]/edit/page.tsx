"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/app/components/ui/input";
import { Select } from "@/app/components/ui/select";
import { Button } from "@/app/components/ui/button";
import { useI18n } from "@/app/lib/i18n/client";

const LEVELS = [
  { value: "kindergarten", label: "Kindergarten" },
  { value: "primary", label: "Primary" },
  { value: "middle", label: "Middle School" },
  { value: "high", label: "High School" },
];

export default function EditCoursePage({
  params,
}: PageProps<"/admin/courses/[id]/edit">) {
  const { t } = useI18n();
  const router = useRouter();
  const { id } = use(params);
  const [form, setForm] = useState({
    name: "",
    type: "",
    level: "primary" as "kindergarten" | "primary" | "middle" | "high",
    gradeFrom: 1,
    gradeTo: 12,
    description: "",
    content: "",
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
    fetch(`/api/admin/courses/${id}/update`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || t("failedToLoadCourse"));
        }
        return res.json();
      })
      .then((data) => {
        setForm({
          name: data.name || "",
          type: data.type || "",
          level: data.level || "primary",
          gradeFrom: data.gradeFrom ?? 1,
          gradeTo: data.gradeTo ?? 12,
          description: data.description || "",
          content: data.content || "",
          status: data.status || "active",
          ownerEmail: data.ownerEmail || "",
          ownerPhone: data.ownerPhone || "",
          ownerPassword: "",
        });
        setChangePassword(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : t("failedToLoadCourse"));
      })
      .finally(() => setFetching(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/courses/${id}/update`, {
        method: "PATCH",
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
          status: form.status,
          ownerEmail: form.ownerEmail,
          ownerPhone: form.ownerPhone,
          ownerPassword: changePassword ? form.ownerPassword : "",
          changePassword,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t("failedToUpdateCourse"));
      }
      router.push("/admin/courses");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failedToUpdateCourse"));
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
        {t("editCourse")}
      </h1>
      {error && <p className="mb-4 text-red-600 text-sm">{error}</p>}
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
            setForm({
              ...form,
              level: e.target.value as typeof form.level,
            })
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
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
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
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {t("status")}
          </label>
          <select
            value={form.status}
            onChange={(e) =>
              setForm({
                ...form,
                status: e.target.value,
              })
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
        <Button type="submit" disabled={loading}>
          {loading ? t("saving") : t("saveChanges")}
        </Button>
      </form>
    </div>
  );
}
