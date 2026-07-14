import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class RewardsService {
  constructor(private prisma: PrismaService) {}

  private getTodayDateString(): string {
    // 获取 YYYY-MM-DD 格式，这里简单处理，假设是本地时区或者 UTC 时区都行
    // 为避免时区问题，可以用北京时间
    const d = new Date();
    d.setHours(d.getHours() + 8); // 简单的转东八区
    return d.toISOString().split('T')[0];
  }

  async getStatus(userId: number) {
    const today = this.getTodayDateString();
    
    // 查询今日是否签到
    const checkIn = await this.prisma.dailyCheckIn.findUnique({
      where: {
        userId_dateString: {
          userId,
          dateString: today,
        }
      }
    });

    // 获取用户信息（余额、邀请码）
    let user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true, inviteCode: true, id: true }
    });

    // 如果用户没有邀请码（老用户），给他们生成一个
    if (user && !user.inviteCode) {
      const newCode = crypto.randomBytes(4).toString('hex');
      user = await this.prisma.user.update({
        where: { id: userId },
        data: { inviteCode: newCode },
        select: { balance: true, inviteCode: true, id: true }
      });
    }

    // 统计邀请人数
    const inviteCount = await this.prisma.user.count({
      where: { invitedById: userId }
    });

    return {
      todayCheckedIn: !!checkIn,
      balance: user?.balance || 0,
      inviteCode: user?.inviteCode,
      inviteCount,
    };
  }

  async checkIn(userId: number) {
    const today = this.getTodayDateString();
    const points = 10; // 每天签到固定送 10 积分（可按需修改成递增等逻辑）

    return await this.prisma.$transaction(async (tx) => {
      const existing = await tx.dailyCheckIn.findUnique({
        where: {
          userId_dateString: {
            userId,
            dateString: today,
          }
        }
      });

      if (existing) {
        throw new BadRequestException('今日已签到');
      }

      await tx.dailyCheckIn.create({
        data: {
          userId,
          dateString: today,
          points,
        }
      });

      await tx.user.update({
        where: { id: userId },
        data: { balance: { increment: points } }
      });

      await tx.pointHistory.create({
        data: {
          userId,
          amount: points,
          reason: 'check_in',
          description: '每日签到奖励'
        }
      });

      return { success: true, points };
    });
  }
}
