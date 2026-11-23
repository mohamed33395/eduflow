"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/app/hooks/useAuth";
import { StatsCard } from "@/app/components/ui/StatsCard";
import { Table } from "@/app/components/ui/table";
import { StatusBadge } from "@/app/components/ui/status-badge";
import {
  DonutChart,
  BarChart,
  TrendChart,
} from "@/app/components/ui/charts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { useI18n } from "@/app/lib/i18n/client";
import { formatCurrency } from "@/app/lib/utils";
import {
  CreditCard,
  Building2,
  BookOpen,
  DollarSign,
  Clock,
  Ban,
  Receipt,
} from "lucide-react";

type Tab = "centers" | "courses";

interface CenterRow {
  id: string;
  name: string;
  slug: string;
  monthlyFee: number;
  billingsCount: number;
  billed: number;
  collected: number;
  pending: number;
  waived: number;
  lastStatus: string | null;
  lastYear: number | null;
  lastMonth: number | null;
}

interface CourseRow {
  id: string;
  name: string;
  slug: string;
  centerName: string;
  enrollments: number;
  paymentsCount: number;
  billed: number;
  collected: number;
  remaining: number;
}

interface CenterMonth {
  year: number;
  month: number;
  paid: number;
  pending: number;
  waived: number;
}

interface CourseMonth {
  year: number;
  month: number;
  paid: number;
  remaining: number;
}

function billingStatusLabel(status: string | null, t: (k: string) => string) {
  if (status === "PAID") return t("paid");
  if (status === "PENDING") return t("pending");
  if (status === "WAIVED") return t("waived");
  return "—";
}

