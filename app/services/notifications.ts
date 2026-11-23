import { api } from "@/app/lib/api";
import type { AppNotification } from "@/app/types";

type Row = Record<string, unknown>;

const toNotification = (r: Row): AppNotification => ({
  id: typeof r.id === "string" ? r.id : "",
  type: typeof r.type === "string" ? r.type : "INFO",
  title: typeof r.title === "string" ? r.title : "",
  body: typeof r.body === "string" ? r.body : undefined,
  data:
    r.data && typeof r.data === "object"
      ? (r.data as Record<string, unknown>)
      : undefined,
  readAt: typeof r.readAt === "string" ? r.readAt : undefined,
  createdAt: typeof r.createdAt === "string" ? r.createdAt : "",
});

export interface NotificationsResult {
  items: AppNotification[];
  unread: number;
}

export async function getNotifications(): Promise<NotificationsResult> {
  const data = await api.get<{ items?: unknown; unread?: unknown }>(
    "/notifications"
  );
  const items = Array.isArray(data?.items) ? (data.items as Row[]) : [];
  return {
    items: items.map(toNotification),
    unread: typeof data?.unread === "number" ? data.unread : 0,
  };
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.patch("/notifications/read-all");
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.patch(`/notifications/${id}/read`);
}
