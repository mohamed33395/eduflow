"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/app/hooks/useAuth";
import { getStudents } from "@/app/services/students";
import { getPayments, createPayment, recordPayment } from "@/app/services/payments";
import { Table } from "@/app/components/ui/table";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { formatCurrency } from "@/app/lib/utils";
import { useI18n } from "@/app/lib/i18n/client";
import type { Payment, Student } from "@/app/types";

export default function CenterPaymentsPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const centerId = user?.centerId ?? "";

  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    studentId: "",
    courseId: "",
    amount: 0,
    paid: 0,
    dueDate: "",
  });

  const loadData = useCallback(() => {
    if (!centerId) return;
    getStudents(centerId).then((mine) => {
      setStudents(mine);
      getPayments().then((all) => {
        const studentIds = new Set(mine.map((s) => s.id));
        setPayments(all.filter((p) => studentIds.has(p.studentId)));
      });
    });
  }, [centerId]);

  useEffect(() => {
    loadData();
  }, [centerId, loadData]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await createPayment({
      ...form,
      remaining: form.amount - form.paid,
    });
    setShowForm(false);
    setForm({ studentId: "", courseId: "", amount: 0, paid: 0, dueDate: "" });
    loadData();
  };

  const handlePay = async (id: string) => {
    const amount = Number(prompt(t("enterPaymentAmount")));
    if (!amount) return;
    await recordPayment(id, amount);
    loadData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t("payments")}
        </h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? t("cancel") : t("addPayment")}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <select
              value={form.studentId}
              onChange={(e) => setForm({ ...form, studentId: e.target.value })}
              className="rounded-lg border border-slate-300 px-4 py-2"
              required
            >
              <option value="">{t("selectStudent")}</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <Input
              label={t("courseId")}
              value={form.courseId}
              onChange={(e) => setForm({ ...form, courseId: e.target.value })}
              required
            />
            <Input
              label={t("amount")}
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
              required
            />
            <Input
              label={t("initialPaid")}
              type="number"
              value={form.paid}
              onChange={(e) => setForm({ ...form, paid: Number(e.target.value) })}
            />
            <Input
              label={t("dueDate")}
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </div>
          <Button type="submit">{t("createPayment")}</Button>
        </form>
      )}

      <Table
        columns={[
          { key: "studentId", header: t("student") },
          { key: "courseId", header: t("course") },
          {
            key: "amount",
            header: t("amount"),
            render: (row: Payment) => formatCurrency(row.amount),
          },
          {
            key: "paid",
            header: t("paid"),
            render: (row: Payment) => formatCurrency(row.paid),
          },
          {
            key: "remaining",
            header: t("remaining"),
            render: (row: Payment) => formatCurrency(row.remaining),
          },
          {
            key: "actions",
            header: t("actions"),
            render: (row: Payment) => (
              <Button size="sm" onClick={() => handlePay(row.id)}>
                {t("recordPayment")}
              </Button>
            ),
          },
        ]}
        rows={payments}
        keyExtractor={(row) => row.id}
      />
    </div>
  );
}
