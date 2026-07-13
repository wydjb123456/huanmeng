import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Res, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { AdminService } from './admin.service';
import { AdjustBalanceDto, GenerateCouponDto, BatchCouponDto, ChangeUserPasswordDto } from './dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private admin: AdminService) {}

  @Get('stats')
  stats() {
    return this.admin.getStats();
  }

  @Get('users')
  listUsers(
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('size') size?: string,
  ) {
    return this.admin.listUsers(q, page ? Number(page) : 1, size ? Number(size) : 20);
  }

  @Patch('users/:id/balance')
  adjustBalance(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdjustBalanceDto,
  ) {
    return this.admin.adjustBalance(req.user.userId, id, dto);
  }

  @Patch('users/:id/password')
  changeUserPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeUserPasswordDto,
  ) {
    return this.admin.changeUserPassword(id, dto);
  }

  @Get('users/:id/operations')
  userOperations(@Param('id', ParseIntPipe) id: number) {
    return this.admin.getUserOperations(id);
  }

  @Get('works')
  listWorks(
    @Query('page') page?: string,
    @Query('size') size?: string,
    @Query('userId') userId?: string,
  ) {
    return this.admin.listWorks(
      page ? Number(page) : 1,
      size ? Number(size) : 20,
      userId ? Number(userId) : undefined,
    );
  }

  @Get('coupons')
  listCoupons(
    @Query('status') status?: string,
    @Query('code') code?: string,
  ) {
    return this.admin.listCoupons(status, code);
  }

  @Post('coupons')
  generateCoupons(@Request() req: any, @Body() dto: GenerateCouponDto) {
    return this.admin.generateCoupons(req.user.userId, dto);
  }

  @Patch('coupons/batch')
  batchUpdateCoupons(@Body() dto: BatchCouponDto) {
    return this.admin.batchUpdateCoupons(dto);
  }

  @Delete('coupons/:id')
  deleteCoupon(@Param('id', ParseIntPipe) id: number) {
    return this.admin.deleteCoupon(id);
  }

  @Get('coupons/stats')
  couponStats() {
    return this.admin.getCouponStats();
  }

  @Get('coupons/export')
  async exportCoupons(@Res() res: Response) {
    const csv = await this.admin.exportCouponsCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=coupons.csv');
    res.send('\ufeff' + csv);
  }
}
