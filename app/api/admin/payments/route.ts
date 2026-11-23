import { NextResponse } from "next/server";
import {
  apiErrorResponse,
  apiFetchServer,
  fetchAllPages,
  getSessionUser,
} from "@/app/lib/api-server";
import { unwrapList } from "@/app/lib/mappers";

type Row = Record<string, unknown>;

const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);

/**
 * Aggregates platform payments for the admin payments page:
 * - centers → platform subscription billings (CenterBilling)
 * - courses → student payments grouped by courseId
 */
export async function GET() {
  const currentUser = await getSessionUser();
  if (!currentUser || currentUser.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const [centersData, coursesData, payments] = await Promise.all([
      apiFetchServer<unknown>("/centers"),
      apiFetchServer<unknown>("/courses"),
      fetchAllPages<Row>("/payments"),
    ]);

    const centers = unwrapList<Row>(centersData);
    const courses = unwrapList<Row>(coursesData);

    // Per-center subscription billings (super-admin scoped endpoint).
    const billingsPerCenter = await Promise.all(
      centers.map((c) =>
        apiFetchServer<unknown>(`/centers/${c.id as string}/billings`)
          .then((b) => unwrapList<Row>(b))
          .catch(() => [] as Row[])
      )
    );

    const centerRows = centers.map((c, i) => {
      const bs = billingsPerCenter[i];
      const sum = (status?: string) =>
        bs
          .filter((b) => !status || b.status === status)
          .reduce((s, b) => s + num(b.amount), 0);
      const latest = [...bs].sort(
        (a, b) =>
          num(b.year) * 12 + num(b.month) - (num(a.year) * 12 + num(a.month))
      )[0];
      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        monthlyFee: num(c.monthlyFee),
        billingsCount: bs.length,
        billed: sum(),
        collected: sum("PAID"),
        pending: sum("PENDING"),
        waived: sum("WAIVED"),
        lastStatus: latest ? String(latest.status) : null,
        lastYear: latest ? num(latest.year) : null,
        lastMonth: latest ? num(latest.month) : null,
      };
    });

    // Per-course payment aggregation (Payment.courseId).
    const byCourse = new Map<
      string,
      { billed: number; collected: number; remaining: number; count: number }
    >();
    for (const p of payments) {
      const cid = String(p.courseId);
      const e =
        byCourse.get(cid) ?? { billed: 0, collected: 0, remaining: 0, count: 0 };
      e.billed += num(p.amount);
      e.collected += num(p.paid);
      e.remaining += num(p.remaining);
      e.count += 1;
      byCourse.set(cid, e);
    }

    const centerName = new Map(
      centers.map((c) => [String(c.id), String(c.name)])
    );

    const courseRows = courses.map((c) => {
      const agg =
        byCourse.get(String(c.id)) ??
        { billed: 0, collected: 0, remaining: 0, count: 0 };
      const counts = (c._count as Row | undefined) ?? {};
      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        centerName: c.centerId
          ? (centerName.get(String(c.centerId)) ?? "—")
          : "—",
        enrollments: num(counts.enrollments),
        paymentsCount: agg.count,
        billed: agg.billed,
        collected: agg.collected,
        remaining: agg.remaining,
      };
    });

    // Monthly series — paid vs unpaid per calendar month for the charts.
    const monthKey = (y: number, m: number) => y * 12 + m;
    const decodeKey = (k: number) => ({
      year: Math.floor((k - 1) / 12),
      month: ((k - 1) % 12) + 1,
    });
    const now = new Date();
    const nowKey = monthKey(now.getFullYear(), now.getMonth() + 1);

    const centerMonthMap = new Map<
      number,
      { paid: number; pending: number; waived: number }
    >();
    for (const bs of billingsPerCenter) {
      for (const b of bs) {
        const k = monthKey(num(b.year), num(b.month));
        const e = centerMonthMap.get(k) ?? { paid: 0, pending: 0, waived: 0 };
        if (b.status === "PAID") e.paid += num(b.amount);
        else if (b.status === "WAIVED") e.waived += num(b.amount);
        else e.pending += num(b.amount);
        centerMonthMap.set(k, e);
      }
    }

    const courseMonthMap = new Map<
      number,
      { paid: number; remaining: number }
    >();
    for (const p of payments) {
      const raw = p.dueDate ?? p.createdAt;
      const d = raw ? new Date(String(raw)) : null;
      if (!d || Number.isNaN(d.getTime())) continue;
      const k = monthKey(d.getFullYear(), d.getMonth() + 1);
      const e = courseMonthMap.get(k) ?? { paid: 0, remaining: 0 };
      e.paid += num(p.paid);
      e.remaining += num(p.remaining);
      courseMonthMap.set(k, e);
    }

    // Expand each map into a continuous month range (earliest → latest
    // record, at least through the current month — future due dates count
    // too). Capped to 12 months so the chart stays readable.
    const expand = <T extends object>(map: Map<number, T>, empty: T) => {
      if (map.size === 0) return [] as ({ year: number; month: number } & T)[];
      const max = Math.max(nowKey, ...map.keys());
      const min = Math.max(Math.min(...map.keys()), max - 11);
      const out: ({ year: number; month: number } & T)[] = [];
      for (let k = min; k <= max; k++) {
        out.push({ ...decodeKey(k), ...(map.get(k) ?? empty) });
      }
      return out;
    };

    return NextResponse.json({
      centers: centerRows,
      courses: courseRows,
      centerMonthly: expand(centerMonthMap, {
        paid: 0,
        pending: 0,
        waived: 0,
      }),
      courseMonthly: expand(courseMonthMap, { paid: 0, remaining: 0 }),
    });
  } catch (err) {
    console.error("[api/admin/payments] load failed:", err);
    return apiErrorResponse(err, "Load failed");
  }
}
