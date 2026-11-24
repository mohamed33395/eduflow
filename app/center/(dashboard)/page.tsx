import { getSessionUser } from "@/app/lib/auth-cookies";
import { ApiError } from "@/app/lib/api";
import { apiFetchServer, fetchAllPages } from "@/app/lib/api-server";
import {
  toCenter,
  toPayment,
  toStudent,
  toTeacher,
  unwrapList,
} from "@/app/lib/mappers";
import { getI18n } from "@/app/lib/i18n/server";
import { StatsCard } from "@/app/components/ui/StatsCard";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Table } from "@/app/components/ui/table";
import { BarChart, DonutChart } from "@/app/components/ui/charts";
import { formatCurrency } from "@/app/lib/utils";
import { Users, UserCheck, DollarSign, Building2, Globe } from "lucide-react";
import type { Center, Student, Teacher, Payment } from "@/app/types";

type Row = Record<string, unknown>;

export default async function CenterDashboardPage() {
  const { t, locale } = await getI18n();
  const user = await getSessionUser();
  const centerId = user?.centerId ?? "";

  let center: Center | null = null;
  let students: Student[] = [];
  let teachers: Teacher[] = [];
  let payments: Payment[] = [];

  if (centerId) {
    const [centerRow, studentsData, teachersData, paymentsRows] =
      await Promise.all([
        apiFetchServer<Row>(`/centers/${centerId}`).catch((err) =>
          err instanceof ApiError && err.status === 404 ? null : Promise.reject(err)
        ),
        apiFetchServer<unknown>(`/students?centerId=${centerId}&limit=100`),
        apiFetchServer<unknown>(`/teachers?centerId=${centerId}&limit=100`),
        fetchAllPages<Row>("/payments").catch(() => [] as Row[]),
      ]);

    center = centerRow ? toCenter(centerRow) : null;
    students = unwrapList<Row>(studentsData).map(toStudent);
    teachers = unwrapList<Row>(teachersData).map(toTeacher);
    payments = paymentsRows.map(toPayment);
  }

  const centerPayments = payments.filter((p) =>
    students.some((s) => s.id === p.studentId)
  );
  const paid = centerPayments.reduce((sum, p) => sum + p.paid, 0);
  const outstanding = centerPayments.reduce((sum, p) => sum + p.remaining, 0);

  // last 6 months of collected revenue for this center
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { year: d.getFullYear(), month: d.getMonth(), total: 0 };
  });
  const monthIndex = new Map(months.map((m, i) => [`${m.year}-${m.month}`, i]));
  for (const p of centerPayments) {
    const created = new Date(p.createdAt);
    if (Number.isNaN(created.getTime())) continue;
    const i = monthIndex.get(`${created.getFullYear()}-${created.getMonth()}`);
    if (i !== undefined) months[i].total += p.paid;
  }
  const monthlyRevenue = months.map((m) => ({
    label: new Date(m.year, m.month).toLocaleDateString(locale, {
      month: "short",
    }),
    value: m.total,
  }));

  const stats = [
    {
      title: t("myCenter"),
      value: center?.name ?? t("nA"),
      icon: <Building2 size={22} />,
    },
    { title: t("students"), value: students.length, icon: <Users size={22} /> },
    {
      title: t("teachers"),
      value: teachers.length,
      icon: <UserCheck size={22} />,
    },
    {
      title: t("revenue"),
      value: formatCurrency(paid),
      icon: <DollarSign size={22} />,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {center?.name ?? t("centerDashboard")}
        </h1>
        <p className="text-slate-500">{t("centerDashboardDescription")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <StatsCard key={s.title} title={s.title} value={s.value} icon={s.icon} />
        ))}
      </div>

      {center && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe size={20} />
              {t("landingProfile")}
            </CardTitle>
            <CardDescription>{t("landingCardHint")}</CardDescription>
          </CardHeader>
          <CardFooter className="gap-3">
            <Button href="/center/profile" variant="outline" size="sm">
              {t("edit")}
            </Button>
            <Button
              href={`/center/${center.slug}`}
              variant="secondary"
              size="sm"
            >
              {t("openPublicPage")}
            </Button>
          </CardFooter>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("paymentBreakdown")}</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart
              data={[
                { label: t("collected"), value: paid, color: "#0f766e" },
                {
                  label: t("outstanding"),
                  value: outstanding,
                  color: "#d9a441",
                },
              ]}
              centerLabel={t("payments")}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("monthlyRevenue")}</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={monthlyRevenue}
              formatValue={(v) => formatCurrency(v)}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("recentStudents")}</CardTitle>
            <CardDescription>{t("enrolledStudents")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table
              columns={[
                { key: "name", header: t("name") },
                { key: "username", header: t("username") },
              ]}
              rows={students.slice(0, 5)}
              keyExtractor={(row) => row.id}
              emptyText={t("noStudentsYet")}
            />
          </CardContent>
          <CardFooter className="justify-end">
            <Button href="/center/students" variant="outline" size="sm">
              {t("manage")}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("recentTeachers")}</CardTitle>
            <CardDescription>{t("teacherDashboardDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table
              columns={[
                { key: "name", header: t("name") },
                { key: "email", header: t("email") },
              ]}
              rows={teachers.slice(0, 5)}
              keyExtractor={(row) => row.id}
              emptyText={t("noTeachersYet")}
            />
          </CardContent>
          <CardFooter className="justify-end">
            <Button href="/center/teachers" variant="outline" size="sm">
              {t("manage")}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
