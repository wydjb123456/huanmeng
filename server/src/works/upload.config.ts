import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const pdfUploadConfig = {
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req: any, file: any, cb: any) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new BadRequestException('仅支持 PDF 文件'), false);
    }
  },
};

export const wordUploadConfig = {
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req: any, file: any, cb: any) => {
    const allowedMimetype = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (file.mimetype === allowedMimetype || file.originalname?.toLowerCase().endsWith('.docx')) {
      cb(null, true);
    } else {
      cb(new BadRequestException('仅支持 .docx 文件'), false);
    }
  },
};

export const imageUploadConfig = {
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req: any, file: any, cb: any) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestException('仅支持 JPG/PNG/WEBP 图片'), false);
    }
  },
};

export function toPublicUrl(relativePath: string, configService: ConfigService): string {
  if (relativePath.startsWith('http')) return relativePath;
  const baseUrl = configService.get<string>(
    'PUBLIC_BASE_URL',
    `http://localhost:${configService.get<number>('PORT', 3000)}`,
  );
  return `${baseUrl}${relativePath}`;
}
