import { api, qs } from "@/app/lib/api";
import { toAttendance, unwrapList } from "@/app/lib/mappers";
import type { AttendanceRecord } from "@/app/types";

type Row = Record<string, unknown>;

export async function getAttendance(
  userId?: string,
  courseId?: string
): Promise<AttendanceRecord[]> {
  const data = await api.get<unknown>(
    `/attendance${qs({ userId, courseId })}`
  );
  return unwrapList<Row>(data).map(toAttendance);
}

export async function markAttendance(
  data: Omit<AttendanceRecord, "id">
): Promise<string> {
  const created = await api.post<Row[] | Row>("/attendance", {
    date: data.date,
    courseId: data.courseId,
    entries: [
      { userId: data.userId, status: data.status.toUpperCase() },
    ],
  });
  const first = Array.isArray(created) ? created[0] : created;
  return (first?.id as string) ?? "";
}

/** Bulk-save attendance entries for a date in a single request. */
export async function saveAttendanceEntries(
  date: string,
  entries: { userId: string; status: AttendanceRecord["status"] }[]
): Promise<void> {
  if (!entries.length) return;
  await api.post("/attendance", {
    date,
    entries: entries.map((e) => ({
      userId: e.userId,
      status: e.status.toUpperCase(),
    })),
  });
}

export async function updateAttendance(
  id: string,
  status: AttendanceRecord["status"]
): Promise<void> {
  await api.patch(`/attendance/${id}`, { status: status.toUpperCase() });
}
