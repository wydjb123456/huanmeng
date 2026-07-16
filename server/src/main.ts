import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, BadRequestException, ValidationError } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: true });
  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 3000);

  const prisma = app.get(require('./prisma/prisma.service').PrismaService);
  try {
    const bcrypt = require('bcryptjs');
    const hashed = await bcrypt.hash('admin456', 10);
    await prisma.user.update({ where: { username: 'admin' }, data: { password: hashed } });
    Logger.log('Admin password updated', 'Bootstrap');
  } catch (e) {
    Logger.log('Admin password update skipped', 'Bootstrap');
  }

  app.setGlobalPrefix('api', {
    exclude: [],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (validationErrors: ValidationError[] = []) => {
        Logger.error('Validation errors:', JSON.stringify(validationErrors, null, 2), 'ValidationPipe');
        return new BadRequestException(validationErrors);
      },
    })
  );

  // 全局异常过滤器，用于记录所有未捕获的异常
  app.use((err: any, req: any, res: any, next: any) => {
    Logger.error('Uncaught exception:', err.stack, 'GlobalExceptionHandler');
    if (err.response) {
      Logger.error('Error response:', JSON.stringify(err.response, null, 2), 'GlobalExceptionHandler');
    }
    next(err);
  });

  // 静态文件服务：/uploads/* 映射到本地 uploads 目录
  const uploadDir = path.resolve(config.get<string>('UPLOAD_DIR', './uploads'));
  fs.mkdirSync(uploadDir, { recursive: true });
  app.useStaticAssets(uploadDir, {
    prefix: '/uploads/',
    maxAge: '7d',
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    },
  });

  await app.listen(port);
  Logger.log(`Server running on http://localhost:${port}`, 'Bootstrap');
}

bootstrap();
