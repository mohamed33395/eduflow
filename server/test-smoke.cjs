/**
 * EduFlow full API smoke test — exercises every module end-to-end.
 * Read-mostly: only creates clearly-marked TEST records (methods/proofs/
 * landing requests), never deletes real data.
 *
 *   node test-smoke.cjs
 */
const BASE = process.env.API_BASE || 'http://localhost:3001/api';

const state = { pass: 0, fail: 0, failures: [] };
const tokens = {};

async function req(method, path, { body, token, expect } = {}) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    return { status: res.status, data };
  } catch (e) {
    return { status: 0, data: { error: e.message } };
  }
}

function check(label, cond, extra = '') {
  if (cond) { state.pass++; console.log(`  PASS  ${label}`); }
  else {
    state.fail++;
    state.failures.push(label);
    console.log(`  FAIL  ${label} ${extra}`);
  }
}

async function expect(label, method, path, opts, status) {
  const statuses = Array.isArray(status) ? status : [status];
  const r = await req(method, path, opts);
  check(label, statuses.includes(r.status), `→ ${r.status} ${JSON.stringify(r.data).slice(0, 120)}`);
  return r;
}

const list = (r) =>
  Array.isArray(r.data) ? r.data
    : Array.isArray(r.data?.items) ? r.data.items
    : Array.isArray(r.data?.data) ? r.data.data
    : [];

async function login(id, pw) {
  const r = await req('POST', '/auth/login', { body: { identifier: id, password: pw } });
  return r.status === 200 ? r.data.accessToken : null;
}

