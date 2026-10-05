"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import { useAuth } from "@/app/hooks/useAuth";
import { StatsCard } from "@/app/components/ui/StatsCard";
import { Card } from "@/app/components/ui/card";
import { formatCurrency } from "@/app/lib/utils";
import type { Center, Student, Teacher, Payment } from "@/app/types";
import { Building2, Users, UserCheck, DollarSign } from "lucide-react";

export default function AdminCenterViewPage({
  params,
}: PageProps<"/admin/centers/[id]/[slug]">) {
  const { slug } = use(params);
  const { user, loading: authLoading } = useAuth();

  const [center, setCenter] = useState<Center | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [paid, setPaid] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading || !user) {
      if (!authLoading) setLoading(false);
      return;
    }

    let cancelled = false;
    fetch(`/api/admin/centers/${slug}`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load center");
        }
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setCenter(data.center as Center);
          setStudents(data.students as Student[]);
          setTeachers(data.teachers as Teacher[]);
          setPaid((data.paid as number) ?? 0);
        }
      })
      .catch((err) => {
        console.error("[AdminCenterViewPage] load error:", err);
        if (!cancelled) setError("Failed to load center.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, slug]);

  const stats = center
    ? [
        {
          title: "My Center",
          value: center.name,
          icon: <Building2 size={22} />,
        },
        { title: "Students", value: students.length, icon: <Users size={22} /> },
        {
          title: "Teachers",
          value: teachers.length,
          icon: <UserCheck size={22} />,
        },
        {
          title: "Revenue",
          value: formatCurrency(paid),
          icon: <DollarSign size={22} />,
        },
      ]
    : [];

  if (authLoading || loading) {
    return <p className="text-slate-500">Loading...</p>;
  }

  if (error) {
    return <p className="text-red-600 text-sm">{error}</p>;
  }

  if (!center) {
    return <p className="text-slate-500">Center not found.</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {center.name}
        </h1>
        <p className="text-slate-500">
          Manage students, teachers and finances for this center.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <StatsCard key={s.title} title={s.title} value={s.value} icon={s.icon} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 text-lg font-semibold">Recent Students</h3>
          <ul className="space-y-3">
            {students.slice(0, 5).map((s) => (
              <li key={s.id} className="text-slate-700">
                {s.name} — <span className="text-slate-400">{s.username}</span>
              </li>
            ))}
            {students.length === 0 && (
              <li className="text-sm text-slate-500">No students yet.</li>
            )}
          </ul>
        </Card>
        <Card>
          <h3 className="mb-4 text-lg font-semibold">Recent Teachers</h3>
          <ul className="space-y-3">
            {teachers.slice(0, 5).map((t) => (
              <li key={t.id} className="text-slate-700">
                {t.name} — <span className="text-slate-400">{t.email}</span>
              </li>
            ))}
            {teachers.length === 0 && (
              <li className="text-sm text-slate-500">No teachers yet.</li>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
