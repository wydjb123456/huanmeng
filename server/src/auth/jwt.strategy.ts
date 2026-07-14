import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('JWT_SECRET', 'dev_secret_change_me'),
    });
  }

  validate(payload: any) {
    // 兼容旧版 token 可能使用 payload.id 而非 payload.sub 的情况
    return { userId: payload.sub || payload.id, username: payload.username, role: payload.role };
  }
}
