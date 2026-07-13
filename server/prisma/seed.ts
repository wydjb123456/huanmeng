import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 1. test01 (id=1) 升级为 ADMIN
  await prisma.user.updateMany({
    where: { id: 1 },
    data: { role: Role.ADMIN },
  });
  console.log('test01 (id=1) 升级为 ADMIN');

  // 2. 创建 admin 账号（若不存在）
  const existing = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (!existing) {
    const hashed = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: { username: 'admin', password: hashed, role: Role.ADMIN },
    });
    console.log('创建管理员账号 admin / admin123');
  } else {
    if (existing.role !== Role.ADMIN) {
      await prisma.user.update({ where: { id: existing.id }, data: { role: Role.ADMIN } });
      console.log('admin 账号已存在，升级为 ADMIN');
    } else {
      console.log('admin 账号已存在且为 ADMIN');
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
