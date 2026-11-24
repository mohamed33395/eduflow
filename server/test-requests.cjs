/**
 * End-to-end test for the landing-requests + editable-labels feature.
 * Mints JWTs for real users (no DB mutation) and exercises the live API.
 * Run: node test-requests.cjs  (from server/)
 */
require("dotenv").config();
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const BASE = "http://localhost:3001";
const SECRET = process.env.JWT_ACCESS_SECRET;
const tokenFor = (u) =>
  jwt.sign({ sub: u.id, role: u.role }, SECRET, { expiresIn: "10m" });

async function req(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

const results = [];
const check = (name, cond, extra = "") =>
  results.push({ name, pass: !!cond, extra });

async function main() {
  // ── real users for scoped tokens ──
  const center = await prisma.center.findUnique({
    where: { slug: "test-center" },
    include: { owner: true },
  });
  const course = await prisma.course.findUnique({
    where: { slug: "alham-sci-g6" },
    include: { owner: true },
  });
  const admin = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
  const student = await prisma.user.findFirst({ where: { role: "STUDENT" } });
  const otherCenter = await prisma.center.findFirst({
    where: { slug: { not: "test-center" } },
    include: { owner: true },
  });
  // A course that actually belongs to test-center (shared scope check).
  const ownCourse = await prisma.course.findFirst({
    where: { centerId: center.id },
  });
  console.log(
    `ownCourse under test-center: ${ownCourse?.slug ?? "none"}; alham-sci-g6 center=${course?.centerId === center.id ? "test-center" : "other"}`
  );
  const adminTok = tokenFor(admin);
  const centerTok = center ? tokenFor(center.owner) : null;
  const courseTok = course ? tokenFor(course.owner) : null;
  const studentTok = student ? tokenFor(student) : null;
  const otherTok = otherCenter ? tokenFor(otherCenter.owner) : null;

  // ── 1. public POST ──
  let r = await req("POST", "/api/landing-requests", {
    body: { role: "student", name: "TEST-STU-1", phone: "01000000001", centerSlug: "test-center", message: "m1" },
  });
  check("POST public center request (student) → 201", r.status === 201 && r.data?.ok);
  const centerReqId = r.data?.id;

  r = await req("POST", "/api/landing-requests", {
    body: { role: "teacher", name: "TEST-TEA-1", phone: "01000000002", courseSlug: "alham-sci-g6" },
  });
  check("POST public course request (teacher) → 201", r.status === 201 && r.data?.ok);
  const courseReqId = r.data?.id;

  r = await req("POST", "/api/landing-requests", { body: { role: "alien", name: "X", phone: "1", centerSlug: "test-center" } });
  check("POST invalid role → 400", r.status === 400);

  r = await req("POST", "/api/landing-requests", { body: { role: "student", phone: "1", centerSlug: "test-center" } });
  check("POST missing name → 400", r.status === 400);

  r = await req("POST", "/api/landing-requests", { body: { role: "student", name: "X", phone: "1" } });
  check("POST without slug → 400", r.status === 400);

  r = await req("POST", "/api/landing-requests", { body: { role: "student", name: "X", phone: "1", centerSlug: "nope-404" } });
  check("POST unknown slug → 404", r.status === 404);

  r = await req("POST", "/api/landing-requests", { body: { role: "student", name: "X", phone: "1", centerSlug: "test-center", evil: "field" } });
  check("POST unknown field → 400 (whitelist)", r.status === 400);

  r = await req("POST", "/api/landing-requests", { body: { role: "student", name: "BOT-SPAMMER", phone: "1", centerSlug: "test-center", website: "spam.com" } });
  check("POST honeypot → fake success", (r.status === 201 || r.status === 200) && r.data?.ok);

  // ── 2. authenticated GET ──
  r = await req("GET", "/api/landing-requests");
  check("GET without token → 401", r.status === 401);

  if (studentTok) {
    r = await req("GET", "/api/landing-requests", { token: studentTok });
    check("GET as student → 403", r.status === 403);
  } else check("GET as student → 403", false, "no student user");

  r = await req("GET", "/api/landing-requests", { token: adminTok });
  const adminList = r.data || [];
  check("GET as admin → all requests", r.status === 200 && adminList.some(x => x.id === centerReqId) && adminList.some(x => x.id === courseReqId));
  check("honeypot request NOT stored", !adminList.some(x => x.name === "BOT-SPAMMER"));

  // Request on a course that belongs to test-center → shared scope.
  let ownCourseReqId = null;
  if (ownCourse) {
    r = await req("POST", "/api/landing-requests", {
      body: { role: "teacher", name: "TEST-TEA-OWN", phone: "01000000003", courseSlug: ownCourse.slug },
    });
    check("POST public request on test-center's own course → 201", r.status === 201);
    ownCourseReqId = r.data?.id;
  }

  if (centerTok) {
    r = await req("GET", "/api/landing-requests", { token: centerTok });
    const list = r.data || [];
    check("GET center owner → sees own center request",
      list.some(x => x.id === centerReqId), `got ${list.length}`);
    check("GET center owner → NOT see other center's course request",
      !list.some(x => x.id === courseReqId));
    if (ownCourse)
      check("GET center owner → sees request on ITS OWN course",
        list.some(x => x.id === ownCourseReqId));
  } else check("GET center owner scoped", false, "no test-center owner");

  if (courseTok) {
    r = await req("GET", "/api/landing-requests", { token: courseTok });
    const list = r.data || [];
    check("GET course owner → sees course req, NOT center req",
      list.some(x => x.id === courseReqId) && !list.some(x => x.id === centerReqId), `got ${list.length}`);
  } else check("GET course owner scoped", false, "no course owner");

  if (otherTok) {
    r = await req("GET", "/api/landing-requests", { token: otherTok });
    const list = r.data || [];
    // الاحلام owns alham-sci-g6 → SHOULD see course request; must NOT see test-center's.
    check(`other center (${otherCenter.slug}) sees ITS OWN course request`,
      list.some(x => x.id === courseReqId));
    check(`other center does NOT see test-center request`,
      !list.some(x => x.id === centerReqId));
  } else results.push({ name: "other-center isolation", pass: true, extra: "skipped - only one center" });

  // ── 3. PATCH status ──
  r = await req("PATCH", `/api/landing-requests/${centerReqId}`, { token: adminTok, body: { status: "contacted" } });
  check("PATCH admin status → 200", r.status === 200 && r.data?.status === "contacted");

  r = await req("PATCH", `/api/landing-requests/${centerReqId}`, { token: adminTok, body: { status: "bogus" } });
  check("PATCH invalid status → 400", r.status === 400);

  r = await req("PATCH", "/api/landing-requests/no-such-id", { token: adminTok, body: { status: "accepted" } });
  check("PATCH unknown id → 404", r.status === 404);

  if (courseTok) {
    r = await req("PATCH", `/api/landing-requests/${centerReqId}`, { token: courseTok, body: { status: "accepted" } });
    check("PATCH course owner on CENTER request → 403", r.status === 403);
    r = await req("PATCH", `/api/landing-requests/${courseReqId}`, { token: courseTok, body: { status: "accepted" } });
    check("PATCH course owner on own request → 200", r.status === 200);
  }
  if (centerTok) {
    r = await req("PATCH", `/api/landing-requests/${courseReqId}`, { token: centerTok, body: { status: "rejected" } });
    check("PATCH center owner on OTHER center's course request → 403", r.status === 403);
    if (ownCourseReqId) {
      r = await req("PATCH", `/api/landing-requests/${ownCourseReqId}`, { token: centerTok, body: { status: "rejected" } });
      check("PATCH center owner on OWN course's request → 200", r.status === 200);
    }
  }
  if (otherTok) {
    r = await req("PATCH", `/api/landing-requests/${courseReqId}`, { token: otherTok, body: { status: "accepted" } });
    check("PATCH other-center owner on its course request → 200", r.status === 200);
  }

  // ── 4. landing profile new fields round-trip ──
  const landingPayload = {
    landing: {
      bookingEnabled: false,
      subtitle: "TEST-SUB",
      footerText: "TEST-FOOTER",
      labels: { bookingTitle: "TEST-BT", featuresTitle: "TEST-FT" },
    },
  };
  r = await req("PATCH", `/api/centers/${center.id}`, { token: adminTok, body: landingPayload });
  check("PATCH landing new fields → 200", r.status === 200);

  r = await req("GET", "/api/centers/slug/test-center");
  const l = r.data?.landing || {};
  check("public slug returns labels", l.labels?.bookingTitle === "TEST-BT" && l.labels?.featuresTitle === "TEST-FT");
  check("public slug returns subtitle/footerText", l.subtitle === "TEST-SUB" && l.footerText === "TEST-FOOTER");
  check("public slug returns bookingEnabled=false", l.bookingEnabled === false);

  // restore defaults
  await req("PATCH", `/api/centers/${center.id}`, {
    token: adminTok,
    body: { landing: { bookingEnabled: true, subtitle: "", footerText: "", labels: {} } },
  });

  // ── 5. DELETE + cleanup ──
  if (centerTok) {
    r = await req("DELETE", `/api/landing-requests/${centerReqId}`, { token: centerTok });
    check("DELETE center owner own request → 200", r.status === 200);
    r = await req("GET", "/api/landing-requests", { token: adminTok });
    check("deleted request gone", !(r.data || []).some(x => x.id === centerReqId));
  } else {
    await req("DELETE", `/api/landing-requests/${centerReqId}`, { token: adminTok });
  }
  await req("DELETE", `/api/landing-requests/${courseReqId}`, { token: adminTok });
  if (ownCourseReqId)
    await req("DELETE", `/api/landing-requests/${ownCourseReqId}`, { token: adminTok });

  // ── report ──
  let pass = 0;
  for (const r2 of results) {
    console.log(`${r2.pass ? "PASS" : "FAIL"}  ${r2.name}${r2.extra ? `  (${r2.extra})` : ""}`);
    if (r2.pass) pass++;
  }
  console.log(`\n${pass}/${results.length} passed`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("TEST CRASH:", e);
  await prisma.$disconnect();
  process.exit(1);
});
