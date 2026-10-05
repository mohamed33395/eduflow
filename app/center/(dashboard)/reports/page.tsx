"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/app/hooks/useAuth";
import { getStudents } from "@/app/services/students";
import { getTeachers } from "@/app/services/teachers";
import { getPayments } from "@/app/services/payments";
import { StatsCard } from "@/app/components/ui/StatsCard";
import { Card } from "@/app/components/ui/card";
import { formatCurrency } from "@/app/lib/utils";
import { useI18n } from "@/app/lib/i18n/client";
import { Users, UserCheck, DollarSign } from "lucide-react";
import type { Student, Teacher, Payment } from "@/app/types";

export default function CenterReportsPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const centerId = user?.centerId ?? "";

  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const loadData = useCallback(() => {
    if (!centerId) return;
    Promise.all([getStudents(centerId), getTeachers(centerId), getPayments()]).then(
      ([s, t, p]) => {
        const studentIds = new Set(s.map((x) => x.id));
        const teacherIds = new Set(t.map((x) => x.id));
        setStudents(s);
        setTeachers(t);
        setPayments(p.filter((x) => studentIds.has(x.studentId)));
      }
    );
  }, [centerId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalPaid = payments.reduce((sum, p) => sum + p.paid, 0);
  const totalRemaining = payments.reduce((sum, p) => sum + p.remaining, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        {t("reports")}
      </h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title={t("students")} value={students.length} icon={<Users size={22} />} />
        <StatsCard title={t("teachers")} value={teachers.length} icon={<UserCheck size={22} />} />
        <StatsCard title={t("totalPaid")} value={formatCurrency(totalPaid)} icon={<DollarSign size={22} />} />
        <StatsCard title={t("remaining")} value={formatCurrency(totalRemaining)} icon={<DollarSign size={22} />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 text-lg font-semibold">{t("outstandingPayments")}</h3>
          <ul className="space-y-2">
            {payments
              .filter((p) => p.remaining > 0)
              .map((p) => (
                <li key={p.id} className="flex justify-between text-sm">
                  <span>{t("student")} {p.studentId}</span>
                  <span className="font-semibold text-red-600">
                    {formatCurrency(p.remaining)}
                  </span>
                </li>
              ))}
            {payments.filter((p) => p.remaining > 0).length === 0 && (
              <li className="text-sm text-slate-500">{t("noOutstandingPayments")}</li>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
