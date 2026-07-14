import { Controller, Get, Post, UseGuards, Request } from '@nestjs/common';
import { RewardsService } from './rewards.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('rewards')
@UseGuards(JwtAuthGuard)
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  @Get('status')
  async getStatus(@Request() req: any) {
    return this.rewardsService.getStatus(req.user.userId);
  }

  @Post('check-in')
  async checkIn(@Request() req: any) {
    return this.rewardsService.checkIn(req.user.userId);
  }
}
