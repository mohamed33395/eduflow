"use client";

import { useState, useEffect } from "react";
import { StatsCard } from "@/app/components/ui/StatsCard";
import { Card } from "@/app/components/ui/card";
import { StatusBadge } from "@/app/components/ui/status-badge";
import { formatCurrency } from "@/app/lib/utils";
import { useI18n } from "@/app/lib/i18n/client";
import { BarChart, DonutChart } from "@/app/components/ui/charts";
import type { AppUser, Center, Course, Student, Teacher } from "@/app/types";
import {
  Building2,
  BookOpen,
  GraduationCap,
  Users,
  DollarSign,
} from "lucide-react";

export default function DashboardClient({ user }: { user: AppUser | null }) {
  const { t, locale } = useI18n();
  const [data, setData] = useState<{
    centers: Center[];
    courses: Course[];
    students: Student[];
    teachers: Teacher[];
    revenue: number;
    collected: number;
    outstanding: number;
    revenueByMonth: { year: number; month: number; total: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/admin/dashboard", { credentials: "include" });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || t("failedToLoadDashboard"));
        }
        const json = await res.json();
        if (!cancelled) {
          setData({
            centers: json.centers as Center[],
            courses: json.courses as Course[],
            students: json.students as Student[],
            teachers: json.teachers as Teacher[],
            revenue: (json.revenue as number) ?? 0,
            collected: (json.collected as number) ?? 0,
            outstanding: (json.outstanding as number) ?? 0,
            revenueByMonth:
              (json.revenueByMonth as { year: number; month: number; total: number }[]) ?? [],
          });
        }
      } catch (err) {
        console.error("[DashboardClient] load error:", err);
        if (!cancelled) {
          setError(t("failedToLoadDashboardData"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user, t]);

  // The effect only clears `loading` after a fetch — when there is no user
  // we show the "unable to identify" branch instead of the spinner.
  const showLoading = loading && Boolean(user);

  const stats = data
    ? [
        { title: t("centers"), value: data.centers.length, icon: <Building2 size={22} /> },
        { title: t("courses"), value: data.courses.length, icon: <BookOpen size={22} /> },
        { title: t("students"), value: data.students.length, icon: <GraduationCap size={22} /> },
        { title: t("teachers"), value: data.teachers.length, icon: <Users size={22} /> },
        { title: t("payments"), value: formatCurrency(data.revenue), icon: <DollarSign size={22} /> },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t("welcomeMessage")}, {user?.name ?? user?.email ?? t("admin")}
        </h1>
        <p className="text-slate-500">
          {t("platformOverview")}
        </p>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {showLoading ? (
        <p className="text-slate-500">{t("loading")}</p>
      ) : !user ? (
        <p className="text-red-600 text-sm">{t("unableToIdentifyUser")}</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {stats.map((s) => (
              <StatsCard
                key={s.title}
                title={s.title}
                value={s.value}
                icon={s.icon}
              />
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-6">
              <h3 className="mb-4 text-lg font-semibold">{t("revenueOverview")}</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-muted/50 p-4">
                  <p className="text-sm text-muted-foreground">{t("revenue")}</p>
                  <p className="mt-1 text-2xl font-bold">
                    {formatCurrency(data?.revenue ?? 0)}
                  </p>
                </div>
                <div className="rounded-xl bg-muted/50 p-4">
                  <p className="text-sm text-muted-foreground">{t("collected")}</p>
                  <p className="mt-1 text-2xl font-bold">
                    {formatCurrency(data?.collected ?? 0)}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="mb-4 text-lg font-semibold">{t("paymentBreakdown")}</h3>
              <DonutChart
                data={[
                  {
                    label: t("collected"),
                    value: data?.collected ?? 0,
                    color: "#0f766e",
                  },
                  {
                    label: t("outstanding"),
                    value: data?.outstanding ?? 0,
                    color: "#d9a441",
                  },
                ]}
                centerLabel={t("payments")}
              />
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold">{t("monthlyRevenue")}</h3>
            <BarChart
              data={(data?.revenueByMonth ?? []).map((m) => ({
                label: new Date(m.year, m.month).toLocaleDateString(locale, {
                  month: "short",
                }),
                value: m.total,
              }))}
              formatValue={(v) => formatCurrency(v)}
            />
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-6">
              <h3 className="mb-4 text-lg font-semibold">{t("recentCenters")}</h3>
              <ul className="space-y-3">
                {data?.centers.slice(0, 5).map((c) => (
                  <li key={c.id} className="flex items-center justify-between">
                    <span className="font-medium text-slate-800 dark:text-slate-100">
                      {c.name}
                    </span>
                    <StatusBadge status={c.status} label={t(c.status)} />
                  </li>
                ))}
                {data?.centers.length === 0 && (
                  <li className="text-sm text-slate-500">{t("noCentersYet")}</li>
                )}
              </ul>
            </Card>

            <Card className="p-6">
              <h3 className="mb-4 text-lg font-semibold">{t("recentCourses")}</h3>
              <ul className="space-y-3">
                {data?.courses.slice(0, 5).map((c) => (
                  <li key={c.id} className="flex items-center justify-between">
                    <span className="font-medium text-slate-800 dark:text-slate-100">
                      {c.name}
                    </span>
                    <span className="text-xs text-slate-500">{c.level}</span>
                  </li>
                ))}
                {data?.courses.length === 0 && (
                  <li className="text-sm text-slate-500">{t("noCoursesYet")}</li>
                )}
              </ul>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
