import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes, createHash } from 'node:crypto';
import { OrderStatus } from '@prisma/client';
import * as https from 'node:https';

// 套餐配置
const PACKAGES = {
  'trial': { points: 50, price: 500 },    // 5元
  'basic': { points: 200, price: 1800 },  // 18元
  'standard': { points: 500, price: 4000 }, // 40元
  'pro': { points: 1500, price: 10000 }, // 100元
  'premium': { points: 5000, price: 30000 }, // 300元
  'promo': { points: 20, price: 200 }, // 2元
};

type PackageType = keyof typeof PACKAGES;

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  // 生成订单号
  private genOrderNo(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = randomBytes(6).toString('hex').toUpperCase();
    return `HM${date}${rand}`;
  }

  // 签名验证
  private verifySign(params: Record<string, any>, appKey: string): boolean {
    const sorted = Object.keys(params)
      .filter(key => key !== 'sign' && params[key] !== '' && params[key] !== null && params[key] !== undefined)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    const sign = createHash('md5').update(`${sorted}&key=${appKey}`).digest('hex').toUpperCase();
    return sign === params.sign;
  }

  // 创建订单
  async createOrder(userId: number, packageId: string, payType: 'wechat' | 'alipay') {
    const pkg = PACKAGES[packageId as PackageType];
    if (!pkg) {
      throw new BadRequestException('套餐不存在');
    }

    const orderNo = this.genOrderNo();
    const notifyUrl = this.config.get('PAYMENT_NOTIFY_URL') || 'https://your-domain.com/api/payment/callback';
    const returnUrl = this.config.get('PAYMENT_RETURN_URL') || 'https://your-domain.com';
    const appId = this.config.get('HUPIJIAO_APP_ID');
    const appKey = this.config.get('HUPIJIAO_APP_KEY');

    if (!appId || !appKey) {
      throw new BadRequestException('支付配置未完成');
    }

    // 创建订单
    const order = await this.prisma.order.create({
      data: {
        orderNo,
        userId,
        amount: pkg.price,
        points: pkg.points,
        status: 'pending',
        payType,
      },
    });

    // 构造虎皮椒请求参数
    const params = {
      appid: appId,
      trade_order_id: orderNo,
      total_fee: pkg.price.toString(),
      title: `${pkg.points}积分充值`,
      time: Math.floor(Date.now() / 1000).toString(),
      notify_url: notifyUrl,
      return_url: returnUrl,
      type: payType === 'wechat' ? 'WX' : 'ZFB',
      wap_url: returnUrl,
      wap_name: '幻梦AI工具',
    };

    // 签名
    const sorted = Object.keys(params).sort().map(key => `${key}=${params[key]}`).join('&');
    const sign = createHash('md5').update(`${sorted}&key=${appKey}`).digest('hex').toUpperCase();

    return {
      orderNo,
      amount: pkg.price,
      points: pkg.points,
      payUrl: `https://pay.xunhupay.com/pay.html?${new URLSearchParams({ ...params, sign }).toString()}`,
    };
  }

  // 处理回调
  async handleCallback(params: any) {
    const appKey = this.config.get('HUPIJIAO_APP_KEY');

    // 验签
    if (!this.verifySign(params, appKey)) {
      this.logger.error('签名验证失败');
      return { status: 'fail', msg: '签名验证失败' };
    }

    const orderNo = params.trade_order_id;
    const tradeNo = params.transaction_id;

    const order = await this.prisma.order.findUnique({ where: { orderNo } });
    if (!order) {
      this.logger.error(`订单不存在: ${orderNo}`);
      return { status: 'fail', msg: '订单不存在' };
    }

    if (order.status === 'paid') {
      this.logger.log(`订单已处理: ${orderNo}`);
      return { status: 'success' };
    }

    // 处理支付成功
    if (params.status === 'OD') {
      await this.prisma.$transaction([
        this.prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'paid',
            tradeNo,
            paidAt: new Date(),
          },
        }),
        this.prisma.user.update({
          where: { id: order.userId },
          data: { balance: { increment: order.points } },
        }),
        this.prisma.pointHistory.create({
          data: {
            userId: order.userId,
            amount: order.points,
            reason: 'purchase',
            description: `购买${order.points}积分`,
          },
        }),
      ]);

      this.logger.log(`订单支付成功: ${orderNo}`);
    }

    return { status: 'success' };
  }

  // 查询订单
  async getOrder(orderNo: string, userId: number) {
    return this.prisma.order.findFirst({
      where: { orderNo, userId },
    });
  }

  // 获取订单列表
  async getUserOrders(userId: number) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}
