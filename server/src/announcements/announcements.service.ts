import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAnnouncementDto, UpdateAnnouncementDto } from './dto';

@Injectable()
export class AnnouncementsService {
  constructor(private prisma: PrismaService) {}

  async getActiveAnnouncement() {
    // 获取最新的一条激活状态的公告
    return this.prisma.announcement.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllAnnouncements() {
    return this.prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAnnouncement(dto: CreateAnnouncementDto) {
    return this.prisma.announcement.create({
      data: dto,
    });
  }

  async updateAnnouncement(id: number, dto: UpdateAnnouncementDto) {
    const exists = await this.prisma.announcement.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('公告不存在');

    return this.prisma.announcement.update({
      where: { id },
      data: dto,
    });
  }

  async deleteAnnouncement(id: number) {
    const exists = await this.prisma.announcement.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('公告不存在');

    await this.prisma.announcement.delete({ where: { id } });
    return { success: true };
  }
}
