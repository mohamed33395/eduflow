"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Html5Qrcode } from "html5-qrcode";
import {
  ArrowLeft,
  CheckCircle2,
  ScanLine,
  XCircle,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { useI18n } from "@/app/lib/i18n/client";

type ScanResult = {
  kind: "ok" | "already" | "error";
  name?: string;
  msg?: string;
};

/** Accepts our check-in URL (`...?u=<id>`) or a bare user id. */
function extractUserId(text: string): string {
  const m = text.match(/[?&]u=([^&\s]+)/);
  if (m) {
    try {
      return decodeURIComponent(m[1]);
    } catch {
      return m[1];
    }
  }
  const trimmed = text.trim();
  return /^[\w-]{10,}$/.test(trimmed) ? trimmed : "";
}

export default function AttendanceScanPage() {
  const { t } = useI18n();
  const [camError, setCamError] = useState(false);
  const [restartKey, setRestartKey] = useState(0);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [recent, setRecent] = useState<{ name: string; time: string }[]>([]);
  const busy = useRef(false);
  const lastScan = useRef(new Map<string, number>());

  const handleDecoded = useCallback(
    async (text: string) => {
      const userId = extractUserId(text);
      if (!userId || busy.current) return;
      const now = Date.now();
      if (now - (lastScan.current.get(userId) ?? 0) < 8000) return;
      lastScan.current.set(userId, now);
      busy.current = true;
      try {
        const res = await fetch("/api/center/attendance/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ userId }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          name?: string;
          error?: string;
          alreadyMarked?: boolean;
        };
        if (!res.ok) {
          setResult({
            kind: "error",
            msg: data.error || t("checkInFailed"),
          });
        } else {
          setResult({
            kind: data.alreadyMarked ? "already" : "ok",
            name: data.name ?? "",
          });
          if (data.name) {
            setRecent((prev) =>
              [
                {
                  name: data.name!,
                  time: new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                },
                ...prev,
              ].slice(0, 10)
            );
          }
        }
      } catch {
        setResult({ kind: "error", msg: t("checkInFailed") });
      } finally {
        busy.current = false;
      }
    },
    [t]
  );

  useEffect(() => {
    const qr = new Html5Qrcode("qr-reader");
    let stopped = false;
    setCamError(false);
    qr
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (text) => void handleDecoded(text),
        () => {}
      )
      .catch(() => {
        if (!stopped) setCamError(true);
      });
    return () => {
      stopped = true;
      qr.stop()
        .then(() => qr.clear())
        .catch(() => {});
    };
  }, [handleDecoded, restartKey]);

  useEffect(() => {
    if (!result) return;
    const id = setTimeout(() => setResult(null), 3500);
    return () => clearTimeout(id);
  }, [result]);

  return (
    <div className="mx-auto w-full max-w-lg space-y-4">
      <div className="flex items-center gap-3">
        <Button href="/center/attendance" variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4" />
          {t("back")}
        </Button>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t("scanQr")}
        </h1>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-sm dark:border-slate-800">
        <div id="qr-reader" className="min-h-[300px] w-full [&_video]:!w-full" />
      </div>

      {camError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center dark:border-red-900 dark:bg-red-950/40">
          <XCircle className="mx-auto mb-2 h-6 w-6 text-red-500" />
          <p className="text-sm text-red-600 dark:text-red-300">
            {t("cameraError")}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setRestartKey((k) => k + 1)}
          >
            {t("retry")}
          </Button>
        </div>
      ) : (
        <p className="flex items-center justify-center gap-2 text-sm text-slate-500">
          <ScanLine className="h-4 w-4" />
          {t("scanHint")}
        </p>
      )}

      {result && (
        <div
          className={`flex items-center gap-3 rounded-2xl border p-4 shadow-sm ${
            result.kind === "error"
              ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
              : "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300"
          }`}
        >
          {result.kind === "error" ? (
            <XCircle className="h-6 w-6 shrink-0" />
          ) : (
            <CheckCircle2 className="h-6 w-6 shrink-0" />
          )}
          <div className="text-sm">
            {result.name && (
              <p className="font-bold">{result.name}</p>
            )}
            <p>
              {result.kind === "error"
                ? result.msg
                : result.kind === "already"
                  ? t("alreadyCheckedIn")
                  : t("checkInSuccess")}
            </p>
          </div>
        </div>
      )}

      {recent.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-bold text-slate-700 dark:text-slate-200">
            {t("recentCheckIns")}
          </h2>
          <ul className="space-y-2">
            {recent.map((r, i) => (
              <li
                key={`${r.name}-${i}`}
                className="flex items-center justify-between text-sm"
              >
                <span className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  {r.name}
                </span>
                <span className="text-xs text-slate-400">{r.time}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
