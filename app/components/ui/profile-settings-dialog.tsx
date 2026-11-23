"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { ImageUpload } from "@/app/components/ui/ImageUpload";
import { PhoneInput } from "@/app/components/ui/phone-input";
import { useI18n } from "@/app/lib/i18n/client";

interface ProfileSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Edit avatar (upload or camera), name, email, phone and password. */
export function ProfileSettingsDialog({
  open,
  onOpenChange,
}: ProfileSettingsDialogProps) {
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
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");

  // Load current profile each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setError("");
      setFetching(true);
      try {
        const res = await fetch("/api/user/settings", {
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || t("failedToLoadSettings"));
        }
        setForm({
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          password: "",
          avatarUrl: data.avatarUrl || "",
        });
        setChangePassword(false);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t("failedToLoadSettings")
        );
      } finally {
        setFetching(false);
      }
    };
    void load();
  }, [open, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/user/settings", {
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
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failedToUpdateSettings"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("profileSettings")}</DialogTitle>
          <DialogDescription>
            {t("profileSettingsDescription")}
          </DialogDescription>
        </DialogHeader>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {fetching ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t("loading")}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("avatar")}
              </label>
              <ImageUpload
                folder="avatars"
                value={form.avatarUrl}
                compact
                onUpload={(url) =>
                  setForm((prev) => ({ ...prev, avatarUrl: url }))
                }
              />
            </div>
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
            <PhoneInput
              label={t("phone")}
              value={form.phone}
              onChange={(phone) => setForm({ ...form, phone })}
            />
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
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
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
              />
            )}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? t("saving") : t("saveChanges")}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
