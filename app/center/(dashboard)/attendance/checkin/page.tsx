"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  QrCode,
  ScanLine,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/app/hooks/useAuth";
import { Button } from "@/app/components/ui/button";
import { useI18n } from "@/app/lib/i18n/client";

type State =
  | "idle"
  | "loading"
  | "ok"
  | "already"
  | "error"
  | "invalid"
  | "needLogin"
  | "notStaff";

function CheckinInner() {
  const { t } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const target = useSearchParams().get("u") ?? "";
  const [state, setState] = useState<State>("idle");
  const [name, setName] = useState("");
  const [errMsg, setErrMsg] = useState("");

  const doCheckin = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch("/api/center/attendance/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId: target }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        name?: string;
        error?: string;
        alreadyMarked?: boolean;
      };
      if (!res.ok) {
        setErrMsg(data.error || t("checkInFailed"));
        setState("error");
        return;
      }
      setName(data.name ?? "");
      setState(data.alreadyMarked ? "already" : "ok");
    } catch {
      setErrMsg(t("checkInFailed"));
      setState("error");
    }
  }, [target, t]);

  useEffect(() => {
    if (!target) {
      setState("invalid");
      return;
    }
    if (authLoading || !user) {
      if (!authLoading && !user) setState("needLogin");
      return;
    }
    if (user.role === "student") {
      setState("notStaff");
      return;
    }
    if (state === "idle") void doCheckin();
  }, [target, user, authLoading, state, doCheckin]);

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center gap-6 px-4">
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          {state === "ok" || state === "already" ? (
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          ) : state === "loading" || authLoading ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : state === "error" || state === "invalid" || state === "notStaff" ? (
            <XCircle className="h-8 w-8 text-red-500" />
          ) : state === "needLogin" ? (
            <QrCode className="h-8 w-8" />
          ) : (
            <ScanLine className="h-8 w-8" />
          )}
        </div>

        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          {t("recordAttendance")}
        </h1>

        <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          {(state === "loading" || authLoading) && (
            <p className="animate-pulse">{t("loading")}</p>
          )}
          {state === "ok" && (
            <>
              <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                {name}
              </p>
              <p>{t("checkInSuccess")}</p>
            </>
          )}
          {state === "already" && (
            <>
              <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                {name}
              </p>
              <p>{t("alreadyCheckedIn")}</p>
            </>
          )}
          {state === "invalid" && <p>{t("invalidQr")}</p>}
          {state === "notStaff" && <p>{t("staffOnlyCheckIn")}</p>}
          {state === "needLogin" && <p>{t("signInToCheckIn")}</p>}
          {state === "error" && <p className="text-red-500">{errMsg}</p>}
        </div>

        <div className="mt-6 flex flex-col gap-2">
          {state === "error" && (
            <Button onClick={doCheckin}>{t("retry")}</Button>
          )}
          {state === "needLogin" && (
            <Button href="/login">{t("login")}</Button>
          )}
          <Link
            href="/center/attendance"
            className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            {t("back")}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CheckinPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <CheckinInner />
    </Suspense>
  );
}
