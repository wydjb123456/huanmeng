import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as path from 'node:path';
import * as fs from 'node:fs';
import sharp from 'sharp';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  /**
   * 提取 PDF 每页为 PNG 图片
   * @param pdfBuffer PDF 文件 Buffer
   * @param outputDir 输出目录
   * @param baseName 文件名前缀
   * @returns 页面信息数组
   */
  async extractPages(
    pdfBuffer: Buffer,
    outputDir: string,
    baseName: string,
  ): Promise<{ idx: number; imageUrl: string; width: number; height: number }[]> {
    fs.mkdirSync(outputDir, { recursive: true });

    let pdfjs: any;
    try {
      pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs' as any);
    } catch {
      try {
        pdfjs = await import('pdfjs-dist/build/pdf.mjs' as any);
      } catch {
        throw new BadRequestException('PDF 解析库加载失败');
      }
    }

    try {
      pdfjs.GlobalWorkerOptions.workerSrc = require.resolve(
        'pdfjs-dist/legacy/build/pdf.worker.mjs',
      );
    } catch {
      this.logger.warn('无法定位 pdf.worker.mjs，使用 fake worker');
    }

    const { createCanvas } = await import('@napi-rs/canvas');

    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(pdfBuffer),
      isEvalSupported: false,
      useWorkerFetch: false,
    });

    const pdf = await loadingTask.promise;
    const pages: { idx: number; imageUrl: string; width: number; height: number }[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      const context = canvas.getContext('2d');

      await page.render({
        canvasContext: context,
        viewport,
        canvas,
      }).promise;

      const pngBuffer = canvas.toBuffer('image/png');

      const optimized = await sharp(pngBuffer)
        .resize({ width: 1920, withoutEnlargement: true })
        .png({ quality: 85 })
        .toBuffer();

      const filename = `${baseName}-${i - 1}.png`;
      fs.writeFileSync(path.join(outputDir, filename), optimized);

      pages.push({
        idx: i - 1,
        imageUrl: `/uploads/references/${filename}`,
        width: viewport.width,
        height: viewport.height,
      });

      this.logger.log(`PDF 第 ${i} 页提取完成: ${filename}`);
    }

    return pages;
  }
}
