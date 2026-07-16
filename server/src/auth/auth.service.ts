import { Injectable, ConflictException, UnauthorizedException, BadRequestException, HttpException, HttpStatus, ServiceUnavailableException, Logger } from '@nestjs/common';
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
    try {
      // 查该 email 最近一条未消费的 code
      const codeRecord = await this.prisma.emailVerificationCode.findFirst({
        where: { email: dto.email, consumed: false },
        orderBy: { createdAt: 'desc' },
      });
      if (!codeRecord) {
        throw new BadRequestException('请先获取验证码');
      }

      // 5 分钟过期检查
      const isCodeExpired = codeRecord.expiresAt.getTime() < Date.now();
      if (isCodeExpired) {
        await this.prisma.emailVerificationCode.update({
          where: { id: codeRecord.id },
          data: { consumed: true },
        });
        throw new BadRequestException('验证码已过期，请重新获取');
      }

      // 5 次错误检查
      if (codeRecord.attempts >= MAX_ATTEMPTS) {
        await this.prisma.emailVerificationCode.update({
          where: { id: codeRecord.id },
          data: { consumed: true },
        });
        throw new BadRequestException('错误次数过多，请重新获取验证码');
      }

      // 验证 code
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

      // 验证通过 → 标记消费 + 创建用户（事务）
      const hashed = await bcrypt.hash(dto.password, 10);

      const user = await this.prisma.$transaction(async (tx) => {
        // 1. 检查用户名和邮箱是否已存在 (原子操作)
        const usernameExists = await tx.user.findUnique({ where: { username: dto.username } });
        if (usernameExists) {
          throw new ConflictException('用户名已存在');
        }

        const emailExists = await tx.user.findUnique({ where: { email: dto.email } });
        if (emailExists) {
          throw new ConflictException('该邮箱已被注册');
        }

        // 处理邀请逻辑
        let invitedById: number | null = null;
        let initialBalance = 50; // 注册默认送 50

        if (dto.inviteCode) {
          const inviter = await tx.user.findUnique({ where: { inviteCode: dto.inviteCode } });
          if (inviter) {
            invitedById = inviter.id;
            initialBalance += 20; // 填写邀请码额外送 20 积分

            // 给邀请人发放奖励
            await tx.user.update({
              where: { id: inviter.id },
              data: { balance: { increment: 50 } }
            });

            await tx.pointHistory.create({
              data: {
                userId: inviter.id,
                amount: 50,
                reason: 'invite_reward',
                description: `邀请新用户 ${dto.username} 奖励`
              }
            });
          } else {
            throw new BadRequestException('邀请码无效');
          }
        }

        // 重试生成唯一邀请码（最多 3 次）
        let userInviteCode = crypto.randomBytes(4).toString('hex');
        let inviteCodeExists = await tx.user.findUnique({ where: { inviteCode: userInviteCode } });
        let retryCount = 1;

        while (inviteCodeExists && retryCount < 3) {
          userInviteCode = crypto.randomBytes(4).toString('hex');
          inviteCodeExists = await tx.user.findUnique({ where: { inviteCode: userInviteCode } });
          retryCount++;
        }

        if (inviteCodeExists) {
          throw new HttpException('服务器繁忙，请稍后重试', HttpStatus.SERVICE_UNAVAILABLE);
        }

        await tx.emailVerificationCode.update({
          where: { id: codeRecord.id },
          data: { consumed: true },
        });

        const newUser = await tx.user.create({
          data: {
            username: dto.username,
            email: dto.email,
            password: hashed,
            balance: initialBalance,
            inviteCode: userInviteCode,
            invitedById,
          },
        });

        // 记录新用户的初始积分
        await tx.pointHistory.create({
          data: {
            userId: newUser.id,
            amount: initialBalance,
            reason: 'register_reward',
            description: invitedById ? '注册并填写邀请码奖励' : '注册奖励'
          }
        });

        return newUser;
      });

      return this.issueToken(user.id, user.username, user.balance, user.role);
    } catch (error) {
      // 重新抛出已知的异常类型
      if (error instanceof HttpException) {
        throw error;
      }
      // 记录未知错误并抛出通用异常
      Logger.error('注册过程中发生错误', error.stack, 'AuthService');
      throw new HttpException('注册失败，请稍后重试', HttpStatus.INTERNAL_SERVER_ERROR);
    }
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
