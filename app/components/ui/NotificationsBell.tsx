"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useI18n } from "@/app/lib/i18n/client";
import { useAuth } from "@/app/hooks/useAuth";
import {
  getNotifications,
  markAllNotificationsRead,
} from "@/app/services/notifications";
import type { AppNotification } from "@/app/types";

const POLL_MS = 30_000;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "…";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function NotificationsBell() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    getNotifications()
      .then((r) => {
        setItems(r.items);
        setUnread(r.unread);
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (!user) return;
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [user, refresh]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      markAllNotificationsRead().catch(() => null);
      setUnread(0);
      setItems((p) => p.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    }
  };

  const hrefFor = (n: AppNotification): string | undefined => {
    if (!n.data?.taskId || !user) return undefined;
    const base =
      user.role === "student"
        ? "/student/tasks"
        : user.role === "teacher"
          ? "/teacher/tasks"
          : "/center/tasks";
    return base;
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        className="relative rounded p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800"
        title={t("notifications")}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 top-11 z-50 w-80 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          <div className="border-b border-border px-4 py-2.5 text-sm font-semibold">
            {t("notifications")}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                {t("noNotifications")}
              </p>
            )}
            {items.map((n) => {
              const href = hrefFor(n);
              const content = (
                <div
                  className={`px-4 py-3 ${
                    !n.readAt ? "bg-indigo-50/50 dark:bg-indigo-950/30" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-5">{n.title}</p>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {timeAgo(n.createdAt)}
                    </span>
                  </div>
                  {n.body && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {n.body}
                    </p>
                  )}
                </div>
              );
              return href ? (
                <a
                  key={n.id}
                  href={href}
                  onClick={() => setOpen(false)}
                  className="block border-b border-border last:border-0 hover:bg-muted/50"
                >
                  {content}
                </a>
              ) : (
                <div
                  key={n.id}
                  className="border-b border-border last:border-0"
                >
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
