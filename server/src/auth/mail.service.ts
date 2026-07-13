import { Injectable, ServiceUnavailableException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private config: ConfigService) {
    const host = this.config.get<string>('MAIL_HOST');
    const port = this.config.get<number>('MAIL_PORT');
    const user = this.config.get<string>('MAIL_USER');
    const pass = this.config.get<string>('MAIL_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: port ?? 465,
        secure: (port ?? 465) === 465,
        auth: { user, pass },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000,
      });
      this.logger.log(`Mail transporter configured: ${host}:${port} as ${user}`);
    } else {
      this.logger.warn('Mail service not configured: missing MAIL_* env vars');
    }
  }

  async sendVerificationCode(email: string, code: string): Promise<void> {
    if (!this.transporter) {
      throw new ServiceUnavailableException('邮件服务未配置');
    }

    const from = this.config.get<string>('MAIL_USER');
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #fafaf8;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #1a1a1a; font-size: 28px; margin: 0; font-weight: 300; letter-spacing: 0.1em;">幻梦</h1>
          <p style="color: #9ca3af; font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; margin-top: 4px;">Studio</p>
        </div>
        <div style="background: white; border: 1px solid #e5e7eb; padding: 32px;">
          <p style="color: #4b5563; font-size: 14px; margin: 0 0 24px;">您正在注册幻梦账号，验证码为：</p>
          <div style="text-align: center; padding: 24px; background: #f3f4f6; margin: 24px 0;">
            <span style="font-size: 36px; font-weight: 600; color: #1a1a1a; letter-spacing: 0.3em; font-family: 'Courier New', monospace;">${code}</span>
          </div>
          <p style="color: #6b7280; font-size: 13px; margin: 16px 0 0;">验证码 5 分钟内有效，请勿告知他人。</p>
        </div>
        <p style="color: #9ca3af; font-size: 11px; text-align: center; margin-top: 24px;">如非本人操作，请忽略此邮件</p>
      </div>
    `;

    try {
      const info = await this.transporter.sendMail({
        from: `"幻梦 Studio" <${from}>`,
        to: email,
        subject: '幻梦 - 注册验证码',
        html,
      });
      this.logger.log(`Mail sent to ${email}: ${info.messageId}`);
    } catch (e) {
      this.logger.error(`Mail send failed to ${email}: ${(e as Error).message}`);
      throw new ServiceUnavailableException(`邮件发送失败：${(e as Error).message}`);
    }
  }
}
