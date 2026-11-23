// List all users with role, username, email, center/course ownership.
// Usage: node check-admin.cjs
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) {
    process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const users = await prisma.user.findMany({
    select: {
      username: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      center: { select: { name: true } },
      ownedCenters: { select: { name: true } },
      ownedCourses: { select: { name: true } },
    },
    orderBy: [{ role: 'asc' }, { username: 'asc' }],
  });

  if (!users.length) {
    console.log('No users in DB.');
  }
  for (const u of users) {
    const centers = u.ownedCenters.map((c) => c.name).join(', ');
    const courses = u.ownedCourses.map((c) => c.name).join(', ');
    console.log(
      `${u.role.padEnd(13)} | ${u.username.padEnd(20)} | ${(u.email ?? '-').padEnd(28)} | ${u.name.padEnd(20)} | active=${u.isActive} | center=${u.center?.name ?? centers ?? '-'} | ownsCourses=${courses || '-'}`,
    );
  }
  await prisma.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
