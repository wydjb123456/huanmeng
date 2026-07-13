import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CouponStatus } from '@prisma/client';

const CODE_PREFIX = 'PPT';

function genCode(): string {
  const rand = randomBytes(4).toString('hex').toUpperCase();
  return `${CODE_PREFIX}-${rand}`;
}

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  // 管理员生成兑换码
  async generateCoupons(amount: number, count: number, expiresAt?: Date) {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = genCode();
      await this.prisma.coupon.create({
        data: { code, amount, expiresAt },
      });
      codes.push(code);
    }
    return { codes, count: codes.length };
  }

  // 用户使用兑换码
  async redeem(userId: number, code: string) {
    const normalizedCode = code.trim().toUpperCase();
    const coupon = await this.prisma.coupon.findUnique({ where: { code: normalizedCode } });
    if (!coupon) throw new NotFoundException('兑换码不存在');

    if (coupon.status !== 'unused') {
      throw new BadRequestException('兑换码已被使用或已失效');
    }

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      await this.prisma.coupon.update({ where: { id: coupon.id }, data: { status: 'expired' } });
      throw new BadRequestException('兑换码已过期');
    }

    await this.prisma.$transaction([
      this.prisma.coupon.update({
        where: { id: coupon.id },
        data: { status: 'used', usedById: userId, usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { balance: { increment: coupon.amount } },
      }),
    ]);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });

    return { amount: coupon.amount, newBalance: user?.balance ?? 0 };
  }

  async listAll() {
    return this.prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async batchUpdateStatus(ids: number[], action: 'disable' | 'enable') {
    const targetStatus: CouponStatus = action === 'disable' ? 'disabled' : 'unused';
    const allowedSourceStatus: CouponStatus[] = action === 'disable' ? ['unused'] : ['disabled'];
    const result = await this.prisma.coupon.updateMany({
      where: { id: { in: ids }, status: { in: allowedSourceStatus } },
      data: { status: targetStatus },
    });
    return { updated: result.count };
  }

  async deleteCoupon(id: number) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('兑换码不存在');
    if (coupon.status === 'used') {
      throw new BadRequestException('已使用的兑换码不可删除');
    }
    await this.prisma.coupon.delete({ where: { id } });
    return { id };
  }

  async getStats() {
    const grouped = await this.prisma.coupon.groupBy({
      by: ['status'],
      _count: { _all: true },
      _sum: { amount: true },
    });
    const stats: Record<string, { count: number; totalAmount: number }> = {};
    for (const g of grouped) {
      stats[g.status] = { count: g._count._all, totalAmount: g._sum.amount ?? 0 };
    }
    const total = grouped.reduce((sum, g) => sum + g._count._all, 0);
    const totalAmount = grouped.reduce((sum, g) => sum + (g._sum.amount ?? 0), 0);
    return {
      total,
      totalAmount,
      unused: stats['unused']?.count ?? 0,
      used: stats['used']?.count ?? 0,
      expired: stats['expired']?.count ?? 0,
      disabled: stats['disabled']?.count ?? 0,
    };
  }
}