async function main() {
  console.log(`\n=== EduFlow smoke test → ${BASE} ===\n`);

  // ── Health ───────────────────────────────────────────────
  console.log('— health —');
  await expect('GET /health (public)', 'GET', '/health', {}, [200]);

  // ── Auth / login ─────────────────────────────────────────
  console.log('\n— auth —');
  await expect('login bad password → 401', 'POST', '/auth/login',
    { body: { identifier: 'admin', password: 'WrongPass1!' } }, [400, 401]);
  await expect('login empty password → 400', 'POST', '/auth/login',
    { body: { identifier: 'admin', password: '' } }, 400);
  await expect('login missing field → 400', 'POST', '/auth/login',
    { body: { identifier: 'admin' } }, 400);

  for (const [key, id, pw] of [
    ['admin', 'admin', 'Admin@123'],
    ['owner', 'owner1@eduflow.local', 'Owner@123'],
    ['student', 'student1@eduflow.local', 'Student@123'],
    ['teacher', 'teacher1@eduflow.local', 'Teacher@123'],
  ]) {
    tokens[key] = await login(id, pw);
    check(`login ${key}`, !!tokens[key]);
  }

  const { admin, owner, student, teacher } = tokens;
  if (!admin || !owner || !student) {
    console.log('\nABORT — need admin+owner+student tokens to continue.');
    return;
  }

  await expect('GET /auth/me (admin)', 'GET', '/auth/me', { token: admin }, 200);
  const meOwner = await expect('GET /auth/me (owner)', 'GET', '/auth/me', { token: owner }, 200);
  const meStudent = await expect('GET /auth/me (student)', 'GET', '/auth/me', { token: student }, 200);
  const centerId = meOwner.data.centerId || meStudent.data.centerId;
  // Owner's own center slug (needed to file a scoped landing request).
  let ownerSlug;
  if (centerId) {
    const c = await req('GET', `/centers/${centerId}`, { token: owner });
    ownerSlug = c.data?.slug;
  }

  await expect('change-password wrong current → 4xx', 'POST', '/auth/change-password',
    { token: student, body: { currentPassword: 'nope-nope', newPassword: 'Xyzzy@1234' } }, [400, 401, 403]);
  await expect('forgot-password (public, unknown id) → 2xx', 'POST', '/auth/forgot-password',
    { body: { identifier: 'nobody-here-xyz' } }, [200, 201, 404]);

  // ── Multi-stage auth (public) ────────────────────────────
  console.log('\n— multi-stage auth —');
  await expect('POST /auths/get-login-ways', 'POST', '/auths/get-login-ways',
    { body: { identifier: 'student1@eduflow.local' } }, [200, 201]);

  // ── Users ────────────────────────────────────────────────
  console.log('\n— users —');
  const users = await expect('GET /users (admin)', 'GET', '/users', { token: admin }, 200);
  await expect('GET /users?role=STUDENT&limit=5', 'GET', '/users?role=STUDENT&limit=5', { token: admin }, 200);
  await expect('GET /users (student) → 403', 'GET', '/users', { token: student }, 403);
  const anyUser = list(users)[0];
  if (anyUser?.id) await expect('GET /users/:id', 'GET', `/users/${anyUser.id}`, { token: admin }, 200);

  // ── Centers ──────────────────────────────────────────────
  console.log('\n— centers —');
  const centers = await expect('GET /centers (admin)', 'GET', '/centers', { token: admin }, 200);
  const center = list(centers)[0];
  if (center?.id) {
    await expect('GET /centers/:id', 'GET', `/centers/${center.id}`, { token: admin }, 200);
    if (center.slug)
      await expect('GET /centers/slug/:slug (public)', 'GET', `/centers/slug/${center.slug}`, {}, 200);
  }
  if (centerId)
    await expect('GET /centers/:id (owner)', 'GET', `/centers/${centerId}`, { token: owner }, 200);
  await expect('PATCH /centers/:id (student) → 403', 'PATCH', `/centers/${center?.id}`,
    { token: student, body: { name: 'hack' } }, [401, 403, 404]);

  // ── Academics: courses/classes/subjects ──────────────────
  console.log('\n— academics —');
  const courses = await expect('GET /courses', 'GET', '/courses', { token: admin }, 200);
  const course = list(courses)[0];
  if (course?.id) {
    await expect('GET /courses/:id', 'GET', `/courses/${course.id}`, { token: admin }, 200);
    if (course.slug)
      await expect('GET /courses/slug/:slug (public)', 'GET', `/courses/slug/${course.slug}`, {}, 200);
  }
  const classes = await expect('GET /classes', 'GET', `/classes${centerId ? `?centerId=${centerId}` : ''}`, { token: owner }, 200);
  const cls = list(classes)[0];
  if (cls?.id) await expect('GET /classes/:id', 'GET', `/classes/${cls.id}`, { token: owner }, 200);

  const subjects = await expect('GET /subjects', 'GET', `/subjects${centerId ? `?centerId=${centerId}` : ''}`, { token: owner }, 200);
  const subject = list(subjects)[0];
  if (subject?.id) await expect('GET /subjects/:id', 'GET', `/subjects/${subject.id}`, { token: owner }, 200);
  await expect('POST /courses bad level → 400', 'POST', '/courses',
    { token: owner, body: { name: 'x', type: 't', level: 'NOPE', gradeFrom: 1, gradeTo: 2, description: 'd' } }, 400);

  // ── People: students/teachers ────────────────────────────
  console.log('\n— people —');
  const students = await expect('GET /students', 'GET', '/students', { token: owner }, 200);
  const stu = list(students)[0];
  if (stu?.id) await expect('GET /students/:id', 'GET', `/students/${stu.id}`, { token: owner }, 200);
  const teachers = await expect('GET /teachers', 'GET', '/teachers', { token: owner }, 200);
  const teach = list(teachers)[0];
  if (teach?.id) {
    await expect('GET /teachers/:id', 'GET', `/teachers/${teach.id}`, { token: owner }, 200);
    await expect('GET /teachers/:id/students', 'GET', `/teachers/${teach.id}/students`, { token: owner }, 200);
  }
  // Students are scoped to their own row — never classmates' data.
  const stuList = await expect('GET /students (student → own row only)', 'GET', '/students', { token: student }, 200);
  const stuRows = list(stuList);
  check('student list contains only self', stuRows.length <= 1 && (!stuRows[0] || stuRows[0].id === meStudent.data.id),
    `got ${stuRows.length} rows`);

  // ── Learning: lessons/assignments/submissions ────────────
  console.log('\n— learning —');
  if (course?.id) {
    await expect('GET /courses/:id/lessons', 'GET', `/courses/${course.id}/lessons`, { token: owner }, 200);
    const asg = await expect('GET /courses/:id/assignments', 'GET', `/courses/${course.id}/assignments`, { token: owner }, 200);
    const firstAsg = list(asg)[0];
    if (firstAsg?.id) {
      await expect('GET /assignments/:id', 'GET', `/assignments/${firstAsg.id}`, { token: owner }, 200);
      await expect('GET /assignments/:id/submissions', 'GET', `/assignments/${firstAsg.id}/submissions`, { token: owner }, 200);
    }
  }
  await expect('GET /submissions (student)', 'GET', '/submissions', { token: student }, 200);
  await expect('POST /lessons no title → 400', 'POST', '/lessons',
    { token: owner, body: { courseId: course?.id ?? 'x' } }, 400);

  // ── Tasks ────────────────────────────────────────────────
  console.log('\n— tasks —');
  const tasks = await expect('GET /tasks', 'GET', `/tasks${centerId ? `?centerId=${centerId}` : ''}`, { token: owner }, 200);
  const task = list(tasks)[0];
  if (task?.id) await expect('GET /tasks/:id', 'GET', `/tasks/${task.id}`, { token: owner }, 200);
  await expect('GET /tasks/mine (student)', 'GET', '/tasks/mine', { token: student }, 200);
  await expect('GET /tasks/review-queue', 'GET', '/tasks/review-queue', { token: teacher || owner }, 200);
  if (subject?.id)
    await expect('GET /tasks/form-data?subjectId', 'GET', `/tasks/form-data?subjectId=${subject.id}`, { token: owner }, 200);
  await expect('GET /tasks/form-data (missing subjectId) → 400', 'GET', '/tasks/form-data', { token: owner }, 400);
  await expect('POST /tasks missing fields → 400', 'POST', '/tasks',
    { token: owner, body: { title: 'x' } }, 400);

  // ── Attendance ───────────────────────────────────────────
  console.log('\n— attendance —');
  await expect('GET /attendance', 'GET', '/attendance', { token: teacher || owner }, 200);
  if (course?.id)
    await expect('GET /attendance?courseId', 'GET', `/attendance?courseId=${course.id}`, { token: teacher || owner }, 200);
  await expect('POST /attendance empty entries → 400', 'POST', '/attendance',
    { token: teacher || owner, body: { entries: [] } }, 400);

  // ── Finance: payments/methods/proofs/payouts ─────────────
  console.log('\n— finance —');
  await expect('GET /payments (owner)', 'GET', '/payments', { token: owner }, 200);
  await expect('GET /payments?page=1&limit=5', 'GET', '/payments?page=1&limit=5', { token: owner }, 200);
  await expect('GET /payments?limit=999 → 400', 'GET', '/payments?limit=999', { token: owner }, 400);
  const myPays = await expect('GET /payments (student)', 'GET', '/payments', { token: student }, 200);
  const openInvoice = list(myPays).find((p) => (p.remaining ?? p.amount ?? 0) > 0) || list(myPays)[0];

  const methods = await expect('GET /payment-methods (owner)', 'GET', '/payment-methods', { token: owner }, 200);
  await expect('GET /payment-methods (student)', 'GET', '/payment-methods', { token: student }, 200);
  const method = await expect('POST /payment-methods (TEST)', 'POST', '/payment-methods',
    { token: owner, body: { kind: 'WALLET', label: 'TEST-SMOKE', account: '0100', details: 'smoke' } }, [200, 201]);
  await expect('POST /payment-methods bad kind → 400', 'POST', '/payment-methods',
    { token: owner, body: { kind: 'FOOBAR', label: 'x', account: '1' } }, 400);
  await expect('POST /payment-methods extra field → 400', 'POST', '/payment-methods',
    { token: owner, body: { kind: 'WALLET', label: 'x', account: '1', hacked: true } }, 400);

  await expect('GET /payment-proofs (owner)', 'GET', '/payment-proofs', { token: owner }, 200);
  await expect('GET /payment-proofs/mine (student)', 'GET', '/payment-proofs/mine', { token: student }, 200);
  if (openInvoice?.id) {
    await expect('POST proof empty → 400', 'POST', `/payments/${openInvoice.id}/proofs`,
      { token: student, body: {} }, 400);
    await expect('POST proof foreign URL → 400', 'POST', `/payments/${openInvoice.id}/proofs`,
      { token: student, body: { screenshot: 'https://evil.example/x.png' } }, 400);
    if (method.data?.id && (openInvoice.remaining ?? 0) > 0) {
      const ok = await req('POST', `/payments/${openInvoice.id}/proofs`,
        { token: student, body: { methodId: method.data.id, amount: 1, reference: 'SMOKE-REF' } });
      // 201 = created; 400 'under review' = duplicate-guard fired (rerun).
      check('POST proof valid (TEST)', [200, 201].includes(ok.status) ||
        (ok.status === 400 && /under review/i.test(JSON.stringify(ok.data))),
        `→ ${ok.status} ${JSON.stringify(ok.data).slice(0, 100)}`);
    }
  }
  await expect('GET /payouts (owner)', 'GET', '/payouts', { token: owner }, 200);
  if (teach?.id) {
    await expect('GET /payouts/preview (valid dates)', 'GET',
      `/payouts/preview?teacherId=${teach.id}&periodStart=2026-11-01&periodEnd=2026-11-30`,
      { token: owner }, 200);
    await expect('GET /payouts/preview bad date → 400', 'GET',
      `/payouts/preview?teacherId=${teach.id}&periodStart=not-a-date&periodEnd=2026-11-30`,
      { token: owner }, 400);
  }

  // ── Notifications ────────────────────────────────────────
  console.log('\n— notifications —');
  const notifs = await expect('GET /notifications (student)', 'GET', '/notifications', { token: student }, 200);
  await expect('PATCH /notifications/read-all', 'PATCH', '/notifications/read-all', { token: student }, 200);
  const notif = list(notifs)[0];
  if (notif?.id)
    await expect('PATCH /notifications/:id/read', 'PATCH', `/notifications/${notif.id}/read`, { token: student }, 200);

  // ── Uploads ──────────────────────────────────────────────
  console.log('\n— uploads —');
  const presign = await expect('POST /uploads/presign', 'POST', '/uploads/presign',
    { token: student, body: { filename: 'smoke.txt', contentType: 'text/plain', folder: 'submissions' } }, [200, 201]);
  await expect('POST /uploads/presign bad folder → 400', 'POST', '/uploads/presign',
    { token: student, body: { filename: 'x.txt', contentType: 'text/plain', folder: '../../etc' } }, 400);
  if (presign.data?.uploadUrl?.includes('/uploads/local')) {
    const put = await fetch(presign.data.uploadUrl, { method: 'PUT', body: 'smoke-test' });
    check('PUT /uploads/local (signed)', put.status === 200, `→ ${put.status}`);
    if (put.status === 200 && presign.data.publicUrl) {
      const get = await fetch(presign.data.publicUrl);
      check('GET /uploads/local (public file)', get.status === 200, `→ ${get.status}`);
    }
  }
  await expect('GET /uploads/local traversal → 404/400', 'GET',
    '/uploads/local?key=../../etc/passwd', {}, [400, 403, 404]);

  // ── Landing requests (public) ────────────────────────────
  console.log('\n— landing requests —');
  const lr = await expect('POST /landing-requests (public)', 'POST', '/landing-requests',
    { body: { role: 'student', name: 'SMOKE TEST', phone: '01000000000', message: 'smoke', ...(ownerSlug ? { centerSlug: ownerSlug } : {}) } }, [200, 201]);
  await expect('POST /landing-requests bad role → 400', 'POST', '/landing-requests',
    { body: { role: 'hacker', name: 'x', phone: '1' } }, 400);
  await expect('GET /landing-requests (owner)', 'GET', '/landing-requests', { token: owner }, 200);
  if (lr.data?.id)
    await expect('PATCH /landing-requests/:id', 'PATCH', `/landing-requests/${lr.data.id}`,
      { token: owner, body: { status: 'contacted' } }, 200);

  // ── Security gates ───────────────────────────────────────
  console.log('\n— security gates —');
  await expect('no token → 401', 'GET', '/payments', {}, 401);
  await expect('bad token → 401', 'GET', '/payments', { token: 'garbage.jwt.here' }, 401);
  await expect('student POST /payments → 403', 'POST', '/payments',
    { token: student, body: { studentId: 'x', courseId: 'y', amount: 1 } }, 403);

  // ── Rate limit (LAST — locks this IP on /auth/login for 60s) ──
  console.log('\n— rate limit (runs last) —');
  let limited = 0;
  for (let i = 0; i < 12; i++) {
    const r = await req('POST', '/auth/login', { body: { identifier: `burst-${i}`, password: 'x'.repeat(8) } });
    if (r.status === 429) limited++;
  }
  check('login rate limit 429 observed', limited > 0, `got ${limited}/12`);

  console.log(`\n=== DONE: ${state.pass} passed, ${state.fail} failed ===`);
  if (state.failures.length) {
    console.log('Failures:');
    state.failures.forEach((f) => console.log(`  - ${f}`));
  }
  process.exit(state.fail ? 1 : 0);
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
