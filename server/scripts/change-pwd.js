const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const hashed = await bcrypt.hash('admin456', 10);
  await prisma.user.update({
    where: { username: 'admin' },
    data: { password: hashed }
  });
  console.log('Password updated successfully');
  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (e) => {
  console.error('Error:', e.message);
  await prisma.$disconnect();
  process.exit(1);
});