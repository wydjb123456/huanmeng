import { Controller, Post, Get, Body, Query, UseGuards, Request } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CouponsService } from './coupons.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { RedeemDto, GenerateCouponsDto } from './dto';

@Controller('coupons')
export class CouponsController {
  constructor(private coupons: CouponsService) {}

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('redeem')
  redeem(@Request() req: any, @Body() dto: RedeemDto) {
    return this.coupons.redeem(req.user.userId, dto.code);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('list')
  list() {
    return this.coupons.listAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('generate')
  generate(@Body() dto: GenerateCouponsDto) {
    return this.coupons.generateCoupons(dto.amount, dto.count, dto.expiresAt ? new Date(dto.expiresAt) : undefined);
  }
}
