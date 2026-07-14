import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { CreateAnnouncementDto, UpdateAnnouncementDto } from './dto';

@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  // 公共接口：获取当前活跃的最新公告
  @Get('active')
  getActiveAnnouncement() {
    return this.announcementsService.getActiveAnnouncement();
  }

  // 以下为 Admin 接口
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin')
  getAllAnnouncements() {
    return this.announcementsService.getAllAnnouncements();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('admin')
  createAnnouncement(@Body() dto: CreateAnnouncementDto) {
    return this.announcementsService.createAnnouncement(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Put('admin/:id')
  updateAnnouncement(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAnnouncementDto,
  ) {
    return this.announcementsService.updateAnnouncement(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('admin/:id')
  deleteAnnouncement(@Param('id', ParseIntPipe) id: number) {
    return this.announcementsService.deleteAnnouncement(id);
  }
}
