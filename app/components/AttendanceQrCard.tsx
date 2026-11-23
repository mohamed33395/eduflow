"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { useI18n } from "@/app/lib/i18n/client";

/**
 * Attendance QR card — encodes the staff check-in URL for this user.
 * Shown on center profile pages; the owner/teacher scans it to mark
 * the person present for today.
 */
export function AttendanceQrCard({
  userId,
  name,
}: {
  userId: string;
  name: string;
}) {
  const { t } = useI18n();
  const [url, setUrl] = useState("");

  useEffect(() => {
    setUrl(
      `${window.location.origin}/center/attendance/checkin?u=${encodeURIComponent(
        userId
      )}`
    );
  }, [userId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <QrCode size={18} />
          {t("qrCode")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3">
        {url ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700">
            <QRCodeSVG value={url} size={168} />
          </div>
        ) : (
          <div className="h-[200px] w-[200px] animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
        )}
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {name}
        </p>
        <p className="text-center text-xs text-slate-500">
          {t("attendanceQrHint")}
        </p>
      </CardContent>
    </Card>
  );
}
