"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  LogIn,
  Maximize,
  ScanBarcode,
  ScanLine,
  XCircle,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { useI18n } from "@/app/lib/i18n/client";

type ScanResult = {
  kind: "ok" | "already" | "error" | "signIn";
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

/** Short beep via WebAudio — no asset files needed. */
function beep(ok: boolean) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = ok ? 880 : 220;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
    osc.onended = () => void ctx.close();
  } catch {
    /* audio blocked before first gesture — fine */
  }
}

/**
 * Door-kiosk page for a hardware USB/Bluetooth QR scanner.
 * Those scanners act as a keyboard: they type the QR payload then Enter.
 * We buffer keystrokes page-wide and submit on Enter (or on a short pause,
 * for scanners that don't send an Enter suffix).
 * Setup: open this page on a tablet/PC at the door, sign in as staff once.
 */
export default function AttendanceKioskPage() {
  const { t } = useI18n();
  const [result, setResult] = useState<ScanResult | null>(null);
  const [recent, setRecent] = useState<{ name: string; time: string }[]>([]);
  const [manual, setManual] = useState("");
  const busy = useRef(false);
  const buffer = useRef("");
  const lastKeyAt = useRef(0);
  const lastScan = useRef(new Map<string, number>());
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const submit = useCallback(
    async (raw: string) => {
      const userId = extractUserId(raw);
      if (!userId || busy.current) return;
      const now = Date.now();
      // Same code re-scanned within 8s → ignore (reader bounces).
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
        if (res.status === 401 || res.status === 403) {
          // Door device session ended — tell staff to sign in again.
          setResult({ kind: "signIn" });
          beep(false);
        } else if (!res.ok) {
          setResult({ kind: "error", msg: data.error || t("checkInFailed") });
          beep(false);
        } else {
          setResult({
            kind: data.alreadyMarked ? "already" : "ok",
            name: data.name ?? "",
          });
          beep(true);
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
        beep(false);
      } finally {
        busy.current = false;
      }
    },
    [t]
  );

  // Hardware scanners type fast (~5-30ms/char). Normal typing is slower,
  // so we only trust bursts; the manual field below covers typed input.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      const now = Date.now();
      if (now - lastKeyAt.current > 100) buffer.current = "";
      lastKeyAt.current = now;
      if (idleTimer.current) clearTimeout(idleTimer.current);

      if (e.key === "Enter") {
        const text = buffer.current;
        buffer.current = "";
        if (text) void submit(text);
        e.preventDefault();
        return;
      }
      if (e.key.length === 1) {
        buffer.current += e.key;
        // Scanners without an Enter suffix: submit after a 600ms pause.
        idleTimer.current = setTimeout(() => {
          const text = buffer.current;
          buffer.current = "";
          if (text) void submit(text);
        }, 600);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [submit]);

  // Big banner auto-clears so the kiosk is ready for the next student.
  // The "sign in again" banner stays until someone acts on it.
  useEffect(() => {
    if (!result || result.kind === "signIn") return;
    const id = setTimeout(() => setResult(null), 3500);
    return () => clearTimeout(id);
  }, [result]);

  // Keep the door screen awake while this page is open (supported on
  // Chrome/Edge/Android; silently ignored elsewhere).
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & {
      wakeLock?: {
        request: (type: string) => Promise<{ release: () => Promise<void> }>;
      };
    };
    const acquire = () => {
      if (document.visibilityState === "visible") {
        nav.wakeLock
          ?.request("screen")
          .then((l) => {
            lock = l;
          })
          .catch(() => {});
      }
    };
    acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      document.removeEventListener("visibilitychange", acquire);
      void lock?.release();
    };
  }, []);

  const fullscreen = () => {
    if (!document.fullscreenElement) void document.documentElement.requestFullscreen?.();
    else void document.exitFullscreen();
  };

  return (
    <div className="mx-auto w-full max-w-lg space-y-4">
      <div className="flex items-center gap-3">
        <Button href="/center/attendance" variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4" />
          {t("back")}
        </Button>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t("attendanceKiosk")}
        </h1>
        <button
          onClick={fullscreen}
          title="Fullscreen"
          className="ms-auto rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
        >
          <Maximize className="h-5 w-5" />
        </button>
      </div>

      {/* status banner */}
      <div
        className={`flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-3xl border p-8 text-center shadow-sm transition-colors ${
          result?.kind === "error"
            ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/40"
            : result
              ? "border-green-300 bg-green-50 dark:border-green-900 dark:bg-green-950/40"
              : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
        }`}
      >
        {result ? (
          result.kind === "error" ? (
            <XCircle className="h-16 w-16 text-red-500" />
          ) : result.kind === "signIn" ? (
            <LogIn className="h-16 w-16 text-amber-500" />
          ) : (
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          )
        ) : (
          <ScanLine className="h-16 w-16 text-primary/60" />
        )}
        <div>
          {result?.name && (
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {result.name}
            </p>
          )}
          <p
            className={`text-lg font-medium ${
              result?.kind === "error"
                ? "text-red-600 dark:text-red-300"
                : "text-slate-600 dark:text-slate-300"
            }`}
          >
            {result
              ? result.kind === "error"
                ? result.msg
                : result.kind === "signIn"
                  ? t("signInToCheckIn")
                  : result.kind === "already"
                    ? t("alreadyCheckedIn")
                    : t("checkInSuccess")
              : t("readyToScan")}
          </p>
          {result?.kind === "signIn" && (
            <Button href="/login" size="sm" className="mx-auto">
              <LogIn className="h-4 w-4" />
              {t("login")}
            </Button>
          )}
        </div>
      </div>

      {/* fallback input — also lets staff test without hardware */}
      <input
        value={manual}
        onChange={(e) => setManual(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && manual.trim()) {
            void submit(manual);
            setManual("");
          }
        }}
        placeholder={t("scanOrType")}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
      />

      <p className="flex items-center justify-center gap-2 text-center text-sm text-slate-500">
        <ScanBarcode className="h-4 w-4 shrink-0" />
        {t("kioskHint")}
      </p>

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
