import { Injectable, ConflictException, UnauthorizedException, BadRequestException, HttpException, HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { MailService } from './mail.service';
import { RegisterDto, LoginDto, SendCodeDto, ChangePasswordDto } from './dto';

const CODE_EXPIRY_MS = 5 * 60 * 1000; // 5 分钟
const CODE_RESEND_MS = 60 * 1000; // 60 秒
const MAX_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private mail: MailService,
  ) {}

  async sendCode(dto: SendCodeDto, ip?: string) {
    // 1. 检查 email 是否已被注册
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) throw new ConflictException('该邮箱已被注册');

    // 2. 60s 频率限制：查最近一条
    const recent = await this.prisma.emailVerificationCode.findFirst({
      where: { email: dto.email },
      orderBy: { createdAt: 'desc' },
    });
    if (recent && Date.now() - recent.createdAt.getTime() < CODE_RESEND_MS) {
      const wait = Math.ceil((CODE_RESEND_MS - (Date.now() - recent.createdAt.getTime())) / 1000);
      throw new HttpException(`请 ${wait} 秒后再试`, HttpStatus.TOO_MANY_REQUESTS);
    }

    // 3. 生成 6 位验证码
    const code = String(crypto.randomInt(100000, 999999));
    const codeHash = await bcrypt.hash(code, 10);

    // 4. 存 DB
    await this.prisma.emailVerificationCode.create({
      data: {
        email: dto.email,
        codeHash,
        ip,
        expiresAt: new Date(Date.now() + CODE_EXPIRY_MS),
      },
    });

    // 5. 发邮件
    try {
      await this.mail.sendVerificationCode(dto.email, code);
      // 开发模式下打印验证码到日志（生产模式不打印）
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV] Verification code for ${dto.email}: ${code}`);
      }
    } catch (e) {
      if (e instanceof ServiceUnavailableException) {
        throw new ServiceUnavailableException('邮件服务暂不可用，请稍后重试');
      }
      throw e;
    }

    return { success: true };
  }

  async register(dto: RegisterDto) {
    // 1. 检查用户名是否已存在
    const exists = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (exists) throw new ConflictException('用户名已存在');

    // 2. 检查 email 是否已注册
    const emailExists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (emailExists) throw new ConflictException('该邮箱已被注册');

    // 3. 查该 email 最近一条未消费的 code
    const codeRecord = await this.prisma.emailVerificationCode.findFirst({
      where: { email: dto.email, consumed: false },
      orderBy: { createdAt: 'desc' },
    });
    if (!codeRecord) throw new BadRequestException('请先获取验证码');

    // 4. 5 分钟过期检查
    if (codeRecord.expiresAt.getTime() < Date.now()) {
      await this.prisma.emailVerificationCode.update({
        where: { id: codeRecord.id },
        data: { consumed: true },
      });
      throw new BadRequestException('验证码已过期，请重新获取');
    }

    // 5. 5 次错误检查
    if (codeRecord.attempts >= MAX_ATTEMPTS) {
      await this.prisma.emailVerificationCode.update({
        where: { id: codeRecord.id },
        data: { consumed: true },
      });
      throw new BadRequestException('错误次数过多，请重新获取验证码');
    }

    // 6. 验证 code
    const codeValid = await bcrypt.compare(dto.code, codeRecord.codeHash);
    if (!codeValid) {
      const newAttempts = codeRecord.attempts + 1;
      await this.prisma.emailVerificationCode.update({
        where: { id: codeRecord.id },
        data: {
          attempts: newAttempts,
          consumed: newAttempts >= MAX_ATTEMPTS,
        },
      });
      const remaining = MAX_ATTEMPTS - newAttempts;
      throw new BadRequestException(`验证码错误${remaining > 0 ? `，剩余 ${remaining} 次机会` : '，请重新获取'}`);
    }

    // 7. 验证通过 → 标记消费 + 创建用户（事务）
    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.$transaction(async (tx) => {
      await tx.emailVerificationCode.update({
        where: { id: codeRecord.id },
        data: { consumed: true },
      });
      return tx.user.create({
        data: {
          username: dto.username,
          email: dto.email,
          password: hashed,
          balance: 50, // 注册送 50 积分
        },
      });
    });

    return this.issueToken(user.id, user.username, user.balance, user.role);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (!user) throw new UnauthorizedException('用户名或密码错误');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('用户名或密码错误');

    return this.issueToken(user.id, user.username, user.balance, user.role);
  }

  async getUserById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, balance: true, role: true },
    });
    if (!user) throw new UnauthorizedException('用户不存在');
    // 测试账号（id=1）积分无限
    if (id === 1) {
      return { ...user, balance: 999999 };
    }
    return user;
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('用户不存在');

    const valid = await bcrypt.compare(dto.oldPassword, user.password);
    if (!valid) throw new UnauthorizedException('原密码错误');

    if (dto.oldPassword === dto.newPassword) {
      throw new BadRequestException('新密码不能与原密码相同');
    }

    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    return { success: true };
  }

  async resetPassword(username: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) throw new UnauthorizedException('用户不存在');

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { username },
      data: { password: hashed },
    });

    return { success: true };
  }

  private issueToken(id: number, username: string, balance: number, role: Role) {
    const token = this.jwt.sign({ sub: id, username, role });
    // 测试账号（id=1）积分无限
    const displayBalance = id === 1 ? 999999 : balance;
    return { token, user: { id, username, balance: displayBalance, role } };
  }
}
