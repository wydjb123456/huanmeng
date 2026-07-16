import { Controller, Post, Get, Body, Request, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentService } from './payment.service';
import { CreateOrderDto } from './dto';

@Controller('payment')
export class PaymentController {
  constructor(private payment: PaymentService) {}

  @Post('order')
  @UseGuards(JwtAuthGuard)
  async createOrder(@Request() req: any, @Body() dto: CreateOrderDto) {
    return this.payment.createOrder(req.user.userId, dto.packageId, dto.payType);
  }

  @Post('callback')
  async handleCallback(@Body() body: any) {
    return this.payment.handleCallback(body);
  }

  @Get('order/:orderNo')
  @UseGuards(JwtAuthGuard)
  async getOrder(@Request() req: any, @Query('orderNo') orderNo: string) {
    return this.payment.getOrder(orderNo, req.user.userId);
  }

  @Get('orders')
  @UseGuards(JwtAuthGuard)
  async getUserOrders(@Request() req: any) {
    return this.payment.getUserOrders(req.user.userId);
  }
}
