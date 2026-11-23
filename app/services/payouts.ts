import { api, qs } from "@/app/lib/api";
import { toPayout, unwrapList } from "@/app/lib/mappers";
import type { PayoutStatus, TeacherPayout } from "@/app/types";

type Row = Record<string, unknown>;

export async function getPayouts(filters: {
  teacherId?: string;
  status?: string;
} = {}): Promise<TeacherPayout[]> {
  const data = await api.get<unknown>(
    `/payouts${qs({ teacherId: filters.teacherId, status: filters.status?.toUpperCase(), limit: 100 })}`
  );
  return unwrapList<Row>(data).map(toPayout);
}

export async function previewPayout(data: {
  teacherId: string;
  periodStart: string;
  periodEnd: string;
}): Promise<TeacherPayout> {
  const res = await api.get<Row>(`/payouts/preview${qs(data)}`);
  return toPayout(res);
}

export async function generatePayout(data: {
  teacherId: string;
  periodStart: string;
  periodEnd: string;
  notes?: string;
}): Promise<TeacherPayout> {
  const created = await api.post<Row>("/payouts", data);
  return toPayout(created);
}

export async function updatePayoutStatus(
  id: string,
  status: PayoutStatus
): Promise<void> {
  await api.patch(`/payouts/${id}`, { status: status.toUpperCase() });
}

export async function deletePayout(id: string): Promise<void> {
  await api.delete(`/payouts/${id}`);
}
