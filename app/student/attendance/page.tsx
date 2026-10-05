"use client";

import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { getAttendance } from "@/app/services/attendance";
import { Table } from "@/app/components/ui/table";
import { useI18n } from "@/app/lib/i18n/client";
import type { AttendanceRecord } from "@/app/types";

export default function StudentAttendancePage() {
  const { t } = useI18n();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    const auth = getAuth();
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    getAttendance(uid).then((list) => {
      setRecords(list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    });
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        {t("myAttendance")}
      </h1>
      <Table
        columns={[
          { key: "date", header: t("date") },
          {
            key: "status",
            header: t("status"),
            render: (row: AttendanceRecord) => (
              <span
                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                  row.status === "present"
                    ? "bg-green-100 text-green-700"
                    : row.status === "late"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {t(row.status)}
              </span>
            ),
          },
        ]}
        rows={records}
        keyExtractor={(row) => row.id}
      />
    </div>
  );
}
