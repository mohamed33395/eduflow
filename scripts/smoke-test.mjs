/**
 * EduFlow E2E smoke test.
 *
 * Covers: health, multi-stage login (get-login-ways → login-step through the
 * Next.js BFF), per-role sessions, authorization boundaries, token refresh,
 * the legacy /auth/login path, and negative cases.
 *
 * Usage:
 *   node scripts/smoke-test.mjs
 *   API=http://localhost:3001 WEB=http://localhost:3002 node scripts/smoke-test.mjs
 *
 * Requires the Nest API on :3001 and the Next dev server on :3002.
 */

const API = process.env.API ?? "http://localhost:3001";
const WEB = process.env.WEB ?? "http://localhost:3002";

const USERS = [
  { identifier: "admin",          password: "Admin@12345", role: "super_admin" },
  { identifier: "owner1",         password: "Owner@123",   role: "center_owner" },
  { identifier: "mah01010533395", password: "Center@123",  role: "center_owner" },
  { identifier: "teacher1",       password: "Teacher@123", role: "teacher" },
  { identifier: "student1",       password: "Student@123", role: "student" },
];

let passed = 0;
let failed = 0;
const failures = [];

function check(name, cond, detail = "") {
  if (cond) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  FAIL  ${name}${detail ? " — " + detail : ""}`);
  }
}

async function post(url, body, headers = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    redirect: "manual",
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data, headers: res.headers };
}

async function get(url, headers = {}) {
  const res = await fetch(url, { headers, redirect: "manual" });
  const data = await res.json().catch(() => null);
  return { status: res.status, data, headers: res.headers };
}

/** Pull "name=value" pairs out of a Response's Set-Cookie headers. */
function cookiePairs(headers) {
  const out = {};
  for (const sc of headers.getSetCookie?.() ?? []) {
    const m = /^([^=]+)=([^;]*)/.exec(sc);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function cookieHeader(cookies) {
  return Object.entries(cookies)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

// ── 1. Infrastructure ──────────────────────────────────────────────
console.log("\n== Infrastructure ==");

{
  const r = await get(`${API}/api/health`);
  check("API /api/health is public and ok", r.status === 200 && r.data?.status === "ok", `status=${r.status}`);

  const login = await get(`${WEB}/login`);
  check("Frontend /login renders", login.status === 200, `status=${login.status}`);

  const root = await get(`${WEB}/`);
  check("Frontend / redirects (unauthenticated)", [301, 302, 307, 308].includes(root.status), `status=${root.status}`);
}

// ── 2. Per-role multi-stage login through the BFF ─────────────────
console.log("\n== Multi-stage login per role (via BFF /api/auth/session) ==");

const sessions = {}; // role → { cookies, user }

for (const u of USERS) {
  const ways = await post(`${API}/api/auths/get-login-ways`, { identifier: u.identifier });
  check(`${u.identifier}: get-login-ways returns step token`, ways.status === 200 && !!ways.data?.payload?.token, `status=${ways.status}`);

  const token = ways.data?.payload?.token;
  const login = await post(`${WEB}/api/auth/session`, {
    identifier: u.identifier,
    password: u.password,
    token,
  });
  const cookies = cookiePairs(login.headers);
  check(
    `${u.identifier}: login-step sets session + maps role`,
    login.status === 200 && login.data?.user?.role === u.role && !!cookies.edu_session && !!cookies.edu_rt,
    `status=${login.status} role=${login.data?.user?.role}`
  );
  sessions[u.identifier] = { cookies, user: login.data?.user };

  const me = await get(`${WEB}/api/auth/user`, { cookie: cookieHeader(cookies) });
  check(`${u.identifier}: session cookie authenticates /api/auth/user`, me.status === 200 && me.data?.role === u.role, `status=${me.status}`);
}

// ── 3. Authorization boundaries ───────────────────────────────────
console.log("\n== Authorization boundaries ==");

{
  // Student JWT cannot hit super-admin-only endpoints
  const st = sessions.student1.cookies.edu_session;
  const denied = await get(`${API}/api/users`, { authorization: `Bearer ${st}` });
  check("student token denied on /api/users (SUPER_ADMIN|CENTER_OWNER)", denied.status === 403, `status=${denied.status}`);

  const stCenters = await get(`${API}/api/centers`, { authorization: `Bearer ${st}` });
  // Non-admin actors are scoped to their own center — a student must never
  // see the full platform list (there are 2+ centers in this DB).
  check(
    "student sees only their own center on /api/centers",
    stCenters.status === 200 && Array.isArray(stCenters.data) && stCenters.data.length <= 1,
    `status=${stCenters.status} count=${stCenters.data?.length}`
  );

  // Admin JWT can list users
  const ad = sessions.admin.cookies.edu_session;
  const ok = await get(`${API}/api/users`, { authorization: `Bearer ${ad}` });
  check("admin token allowed on /api/users", ok.status === 200 && Array.isArray(ok.data?.items), `status=${ok.status}`);

  // No token at all → 401
  const anon = await get(`${API}/api/users`);
  check("anonymous request denied on /api/users", anon.status === 401, `status=${anon.status}`);
}

// ── 4. Refresh token rotation-free renew ──────────────────────────
console.log("\n== Refresh token ==");

{
  const rt = sessions.admin.cookies.edu_rt;
  const r = await post(`${API}/api/auth/refresh?rotate=false`, {}, {
    cookie: `eduflow_refresh=${rt}`,
  });
  check("refresh issues a new access token", r.status === 200 && !!r.data?.accessToken, `status=${r.status}`);
}

// ── 5. Legacy single-step login still works ───────────────────────
console.log("\n== Legacy /auth/login (no step token) ==");

{
  const r = await post(`${WEB}/api/auth/session`, {
    identifier: "admin",
    password: "Admin@12345",
  });
  const cookies = cookiePairs(r.headers);
  check("legacy login succeeds and sets cookies", r.status === 200 && r.data?.user?.role === "super_admin" && !!cookies.edu_session, `status=${r.status}`);
}

// ── 6. Negative cases ─────────────────────────────────────────────
console.log("\n== Negative cases ==");

{
  const short = await post(`${API}/api/auths/get-login-ways`, { identifier: "ab" });
  check("get-login-ways rejects short identifier", short.status === 400, `status=${short.status}`);

  const badToken = await post(`${API}/api/auths/login-step`, {
    identifier: "admin",
    password: "Admin@12345",
    token: "not-a-real-token",
  });
  // 429 = ThrottlerGuard kicked in (5 login-step calls/min) — also a rejection.
  check("login-step rejects bogus step token", [401, 429].includes(badToken.status), `status=${badToken.status}`);

  const ways = await post(`${API}/api/auths/get-login-ways`, { identifier: "admin" });
  const wrongPw = await post(`${API}/api/auths/login-step`, {
    identifier: "admin",
    password: "WrongPass999",
    token: ways.data?.payload?.token,
  });
  check("login-step rejects wrong password", [401, 429].includes(wrongPw.status), `status=${wrongPw.status}`);

  const badJson = await fetch(`${API}/api/auths/get-login-ways`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{invalid json",
  });
  check("malformed JSON rejected", badJson.status === 400, `status=${badJson.status}`);
}

// ── Summary ───────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) {
  console.log("Failures:", failures.join(" | "));
  process.exit(1);
}
