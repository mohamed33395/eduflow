// Reset user passwords.
// Usage: node reset-admin.cjs username:newpassword [username:newpassword ...]
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) {
    process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const pairs = process.argv.slice(2);
  if (!pairs.length) {
    console.log('Usage: node reset-admin.cjs username:newpassword [...]');
    process.exit(1);
  }
  for (const pair of pairs) {
    const idx = pair.indexOf(':');
    const username = pair.slice(0, idx);
    const password = pair.slice(idx + 1);
    const user = await prisma.user.update({
      where: { username },
      data: { passwordHash: await bcrypt.hash(password, 12) },
      select: { username: true, role: true },
    });
    console.log(`reset ${user.username} (${user.role}) -> ${password}`);
  }
  await prisma.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
