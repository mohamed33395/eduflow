"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import { useAuth } from "@/app/hooks/useAuth";
import { StatsCard } from "@/app/components/ui/StatsCard";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { StatusBadge } from "@/app/components/ui/status-badge";
import { useI18n } from "@/app/lib/i18n/client";
import { formatCurrency, getInitials } from "@/app/lib/utils";
import type {
  Center,
  CenterBilling,
  Student,
  Teacher,
} from "@/app/types";
import {
  Building2,
  Users,
  UserCheck,
  DollarSign,
  BookCopy,
  Receipt,
} from "lucide-react";

function billingLabel(b: CenterBilling, locale: string) {
  const month = new Date(b.year, b.month - 1, 1).toLocaleString(
    locale === "ar" ? "ar" : "en",
    { month: "short" }
  );
  return `${month} ${b.year}`;
}

function billingStatusLabel(status: string, t: (k: string) => string) {
  if (status === "PAID") return t("paid");
  if (status === "PENDING") return t("pending");
  return status;
}

export default function AdminCenterViewPage({
  params,
}: PageProps<"/admin/centers/[id]/[slug]">) {
  const { slug } = use(params);
  const { user, loading: authLoading } = useAuth();
  const { t, locale } = useI18n();

  const [center, setCenter] = useState<Center | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [billings, setBillings] = useState<CenterBilling[]>([]);
  const [paid, setPaid] = useState(0);
  const [subjectsCount, setSubjectsCount] = useState(0);
  const [feeInput, setFeeInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading || !user) return;

    let cancelled = false;
    fetch(`/api/admin/centers/${slug}`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load center");
        }
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          const c = data.center as Center;
          setCenter(c);
          setStudents(data.students as Student[]);
          setTeachers(data.teachers as Teacher[]);
          setBillings((data.billings as CenterBilling[]) ?? []);
          setPaid((data.paid as number) ?? 0);
          setSubjectsCount((data.subjectsCount as number) ?? 0);
          setFeeInput(c.monthlyFee != null ? String(c.monthlyFee) : "");
        }
      })
      .catch((err) => {
        console.error("[AdminCenterViewPage] load error:", err);
        if (!cancelled) setError(t("failedToLoadCenter"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, slug, t]);

  const now = new Date();
  const thisMonth = billings.find(
    (b) => b.year === now.getFullYear() && b.month === now.getMonth() + 1
  );

  const stats = center
    ? [
        {
          title: t("center"),
          value: center.name,
          icon: <Building2 size={22} />,
        },
        {
          title: t("students"),
          value: students.length,
          icon: <Users size={22} />,
        },
        {
          title: t("teachers"),
          value: teachers.length,
          icon: <UserCheck size={22} />,
        },
        {
          title: t("subjects"),
          value: subjectsCount,
          icon: <BookCopy size={22} />,
        },
        {
          title: t("revenue"),
          value: formatCurrency(paid),
          icon: <DollarSign size={22} />,
        },
      ]
    : [];

  async function saveMonthlyFee() {
    if (!center) return;
    setBusy(true);
    setNotice("");
    try {
      const res = await fetch(`/api/bff/centers/${center.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthlyFee: feeInput.trim() ? Number(feeInput) : 0,
        }),
      });
      if (!res.ok) throw new Error("failed");
      const updated = (await res.json()) as Center;
      setCenter((prev) =>
        prev ? { ...prev, monthlyFee: updated.monthlyFee } : prev
      );
      setNotice(t("monthlyFeeSaved"));
    } catch {
      setNotice(t("failedToSaveFee"));
    } finally {
      setBusy(false);
    }
  }

  async function generateCurrentMonth() {
    if (!center) return;
    setBusy(true);
    setNotice("");
    try {
      const res = await fetch(`/api/bff/centers/${center.id}/billings`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: now.getFullYear(),
          month: now.getMonth() + 1,
        }),
      });
      if (!res.ok) throw new Error("failed");
      const created = (await res.json()) as CenterBilling;
      setBillings((prev) => {
        const rest = prev.filter((b) => b.id !== created.id);
        return [created, ...rest];
      });
      setNotice(t("billingGenerated"));
    } catch {
      setNotice(t("failedToGenerateBilling"));
    } finally {
      setBusy(false);
    }
  }

  async function markBilling(b: CenterBilling, paidNow: boolean) {
    if (!center) return;
    setBusy(true);
    setNotice("");
    try {
      const res = await fetch(
        `/api/bff/centers/${center.id}/billings/${b.id}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: paidNow ? "PAID" : "PENDING" }),
        }
      );
      if (!res.ok) throw new Error("failed");
      const updated = (await res.json()) as CenterBilling;
      setBillings((prev) =>
        prev.map((x) => (x.id === updated.id ? updated : x))
      );
    } catch {
      setNotice(t("failedToUpdateBilling"));
    } finally {
      setBusy(false);
    }
  }

  // Unauthenticated users aren't loading — they hit the not-found branch.
  if (authLoading || (user && loading)) {
    return <p className="text-muted-foreground">{t("loading")}</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!center) {
    return <p className="text-muted-foreground">{t("centerNotFound")}</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-600/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
          <Building2 size={24} />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{center.name}</h1>
          <p className="text-sm text-muted-foreground">
            {t("manageCenterSubtitle")}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => (
          <StatsCard key={s.title} title={s.title} value={s.value} icon={s.icon} />
        ))}
      </div>

      {/* ── Platform subscription ── */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
              <Receipt size={18} />
            </span>
            {t("platformSubscription")}
          </CardTitle>
          {thisMonth && (
            <StatusBadge
              status={thisMonth.status}
              label={`${t("thisMonth")} (${billingLabel(thisMonth, locale)}): ${billingStatusLabel(thisMonth.status, t)}`}
            />
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-40">
              <Input
                label={t("monthlyFee")}
                type="number"
                min={0}
                value={feeInput}
                onChange={(e) => setFeeInput(e.target.value)}
                placeholder={t("monthlyFeeExample")}
              />
            </div>
            <Button size="sm" disabled={busy} onClick={saveMonthlyFee}>
              {t("saveFee")}
            </Button>
            {!thisMonth && (
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={generateCurrentMonth}
              >
                {t("generateThisMonthsBill")}
              </Button>
            )}
            {notice && (
              <span className="text-sm text-muted-foreground">{notice}</span>
            )}
          </div>

          {billings.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
              {t("noBillingsYet")}
            </p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {billings.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between py-2.5"
                >
                  <span>
                    {billingLabel(b, locale)} —{" "}
                    <span className="font-medium">
                      {formatCurrency(b.amount)}
                    </span>
                    {b.paidAt && (
                      <span className="ms-2 text-xs text-muted-foreground">
                        {t("paid")}{" "}
                        {new Date(b.paidAt).toLocaleDateString(
                          locale === "ar" ? "ar" : "en"
                        )}
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-2">
                    <StatusBadge
                      status={b.status}
                      label={billingStatusLabel(b.status, t)}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => markBilling(b, b.status !== "PAID")}
                    >
                      {b.status === "PAID" ? t("markUnpaid") : t("markPaid")}
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-600/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
              <Users size={18} />
            </span>
            <CardTitle>{t("recentStudents")}</CardTitle>
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
                {t("noStudentsYet")}
              </p>
            ) : (
              <ul className="space-y-3">
                {students.slice(0, 5).map((s) => (
                  <li key={s.id} className="flex items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-600/10 text-sm font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                      {getInitials(s.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {s.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {s.username}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
              <UserCheck size={18} />
            </span>
            <CardTitle>{t("recentTeachers")}</CardTitle>
          </CardHeader>
          <CardContent>
            {teachers.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
                {t("noTeachersYet")}
              </p>
            ) : (
              <ul className="space-y-3">
                {teachers.slice(0, 5).map((teacher) => (
                  <li key={teacher.id} className="flex items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-500/10 text-sm font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                      {getInitials(teacher.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {teacher.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {teacher.email}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
