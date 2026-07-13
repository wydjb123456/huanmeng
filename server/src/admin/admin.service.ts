import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CouponsService } from '../coupons/coupons.service';
import { CouponStatus } from '@prisma/client';
import { AdjustBalanceDto, GenerateCouponDto, BatchCouponDto } from './dto';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private coupons: CouponsService,
  ) {}

  async getStats() {
    const [userCount, workCount, todayStart] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.work.count(),
      new Date(new Date().setHours(0, 0, 0, 0)),
    ]);

    const todayNewUsers = await this.prisma.user.count({
      where: { createdAt: { gte: todayStart } },
    });

    const worksByStatus = await this.prisma.work.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    const completedWorks = worksByStatus.find((w) => w.status === 'completed')?._count._all ?? 0;

    return {
      userCount,
      workCount,
      todayNewUsers,
      completedWorks,
      worksByStatus: worksByStatus.map((w) => ({ status: w.status, count: w._count._all })),
    };
  }

  async listUsers(q?: string, page = 1, size = 20) {
    const where = q ? { username: { contains: q } } : {};
    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          balance: true,
          role: true,
          createdAt: true,
          _count: { select: { works: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * size,
        take: size,
      }),
    ]);
    return {
      total,
      page,
      size,
      items: users.map((u) => ({
        ...u,
        workCount: u._count.works,
        _count: undefined,
      })),
    };
  }

  async adjustBalance(adminId: number, targetUserId: number, dto: AdjustBalanceDto) {
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) throw new NotFoundException('用户不存在');
    if (targetUserId === 1) {
      throw new BadRequestException('测试账号积分无限，不可调整');
    }
    const newBalance = user.balance + dto.delta;
    if (newBalance < 0) {
      throw new BadRequestException(`积分不足（当前 ${user.balance}，尝试 ${dto.delta}）`);
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: targetUserId },
        data: { balance: { increment: dto.delta } },
      }),
      this.prisma.adminOperation.create({
        data: {
          adminId,
          targetUserId,
          action: 'balance_adjust',
          delta: dto.delta,
          reason: dto.reason,
        },
      }),
    ]);

    return { userId: targetUserId, newBalance, delta: dto.delta };
  }

  async getUserOperations(targetUserId: number) {
    const ops = await this.prisma.adminOperation.findMany({
      where: { targetUserId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const adminIds = [...new Set(ops.map((o) => o.adminId))];
    const admins = await this.prisma.user.findMany({
      where: { id: { in: adminIds } },
      select: { id: true, username: true },
    });
    const adminMap = new Map(admins.map((a) => [a.id, a.username]));
    return ops.map((o) => ({ ...o, adminUsername: adminMap.get(o.adminId) ?? 'unknown' }));
  }

  async listWorks(page = 1, size = 20, userId?: number) {
    const where = userId ? { userId } : {};
    const [total, items] = await Promise.all([
      this.prisma.work.count({ where }),
      this.prisma.work.findMany({
        where,
        select: {
          id: true, type: true, status: true, progress: true,
          pageCount: true, createdAt: true, title: true,
          user: { select: { username: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * size,
        take: size,
      }),
    ]);
    return { total, page, size, items };
  }

  async listCoupons(status?: string, code?: string) {
    const where: { status?: CouponStatus; code?: { contains: string } } = {};
    if (status) {
      where.status = status as CouponStatus;
    }
    if (code) {
      where.code = { contains: code };
    }
    const coupons = await this.prisma.coupon.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    const usedByIds = [...new Set(coupons.filter((c) => c.usedById).map((c) => c.usedById!))];
    const users = usedByIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: usedByIds } }, select: { id: true, username: true } })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u.username]));
    return coupons.map((c) => ({
      ...c,
      usedByUsername: c.usedById ? userMap.get(c.usedById) ?? null : null,
    }));
  }

  async batchUpdateCoupons(dto: BatchCouponDto) {
    const result = await this.coupons.batchUpdateStatus(dto.ids, dto.action);
    return { ...result, action: dto.action };
  }

  async deleteCoupon(id: number) {
    return this.coupons.deleteCoupon(id);
  }

  async getCouponStats() {
    return this.coupons.getStats();
  }

  async exportCouponsCsv() {
    const coupons = await this.prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });
    const usedByIds = [...new Set(coupons.filter((c) => c.usedById).map((c) => c.usedById!))];
    const users = usedByIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: usedByIds } }, select: { id: true, username: true } })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u.username]));

    const header = '兑换码,面值,状态,使用者,使用时间,过期时间,创建时间\n';
    const rows = coupons.map((c) => {
      const statusMap: Record<string, string> = { unused: '未使用', used: '已使用', expired: '已过期', disabled: '已禁用' };
      return [
        c.code,
        c.amount,
        statusMap[c.status] ?? c.status,
        c.usedById ? userMap.get(c.usedById) ?? '-' : '-',
        c.usedAt ? new Date(c.usedAt).toLocaleString('zh-CN') : '-',
        c.expiresAt ? new Date(c.expiresAt).toLocaleString('zh-CN') : '永久',
        new Date(c.createdAt).toLocaleString('zh-CN'),
      ].join(',');
    });
    return header + rows.join('\n');
  }

  async generateCoupons(adminId: number, dto: GenerateCouponDto) {
    const result = await this.coupons.generateCoupons(dto.amount, dto.count, dto.expiresAt ? new Date(dto.expiresAt) : undefined);

    await this.prisma.adminOperation.create({
      data: {
        adminId,
        action: 'coupon_generate',
        delta: dto.amount,
        reason: `count=${dto.count}`,
      },
    });

    return result;
  }
}
