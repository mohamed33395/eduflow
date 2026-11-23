import { NextResponse } from "next/server";
import {
  apiErrorResponse,
  apiFetchServer,
  fetchAllPages,
  getSessionUser,
} from "@/app/lib/api-server";
import { unwrapList } from "@/app/lib/mappers";

type Row = Record<string, unknown>;

export async function GET() {
  const currentUser = await getSessionUser();
  if (!currentUser || currentUser.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const [centersData, coursesData, studentsData, teachersData, payments] =
      await Promise.all([
        apiFetchServer<unknown>("/centers"),
        apiFetchServer<unknown>("/courses"),
        apiFetchServer<unknown>("/students"),
        apiFetchServer<unknown>("/teachers"),
        fetchAllPages<Row>("/payments"),
      ]);

    const centers = unwrapList<Row>(centersData);
    const courses = unwrapList<Row>(coursesData);
    const students = unwrapList<Row>(studentsData);
    const teachers = unwrapList<Row>(teachersData);

    const revenue = payments.reduce((sum, p) => {
      return sum + (typeof p.amount === "number" ? p.amount : 0);
    }, 0);

    const collected = payments.reduce(
      (sum, p) => sum + (typeof p.paid === "number" ? p.paid : 0),
      0
    );
    const outstanding = payments.reduce(
      (sum, p) => sum + (typeof p.remaining === "number" ? p.remaining : 0),
      0
    );

    // last 6 months of collected revenue, for the bar chart
    const now = new Date();
    const months: { year: number; month: number; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ year: d.getFullYear(), month: d.getMonth(), total: 0 });
    }
    const monthIndex = new Map(months.map((m, i) => [`${m.year}-${m.month}`, i]));
    for (const p of payments) {
      const created = typeof p.createdAt === "string" ? new Date(p.createdAt) : null;
      if (!created || Number.isNaN(created.getTime())) continue;
      const i = monthIndex.get(`${created.getFullYear()}-${created.getMonth()}`);
      if (i !== undefined) {
        months[i].total +=
          typeof p.paid === "number"
            ? p.paid
            : typeof p.amount === "number"
              ? p.amount
              : 0;
      }
    }

    return NextResponse.json({
      centers,
      courses,
      students,
      teachers,
      revenue,
      collected,
      outstanding,
      revenueByMonth: months,
    });
  } catch (err) {
    console.error("[api/admin/dashboard] load failed:", err);
    return apiErrorResponse(err, "Load failed");
  }
}