export default function AdminPaymentsPage() {
  const { user, loading: authLoading } = useAuth();
  const { t, locale } = useI18n();

  const [tab, setTab] = useState<Tab>("centers");
  const [centers, setCenters] = useState<CenterRow[]>([]);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [centerMonthly, setCenterMonthly] = useState<CenterMonth[]>([]);
  const [courseMonthly, setCourseMonthly] = useState<CourseMonth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    fetch("/api/admin/payments", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load payments");
        }
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setCenters((data.centers as CenterRow[]) ?? []);
          setCourses((data.courses as CourseRow[]) ?? []);
          setCenterMonthly((data.centerMonthly as CenterMonth[]) ?? []);
          setCourseMonthly((data.courseMonthly as CourseMonth[]) ?? []);
        }
      })
      .catch((err) => {
        console.error("[AdminPaymentsPage] load error:", err);
        if (!cancelled) setError(t("failedToLoadPayments"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, t]);

  const totals = useMemo(
    () => ({
      billed: centers.reduce((s, c) => s + c.billed, 0),
      collected: centers.reduce((s, c) => s + c.collected, 0),
      pending: centers.reduce((s, c) => s + c.pending, 0),
      waived: centers.reduce((s, c) => s + c.waived, 0),
    }),
    [centers]
  );

  const courseTotals = useMemo(
    () => ({
      billed: courses.reduce((s, c) => s + c.billed, 0),
      collected: courses.reduce((s, c) => s + c.collected, 0),
      remaining: courses.reduce((s, c) => s + c.remaining, 0),
    }),
    [courses]
  );

  const monthLabel = (y: number, m: number) =>
    `${new Date(y, m - 1, 1).toLocaleString(locale === "ar" ? "ar" : "en", {
      month: "short",
    })} ${y}`;

  if (authLoading || (user && loading)) {
    return <p className="text-muted-foreground">{t("loading")}</p>;
  }
  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-600/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
          <CreditCard size={24} />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t("payments")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("managePaymentsSubtitle")}
          </p>
        </div>
      </div>

      {/* stats — switch with the active tab */}
      {tab === "centers" ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatsCard
            title={t("collected")}
            value={formatCurrency(totals.collected)}
            icon={<DollarSign size={22} />}
          />
          <StatsCard
            title={t("pending")}
            value={formatCurrency(totals.pending)}
            icon={<Clock size={22} />}
          />
          <StatsCard
            title={t("waived")}
            value={formatCurrency(totals.waived)}
            icon={<Ban size={22} />}
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatsCard
            title={t("billed")}
            value={formatCurrency(courseTotals.billed)}
            icon={<Receipt size={22} />}
          />
          <StatsCard
            title={t("collectedRevenue")}
            value={formatCurrency(courseTotals.collected)}
            icon={<DollarSign size={22} />}
          />
          <StatsCard
            title={t("remaining")}
            value={formatCurrency(courseTotals.remaining)}
            icon={<Clock size={22} />}
          />
        </div>
      )}

      {/* tabs */}
      <div className="flex gap-2 border-b border-border">
        {(
          [
            { key: "centers", label: t("centers"), icon: <Building2 size={16} /> },
            { key: "courses", label: t("courses"), icon: <BookOpen size={16} /> },
          ] as const
        ).map((x) => (
          <button
            key={x.key}
            onClick={() => setTab(x.key)}
            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === x.key
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {x.icon}
            {x.label}
          </button>
        ))}
      </div>

      {tab === "centers" && (
        <section className="space-y-6">
          {centerMonthly.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("paidVsPendingByMonth")}</CardTitle>
              </CardHeader>
              <CardContent>
                <TrendChart
                  labels={centerMonthly.map((m) =>
                    monthLabel(m.year, m.month)
                  )}
                  series={[
                    {
                      label: t("paid"),
                      color: "#0f766e",
                      values: centerMonthly.map((m) => m.paid),
                    },
                    {
                      label: t("pending"),
                      color: "#d9a441",
                      values: centerMonthly.map((m) => m.pending),
                    },
                    {
                      label: t("waived"),
                      color: "#94a3b8",
                      values: centerMonthly.map((m) => m.waived),
                    },
                  ]}
                  formatValue={formatCurrency}
                />
              </CardContent>
            </Card>
          )}
          <Table
            emptyText={t("noCentersYet")}
            columns={[
              {
                key: "name",
                header: t("center"),
                render: (row: CenterRow) => (
                  <Link
                    href={`/admin/centers/${row.id}/${row.slug}`}
                    className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                  >
                    {row.name}
                  </Link>
                ),
              },
              {
                key: "monthlyFee",
                header: t("monthlyFee"),
                render: (row: CenterRow) =>
                  row.monthlyFee ? formatCurrency(row.monthlyFee) : "—",
              },
              { key: "billingsCount", header: t("bills") },
              {
                key: "billed",
                header: t("billed"),
                render: (row: CenterRow) => formatCurrency(row.billed),
              },
              {
                key: "collected",
                header: t("collected"),
                render: (row: CenterRow) => formatCurrency(row.collected),
              },
              {
                key: "pending",
                header: t("pending"),
                render: (row: CenterRow) => formatCurrency(row.pending),
              },
              {
                key: "lastBilling",
                header: t("lastBilling"),
                render: (row: CenterRow) =>
                  row.lastStatus && row.lastYear && row.lastMonth ? (
                    <span className="flex items-center gap-2">
                      <StatusBadge
                        status={row.lastStatus}
                        label={billingStatusLabel(row.lastStatus, t)}
                      />
                      <span className="text-xs text-muted-foreground">
                        {monthLabel(row.lastYear, row.lastMonth)}
                      </span>
                    </span>
                  ) : (
                    "—"
                  ),
              },
            ]}
            rows={centers}
            keyExtractor={(row) => row.id}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("collectionsByCenter")}</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart
                  data={centers.map((c) => ({
                    label: c.name,
                    value: c.collected,
                  }))}
                  formatValue={formatCurrency}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t("paymentBreakdown")}</CardTitle>
              </CardHeader>
              <CardContent>
                <DonutChart
                  centerValue={formatCurrency(totals.billed)}
                  centerLabel={t("billed")}
                  data={[
                    {
                      label: t("paid"),
                      value: totals.collected,
                      color: "#0f766e",
                    },
                    {
                      label: t("pending"),
                      value: totals.pending,
                      color: "#d9a441",
                    },
                    {
                      label: t("waived"),
                      value: totals.waived,
                      color: "#94a3b8",
                    },
                  ].filter((d) => d.value > 0)}
                />
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {tab === "courses" && (
        <section className="space-y-6">
          {courseMonthly.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("paidVsPendingByMonth")}</CardTitle>
              </CardHeader>
              <CardContent>
                <TrendChart
                  labels={courseMonthly.map((m) =>
                    monthLabel(m.year, m.month)
                  )}
                  series={[
                    {
                      label: t("paid"),
                      color: "#0f766e",
                      values: courseMonthly.map((m) => m.paid),
                    },
                    {
                      label: t("remaining"),
                      color: "#d9a441",
                      values: courseMonthly.map((m) => m.remaining),
                    },
                  ]}
                  formatValue={formatCurrency}
                />
              </CardContent>
            </Card>
          )}
          <Table
            emptyText={t("noCoursesYet")}
            columns={[
              {
                key: "name",
                header: t("course"),
                render: (row: CourseRow) => (
                  <Link
                    href={`/admin/courses/${row.id}/${row.slug}`}
                    className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                  >
                    {row.name}
                  </Link>
                ),
              },
              { key: "centerName", header: t("center") },
              { key: "enrollments", header: t("students") },
              {
                key: "billed",
                header: t("billed"),
                render: (row: CourseRow) => formatCurrency(row.billed),
              },
              {
                key: "collected",
                header: t("collectedRevenue"),
                render: (row: CourseRow) => formatCurrency(row.collected),
              },
              {
                key: "remaining",
                header: t("remaining"),
                render: (row: CourseRow) => formatCurrency(row.remaining),
              },
            ]}
            rows={courses}
            keyExtractor={(row) => row.id}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("collectionsByCourse")}</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart
                  data={courses.map((c) => ({
                    label: c.name,
                    value: c.collected,
                  }))}
                  formatValue={formatCurrency}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t("paymentBreakdown")}</CardTitle>
              </CardHeader>
              <CardContent>
                <DonutChart
                  centerValue={formatCurrency(courseTotals.billed)}
                  centerLabel={t("billed")}
                  data={[
                    {
                      label: t("paid"),
                      value: courseTotals.collected,
                      color: "#0f766e",
                    },
                    {
                      label: t("remaining"),
                      value: courseTotals.remaining,
                      color: "#d9a441",
                    },
                  ].filter((d) => d.value > 0)}
                />
              </CardContent>
            </Card>
          </div>
        </section>
      )}
    </div>
  );
}
