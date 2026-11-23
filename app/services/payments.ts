import { api, qs } from "@/app/lib/api";
import { toPayment, unwrapList } from "@/app/lib/mappers";
import type { Payment } from "@/app/types";

type Row = Record<string, unknown>;

export async function getPayments(studentId?: string): Promise<Payment[]> {
  const data = await api.get<unknown>(
    `/payments${qs({ studentId, limit: 100 })}`
  );
  return unwrapList<Row>(data).map(toPayment);
}

export async function createPayment(
  data: Omit<Payment, "id" | "createdAt" | "remaining">
): Promise<string> {
  const created = await api.post<Row>("/payments", {
    studentId: data.studentId,
    courseId: data.courseId,
    amount: data.amount,
    paid: data.paid,
    dueDate: data.dueDate,
  });
  return created.id as string;
}

export async function recordPayment(
  id: string,
  amount: number
): Promise<void> {
  await api.post(`/payments/${id}/installments`, { amount });
}

export async function deletePayment(id: string): Promise<void> {
  await api.delete(`/payments/${id}`);
}

export async function getTotalRevenue(): Promise<number> {
  let total = 0;
  for (let page = 1; page <= 100; page++) {
    const data = await api.get<unknown>(
      `/payments${qs({ page, limit: 100 })}`
    );
    const items = unwrapList<Row>(data);
    total += items.reduce((sum, p) => sum + (toPayment(p).paid || 0), 0);
    if (items.length < 100) break;
  }
  return total;
}
