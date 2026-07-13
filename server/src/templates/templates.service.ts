import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  async list() {
    const items = await this.prisma.template.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return { items };
  }
}
