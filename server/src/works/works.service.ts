import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'node:path';
import * as fs from 'node:fs';
import sharp from 'sharp';
import * as mammoth from 'mammoth';
import { PDFDocument } from 'pdf-lib';
import { PrismaService } from '../prisma/prisma.service';
import { EvolinkService } from './evolink.service';
import { EvolinkTextService } from './evolink-text.service';
import { PdfService } from './pdf.service';
import { GenerateWorkDto, OutlineRequestDto, ReorderSlidesDto } from './dto';
import { GeneratePosterDto } from './poster.dto';
import { PROMPT_LIBRARY } from './prompt-library';
import { toPublicUrl } from './upload.config';
import { posterCost, pptFastCost, pptCostPerSlide, resolveResolution, resolveRenderQuality } from './quality.config';
import { StyleEngineService } from './iscs/style-engine.service';
import { TabooGuardService } from './iscs/taboo-guard.service';

const COST_FAST = 50;
const COST_FINE_PER_SLIDE = 30;

/** 单用户可保存的作品数量上限，超过需删除旧作品 */
export const MAX_WORKS_PER_USER = 20;

@Injectable()
export class WorksService {
  private readonly logger = new Logger(WorksService.name);
  private readonly uploadDir: string;

  /** 测试账号（id=1）积分无限：跳过余额检查、扣费、退款 */
  private isTestUser(userId: number): boolean {
    return userId === 1;
  }

  /** 检查用户作品数量是否已达上限 */
  private async assertWorkLimit(userId: number) {
    const count = await this.prisma.work.count({ where: { userId } });
    if (count >= MAX_WORKS_PER_USER) {
      throw new BadRequestException(
        `作品数量已达上限（${MAX_WORKS_PER_USER} 个），请删除旧作品后再生成`,
      );
    }
  }

  constructor(
    private prisma: PrismaService,
    private evolink: EvolinkService,
    private evolinkText: EvolinkTextService,
    private pdfService: PdfService,
    private config: ConfigService,
    private styleEngine: StyleEngineService,
    private tabooGuard: TabooGuardService,
  ) {
    this.uploadDir = this.config.get<string>('UPLOAD_DIR', './uploads');
    fs.mkdirSync(this.uploadDir, { recursive: true });
    fs.mkdirSync(path.join(this.uploadDir, 'thumbnails'), { recursive: true });
    fs.mkdirSync(path.join(this.uploadDir, 'panels'), { recursive: true });
    fs.mkdirSync(path.join(this.uploadDir, 'pdfs'), { recursive: true });
    fs.mkdirSync(path.join(this.uploadDir, 'slides'), { recursive: true });
    fs.mkdirSync(path.join(this.uploadDir, 'references'), { recursive: true });
  }

  /** 免费生成大纲 */
  async generateOutline(dto: OutlineRequestDto) {
    const slides = await this.evolinkText.generateOutline(dto.prompt, dto.style, {
      category: dto.category,
      customCategory: dto.customCategory,
      language: dto.language,
      detailLevel: dto.detailLevel,
      pageCount: dto.pageCount,
      styleTag: dto.styleTag,
    });
    return { slides };
  }

  /** 提示词优化（免费） */
  async enhancePrompt(input: string, type: 'ppt' | 'poster') {
    if (!input || input.trim().length < 3) {
      throw new BadRequestException('请输入更详细的描述');
    }
    return this.evolinkText.enhancePrompt(input, type);
  }

  /** 内置提示词库（静态） */
  getPromptLibrary() {
    return PROMPT_LIBRARY;
  }

  /** 费用预览 */
  previewCost(mode: string, slideCount: number, resolution?: string, quality?: string) {
    const res = resolveResolution(resolution);
    const q = resolveRenderQuality(quality);
    if (mode === 'fast') return pptFastCost(res, q);
    return pptCostPerSlide(res, q) * Math.max(2, Math.min(15, slideCount));
  }

  /** 海报费用预览：按分辨率 + 渲染质量双维度 */
  previewPosterCost(resolution?: string, quality?: string) {
    const res = resolveResolution(resolution);
    const q = resolveRenderQuality(quality);
    return posterCost(res, q);
  }

  /** PDF 上传后提取每页为 PNG */
  async extractPdfPages(userId: number, pdfBuffer: Buffer) {
    const baseName = `pdf-${userId}-${Date.now()}`;
    const outputDir = path.join(this.uploadDir, 'references');
    const pages = await this.pdfService.extractPages(pdfBuffer, outputDir, baseName);

    // 超过 15 页截断到前 15 页
    const truncated = pages.length > 15;
    const used = truncated ? pages.slice(0, 15) : pages;

    return {
      pageCount: used.length,
      truncated,
      originalCount: pages.length,
      pages: used.map((p) => ({
        idx: p.idx,
        imageUrl: p.imageUrl,
        title: `第 ${p.idx + 1} 页`,
      })),
    };
  }

  /** Word 文档上传后提取文本 → LLM 重构为幻灯片大纲 */
  async extractWordOutline(
    userId: number,
    fileBuffer: Buffer,
    style: string,
    opts?: {
      language?: string;
      detailLevel?: string;
      pageCount?: number;
      category?: string;
      customCategory?: string;
      customStyle?: string;
    },
  ) {
    let text: string;
    try {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      text = result.value || '';
    } catch {
      throw new BadRequestException('无法解析 Word 文档，请确认文件格式正确');
    }

    if (text.trim().length < 10) {
      throw new BadRequestException('Word 文档内容为空，无法提取');
    }

    // 超长文本截断到 8000 字（控制 token 消耗）
    const MAX_CHARS = 8000;
    const textTruncated = text.length > MAX_CHARS;
    if (textTruncated) text = text.slice(0, MAX_CHARS);

    const slides = await this.evolinkText.generateOutlineFromDocument(text, style, {
      language: opts?.language ?? 'zh',
      detailLevel: opts?.detailLevel ?? 'standard',
      pageCount: opts?.pageCount ?? 9,
      category: opts?.category,
      customCategory: opts?.customCategory,
      customStyle: opts?.customStyle,
    });

    // 超过 15 页截断到前 15 页
    const truncated = slides.length > 15;
    const used = truncated ? slides.slice(0, 15) : slides;

    return {
      slideCount: used.length,
      truncated,
      originalCount: slides.length,
      textTruncated,
      slides: used.map((s, i) => ({ idx: i, title: s.title, points: s.points })),
    };
  }

  /** 保存用户上传的参考图 */
  async saveReferenceImages(userId: number, files: Express.Multer.File[]) {
    const baseName = `ref-${userId}-${Date.now()}`;
    const refsDir = path.join(this.uploadDir, 'references');
    const urls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = (file.mimetype.split('/')[1] || 'png').replace('jpeg', 'jpg');
      const filename = `${baseName}-${i}.${ext}`;
      const filepath = path.join(refsDir, filename);

      await sharp(file.buffer)
        .resize({ width: 1920, withoutEnlargement: true })
        .png({ quality: 85 })
        .toFile(filepath);

      urls.push(`/uploads/references/${filename}`);
    }

    return { urls };
  }

  /** 海报生成：单张图 */
  async generatePoster(userId: number, dto: GeneratePosterDto) {
    await this.assertWorkLimit(userId);
    const resolution = resolveResolution(dto.resolution);
    const quality = resolveRenderQuality(dto.quality);
    const cost = posterCost(resolution, quality);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('用户不存在');
    if (!this.isTestUser(userId) && user.balance < cost) {
      throw new BadRequestException(`积分不足，海报需消耗 ${cost} 积分`);
    }

    if (!this.isTestUser(userId)) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { balance: { decrement: cost } },
      });
    }

    // 海报只有 1 个 slide
    const referenceImagesJson =
      dto.referenceImages && dto.referenceImages.length > 0
        ? JSON.stringify(dto.referenceImages)
        : null;

    const work = await this.prisma.work.create({
      data: {
        userId,
        type: 'poster',
        title: dto.prompt.slice(0, 50),
        prompt: dto.prompt,
        style: dto.style,
        mode: 'fine',
        category: dto.category,
        language: dto.language ?? 'zh',
        detailLevel: 'standard',
        aspectRatio: dto.aspectRatio,
        pageCount: 1,
        status: 'processing',
        referenceImages: referenceImagesJson,
        resolution,
        quality,
        styleTag: dto.styleTag ?? null,
        slides: {
          create: [{
            idx: 0,
            title: dto.prompt.slice(0, 50),
            content: dto.subtitle || '',
            status: 'pending',
          }],
        },
      },
      include: { slides: true },
    });

    this.processPoster(work.id, userId, dto).catch((err) =>
      this.logger.error(`poster failed workId=${work.id}: ${err.message}`),
    );

    return { workId: work.id, cost };
  }

  private async processPoster(workId: number, userId: number, dto: GeneratePosterDto) {
    try {
      const slides = await this.prisma.slide.findMany({ where: { workId } });
      await this.prisma.slide.updateMany({
        where: { workId },
        data: { status: 'processing' },
      });

      const prompt = this.buildPosterPrompt(dto);
      const imageUrls =
        dto.referenceImages && dto.referenceImages.length > 0
          ? dto.referenceImages.map((url) => toPublicUrl(url, this.config))
          : undefined;
      const { taskId } = await this.evolink.createImageTask(prompt, dto.aspectRatio, imageUrls, dto.resolution, dto.quality);
      await this.prisma.work.update({ where: { id: workId }, data: { taskId } });

      const result = await this.pollTask(taskId, workId);
      if (!result.imageUrl) throw new Error('未获取到图片');

      const imgBuf = await this.evolink.downloadImage(result.imageUrl);
      const outPath = path.join(this.uploadDir, 'slides', `${workId}-0.png`);
      fs.writeFileSync(outPath, imgBuf);

      const imageUrl = `/uploads/slides/${workId}-0.png`;
      await this.prisma.slide.update({
        where: { id: slides[0].id },
        data: { status: 'completed', imageUrl },
      });

      // 缩略图
      const thumbPath = path.join(this.uploadDir, 'thumbnails', `${workId}.png`);
      await sharp(imgBuf).resize(600).png().toFile(thumbPath);

      await this.prisma.work.update({
        where: { id: workId },
        data: {
          status: 'completed',
          progress: 100,
          previewUrl: `/uploads/thumbnails/${workId}.png`,
        },
      });
      this.logger.log(`poster workId=${workId} 完成`);
    } catch (err: any) {
      this.logger.error(`poster failed workId=${workId}: ${err.message}`);
      const failedWork = await this.prisma.work.findUnique({ where: { id: workId }, select: { resolution: true, quality: true } });
      const refundCost = posterCost(resolveResolution(failedWork?.resolution), resolveRenderQuality(failedWork?.quality));
      await this.failWork(workId, userId, err.message, refundCost);
    }
  }

  /** 海报 prompt：突出视觉冲击力，或自由模式直接出图 */
  private buildPosterPrompt(dto: GeneratePosterDto): string {
    const iscsVisual = this.styleEngine.buildVisualPrompt(dto.styleTag);
    const iscsBlock = iscsVisual ? `\nInternational Cultural Design DNA:\n${iscsVisual}\n` : '';
    if (dto.freeMode) {
      // 自由模式：用户描述任意图像需求，不套海报结构
      const styleDesc = this.styleDesc(dto.style, dto.customStyle);
      const ratioHint = this.ratioHint(dto.aspectRatio);
      const langHint = dto.language === 'en' ? 'English' : dto.language === 'bilingual' ? 'Chinese with English elements' : 'Simplified Chinese';
      return `Generate a single ${dto.aspectRatio} image based on the user's description. ${ratioHint}

User request: ${dto.prompt}
${dto.subtitle ? `Additional context: ${dto.subtitle}` : ''}
Text language (if any text): ${langHint}
${styleDesc ? `Style guidance: ${styleDesc}` : ''}
${iscsBlock}
Requirements:
- The output is a single finished image, no panels, no grids, no slides
- Follow the user's request literally — do not force poster conventions (title hierarchy, CTA, etc.) unless requested
- High visual quality, appropriate composition and lighting`;
    }

    const styleDesc = this.styleDesc(dto.style, dto.customStyle);
    const ratioHint = this.ratioHint(dto.aspectRatio);
    const langHint = dto.language === 'en' ? 'English' : dto.language === 'bilingual' ? 'Chinese title with English subtitle' : 'Simplified Chinese';
    const categoryHint = this.posterCategoryHint(dto.category, dto.customCategory);

    return `Generate a single high-impact ${dto.aspectRatio} poster. ${ratioHint}

Type: ${categoryHint}
Main title: ${dto.prompt}
${dto.subtitle ? `Subtitle/info: ${dto.subtitle}` : ''}
Text language: ${langHint}
${styleDesc ? `Visual style: ${styleDesc}` : ''}
${iscsBlock}
CRITICAL design requirements:
- Bold, eye-catching typography with the main title prominently displayed
- Strong visual hierarchy: title > subtitle > details
- Single focal point, no clutter
- Professional composition with appropriate negative space
- The entire image IS the poster — no panels, no grids, no slides
- Make sure all text is readable and well-placed
- This is a finished poster, ready to print or share`;
  }

  private ratioHint(ratio: string): string {
    const map: Record<string, string> = {
      '9:16': 'Vertical portrait orientation (taller than wide) — for mobile screens, stories, digital signage',
      '1:1': 'Square format — for Instagram feed, social media',
      '2:3': 'A4 portrait proportion — for printed posters',
      '3:4': 'Portrait format — for presentations and digital displays',
      '4:5': 'Instagram portrait (taller than square) — for Instagram feed portrait posts',
      '16:9': 'Horizontal widescreen 16:9 — for YouTube covers, event banners, presentation-style posters',
      '21:9': 'Ultra-wide horizontal banner — for cinematic banners, website headers, digital signage',
      '3:2': 'Horizontal landscape — for printed flyers, brochures, landscape posters',
    };
    return map[ratio] ?? '';
  }

  private posterCategoryHint(category: string, customCategory?: string): string {
    if (category === 'custom' && customCategory) {
      return `Custom poster (自定义: ${customCategory}) — adapt the design to fit the user's described purpose`;
    }
    if (category === 'none') {
      return 'General poster — no specific type constraint, adapt to the title and subtitle';
    }
    const map: Record<string, string> = {
      event: 'Event poster (活动宣传) — promote an event with date, time, location',
      movie: 'Movie/show poster (电影演出) — cinematic, dramatic, title-focused',
      product: 'Product poster (产品推广) — highlight a product with brand identity',
      festival: 'Festival poster (节日祝福) — celebratory, warm, themed',
      recruitment: 'Recruitment poster (招聘) — job posting with role and requirements',
      public_service: 'Public service poster (公益) — awareness campaign with message',
    };
    return map[category] ?? map.event;
  }

  async generate(userId: number, dto: GenerateWorkDto) {
    await this.assertWorkLimit(userId);
    const slideCount = dto.outline.length;
    const resolution = resolveResolution(dto.resolution);
    const quality = resolveRenderQuality(dto.quality);
    const cost = this.previewCost(dto.mode, slideCount, resolution, quality);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('用户不存在');
    if (!this.isTestUser(userId) && user.balance < cost) {
      throw new BadRequestException(`积分不足，本次需消耗 ${cost} 积分`);
    }

    // PDF 导入强制精细模式
    if (dto.pdfImport && dto.mode !== 'fine') {
      throw new BadRequestException('PDF 导入仅支持精细模式');
    }

    // 扣费
    if (!this.isTestUser(userId)) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { balance: { decrement: cost } },
      });
    }

    // 创建 Work + Slides
    const work = await this.prisma.work.create({
      data: {
        userId,
        title: dto.prompt.slice(0, 50),
        prompt: dto.prompt,
        style: dto.style,
        mode: dto.mode,
        category: dto.category ?? 'business',
        language: dto.language ?? 'zh',
        detailLevel: dto.detailLevel ?? 'standard',
        aspectRatio: dto.aspectRatio ?? '16:9',
        pageCount: slideCount,
        resolution,
        quality,
        styleTag: dto.styleTag ?? null,
        status: 'processing',
        slides: {
          create: dto.outline.map((s, i) => ({
            idx: i,
            title: s.title,
            content: s.points.join('\n'),
            status: 'pending',
            referenceImage: dto.pdfImport && dto.referenceImages ? (dto.referenceImages[i] ?? null) : null,
          })),
        },
      },
      include: { slides: { orderBy: { idx: 'asc' } } },
    });

    if (dto.mode === 'fast') {
      this.processFastMode(work.id, userId, dto, resolution, quality).catch((err) =>
        this.logger.error(`fast mode failed workId=${work.id}: ${err.message}`),
      );
    } else {
      this.processFineMode(work.id, userId, dto, resolution, quality).catch((err) =>
        this.logger.error(`fine mode failed workId=${work.id}: ${err.message}`),
      );
    }

    return { workId: work.id, mode: dto.mode, cost };
  }

  /** 极速模式：1 张网格图 → 切 9 张 */
  private async processFastMode(workId: number, userId: number, dto: GenerateWorkDto, resolution: string, quality: string) {
    try {
      const slides = await this.prisma.slide.findMany({
        where: { workId },
        orderBy: { idx: 'asc' },
      });
      // 标记所有为 processing
      await this.prisma.slide.updateMany({
        where: { workId },
        data: { status: 'processing' },
      });

      const fullPrompt = this.buildGridPrompt(dto.prompt, dto.style, dto.customStyle, slides, dto.styleTag);
      const { taskId } = await this.evolink.createImageTask(fullPrompt, dto.aspectRatio ?? '16:9', undefined, resolution, quality);
      await this.prisma.work.update({ where: { id: workId }, data: { taskId } });

      // 轮询
      const result = await this.pollTask(taskId, workId);
      if (!result.imageUrl) throw new Error('未获取到图片');

      const imgBuf = await this.evolink.downloadImage(result.imageUrl);
      const workDir = path.join(this.uploadDir, 'panels', String(workId));
      fs.mkdirSync(workDir, { recursive: true });
      const originalPath = path.join(workDir, 'original.png');
      fs.writeFileSync(originalPath, imgBuf);

      const meta = await sharp(imgBuf).metadata();
      const cellW = Math.floor((meta.width ?? 3840) / 3);
      const cellH = Math.floor((meta.height ?? 2160) / 3);

      const panelPaths: string[] = [];
      for (let i = 0; i < slides.length; i++) {
        const row = Math.floor(i / 3);
        const col = i % 3;
        const outPath = path.join(this.uploadDir, 'slides', `${workId}-${i}.png`);
        await sharp(imgBuf)
          .extract({ left: col * cellW, top: row * cellH, width: cellW, height: cellH })
          .png()
          .toFile(outPath);
        panelPaths.push(outPath);

        await this.prisma.slide.update({
          where: { id: slides[i].id },
          data: { status: 'completed', imageUrl: `/uploads/slides/${workId}-${i}.png` },
        });
      }

      // 缩略图（取首页）
      const thumbPath = path.join(this.uploadDir, 'thumbnails', `${workId}.png`);
      await sharp(panelPaths[0]).resize(480).png().toFile(thumbPath);

      // 生成 PDF
      const pdfBuf = await this.buildPdf(panelPaths, { width: cellW, height: cellH });
      const pdfPath = path.join(this.uploadDir, 'pdfs', `${workId}.pdf`);
      fs.writeFileSync(pdfPath, pdfBuf);

      await this.prisma.work.update({
        where: { id: workId },
        data: {
          status: 'completed',
          progress: 100,
          previewUrl: `/uploads/thumbnails/${workId}.png`,
          pdfUrl: `/uploads/pdfs/${workId}.pdf`,
        },
      });
      this.logger.log(`fast mode workId=${workId} 完成`);
    } catch (err: any) {
      this.logger.error(`fast mode failed workId=${workId}: ${err.message}`);
      const work = await this.prisma.work.findUnique({ where: { id: workId }, select: { resolution: true, quality: true } });
      const refundCost = pptFastCost(resolveResolution(work?.resolution), resolveRenderQuality(work?.quality));
      await this.failWork(workId, userId, err.message, refundCost);
    }
  }

  /** 精细模式：每页单独生成，并行 */
  private async processFineMode(workId: number, userId: number, dto: GenerateWorkDto, resolution: string, quality: string) {
    try {
      const slides = await this.prisma.slide.findMany({
        where: { workId },
        orderBy: { idx: 'asc' },
      });
      await this.prisma.slide.updateMany({
        where: { workId },
        data: { status: 'processing' },
      });

      // 并行提交所有任务
      const tasks = await Promise.all(
        slides.map(async (slide) => {
          const slidePrompt = dto.pdfImport
            ? this.buildPdfSlidePrompt(slide, dto)
            : this.buildSlidePrompt(slide.title, slide.content, dto.style, dto.customStyle, dto.language, dto.detailLevel, dto.styleTag);
          const imageUrls = slide.referenceImage
            ? [toPublicUrl(slide.referenceImage, this.config)]
            : undefined;
          const { taskId } = await this.evolink.createImageTask(slidePrompt, dto.aspectRatio ?? '16:9', imageUrls, resolution, quality);
          await this.prisma.slide.update({
            where: { id: slide.id },
            data: { taskId },
          });
          return { slide, taskId };
        }),
      );

      // 并行轮询（每个 slide 独立轮询）
      const panelPaths: string[] = new Array(slides.length);
      await Promise.all(
        tasks.map(async ({ slide, taskId }) => {
          const result = await this.pollTask(taskId, workId, slide.id);
          if (!result.imageUrl) throw new Error(`slide ${slide.id} 无图片`);

          const imgBuf = await this.evolink.downloadImage(result.imageUrl);
          const outPath = path.join(this.uploadDir, 'slides', `${workId}-${slide.idx}.png`);
          fs.writeFileSync(outPath, imgBuf);
          panelPaths[slide.idx] = outPath;

          await this.prisma.slide.update({
            where: { id: slide.id },
            data: { status: 'completed', imageUrl: `/uploads/slides/${workId}-${slide.idx}.png` },
          });
        }),
      );

      // 缩略图
      const thumbPath = path.join(this.uploadDir, 'thumbnails', `${workId}.png`);
      await sharp(panelPaths[0]).resize(480).png().toFile(thumbPath);

      // PDF
      const firstBuf = fs.readFileSync(panelPaths[0]);
      const meta = await sharp(firstBuf).metadata();
      const pdfBuf = await this.buildPdf(panelPaths, {
        width: meta.width ?? 1280,
        height: meta.height ?? 720,
      });
      const pdfPath = path.join(this.uploadDir, 'pdfs', `${workId}.pdf`);
      fs.writeFileSync(pdfPath, pdfBuf);

      await this.prisma.work.update({
        where: { id: workId },
        data: {
          status: 'completed',
          progress: 100,
          previewUrl: `/uploads/thumbnails/${workId}.png`,
          pdfUrl: `/uploads/pdfs/${workId}.pdf`,
        },
      });
      this.logger.log(`fine mode workId=${workId} 完成`);
    } catch (err: any) {
      this.logger.error(`fine mode failed workId=${workId}: ${err.message}`);
      // 部分成功也算完成（已生成部分可用），失败的标记
      const failedSlides = await this.prisma.slide.findMany({
        where: { workId, status: 'processing' },
      });
      for (const s of failedSlides) {
        await this.prisma.slide.update({
          where: { id: s.id },
          data: { status: 'failed', error: err.message },
        });
      }
      const completedCount = await this.prisma.slide.count({
        where: { workId, status: 'completed' },
      });
      if (completedCount > 0) {
        // 部分成功，标记 work 为 completed
        const slides = await this.prisma.slide.findMany({
          where: { workId, status: 'completed' },
          orderBy: { idx: 'asc' },
        });
        const panelPaths = slides.map((s) => path.join(this.uploadDir, 'slides', `${workId}-${s.idx}.png`));
        const thumbPath = path.join(this.uploadDir, 'thumbnails', `${workId}.png`);
        await sharp(panelPaths[0]).resize(480).png().toFile(thumbPath);
        const firstBuf = fs.readFileSync(panelPaths[0]);
        const meta = await sharp(firstBuf).metadata();
        const pdfBuf = await this.buildPdf(panelPaths, {
          width: meta.width ?? 1280,
          height: meta.height ?? 720,
        });
        const pdfPath = path.join(this.uploadDir, 'pdfs', `${workId}.pdf`);
        fs.writeFileSync(pdfPath, pdfBuf);
        await this.prisma.work.update({
          where: { id: workId },
          data: {
            status: 'completed',
            progress: 100,
            previewUrl: `/uploads/thumbnails/${workId}.png`,
            pdfUrl: `/uploads/pdfs/${workId}.pdf`,
          },
        });
        // 退还失败页的积分
        if (!this.isTestUser(userId)) {
          const work = await this.prisma.work.findUnique({ where: { id: workId }, select: { resolution: true, quality: true } });
          const perSlideCost = pptCostPerSlide(resolveResolution(work?.resolution), resolveRenderQuality(work?.quality));
          const refund = failedSlides.length * perSlideCost;
          await this.prisma.user.update({
            where: { id: userId },
            data: { balance: { increment: refund },
            },
          });
          this.logger.log(`部分成功，退还 ${refund} 积分`);
        }
      } else {
        const work = await this.prisma.work.findUnique({ where: { id: workId }, select: { resolution: true, quality: true } });
        const perSlideCost = pptCostPerSlide(resolveResolution(work?.resolution), resolveRenderQuality(work?.quality));
        await this.failWork(workId, userId, err.message, perSlideCost * (await this.prisma.slide.count({ where: { workId } })));
      }
    }
  }

  /** 轮询单个任务 */
  private async pollTask(taskId: string, workId: number, slideId?: number): Promise<{ imageUrl?: string }> {
    const maxAttempts = 80;
    const interval = 3000;
    let lastProgress = 0;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, interval));
      try {
        const result = await this.evolink.queryTask(taskId);
        if (result.progress > lastProgress) {
          lastProgress = result.progress;
          // 更新整体进度
          if (!slideId) {
            await this.prisma.work.update({
              where: { id: workId },
              data: { progress: result.progress },
            });
          }
        }
        if (result.status === 'completed' && result.imageUrl) {
          return { imageUrl: result.imageUrl };
        }
        if (result.status === 'failed') {
          throw new Error('API 返回失败');
        }
      } catch (err: any) {
        this.logger.warn(`轮询出错 taskId=${taskId}: ${err.message}`);
      }
    }
    throw new Error('轮询超时');
  }

  /** 单页重生成 */
  async regenerateSlide(userId: number, workId: number, slideId: number) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work) throw new NotFoundException('作品不存在');
    if (work.userId !== userId) throw new ForbiddenException('无权访问');
    if (work.mode !== 'fine') {
      throw new BadRequestException('极速模式不支持单页重生成，请使用精细模式');
    }

    const slide = await this.prisma.slide.findUnique({ where: { id: slideId } });
    if (!slide || slide.workId !== workId) {
      throw new NotFoundException('页面不存在');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('用户不存在');
    const perSlideCost = pptCostPerSlide(resolveResolution(work.resolution), resolveRenderQuality(work.quality));
    if (!this.isTestUser(userId) && user.balance < perSlideCost) {
      throw new BadRequestException(`积分不足，重生成需 ${perSlideCost} 积分`);
    }

    if (!this.isTestUser(userId)) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { balance: { decrement: perSlideCost } },
      });
    }

    await this.prisma.slide.update({
      where: { id: slideId },
      data: { status: 'processing', error: null },
    });

    this.regenerateSlideInBackground(workId, userId, slideId).catch((err) =>
      this.logger.error(`regenerate failed slideId=${slideId}: ${err.message}`),
    );

    return { slideId, cost: perSlideCost };
  }

  private async regenerateSlideInBackground(workId: number, userId: number, slideId: number) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work) return;
    try {
      const slide = await this.prisma.slide.findUnique({ where: { id: slideId } });
      if (!slide) return;

      const slidePrompt = this.buildSlidePrompt(slide.title, slide.content, work.style, undefined, work.language, work.detailLevel, work.styleTag ?? undefined);
      const imageUrls = slide.referenceImage
        ? [toPublicUrl(slide.referenceImage, this.config)]
        : undefined;
      const { taskId } = await this.evolink.createImageTask(slidePrompt, work.aspectRatio ?? '16:9', imageUrls, work.resolution ?? '4K', work.quality ?? 'high');
      await this.prisma.slide.update({ where: { id: slideId }, data: { taskId } });

      const result = await this.pollTask(taskId, workId, slideId);
      if (!result.imageUrl) throw new Error('未获取到图片');

      const imgBuf = await this.evolink.downloadImage(result.imageUrl);
      const outPath = path.join(this.uploadDir, 'slides', `${workId}-${slide.idx}.png`);
      fs.writeFileSync(outPath, imgBuf);

      await this.prisma.slide.update({
        where: { id: slideId },
        data: { status: 'completed', imageUrl: `/uploads/slides/${workId}-${slide.idx}.png` },
      });

      // 重建 PDF
      await this.rebuildPdf(workId);
      this.logger.log(`slideId=${slideId} 重生成完成`);
    } catch (err: any) {
      this.logger.error(`regenerate failed slideId=${slideId}: ${err.message}`);
      await this.prisma.slide.update({
        where: { id: slideId },
        data: { status: 'failed', error: err.message },
      });
      if (!this.isTestUser(userId)) {
        const perSlideCost = pptCostPerSlide(resolveResolution(work.resolution), resolveRenderQuality(work.quality));
        await this.prisma.user.update({
          where: { id: userId },
          data: { balance: { increment: perSlideCost } },
        });
      }
    }
  }

  /** 重建 PDF（用于单页重生成后） */
  private async rebuildPdf(workId: number) {
    const slides = await this.prisma.slide.findMany({
      where: { workId, status: 'completed' },
      orderBy: { idx: 'asc' },
    });
    if (slides.length === 0) return;
    const panelPaths = slides.map((s) => path.join(this.uploadDir, 'slides', `${workId}-${s.idx}.png`));
    const firstBuf = fs.readFileSync(panelPaths[0]);
    const meta = await sharp(firstBuf).metadata();
    const pdfBuf = await this.buildPdf(panelPaths, {
      width: meta.width ?? 1280,
      height: meta.height ?? 720,
    });
    const pdfPath = path.join(this.uploadDir, 'pdfs', `${workId}.pdf`);
    fs.writeFileSync(pdfPath, pdfBuf);

    // 更新缩略图
    const thumbPath = path.join(this.uploadDir, 'thumbnails', `${workId}.png`);
    await sharp(panelPaths[0]).resize(480).png().toFile(thumbPath);
  }

  /** 重排页面 */
  async reorderSlides(userId: number, workId: number, dto: ReorderSlidesDto) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work) throw new NotFoundException('作品不存在');
    if (work.userId !== userId) throw new ForbiddenException('无权访问');

    const slides = await this.prisma.slide.findMany({ where: { workId } });
    const idSet = new Set(slides.map((s) => s.id));
    if (dto.order.length !== slides.length || !dto.order.every((id) => idSet.has(id))) {
      throw new BadRequestException('order 数组与现有页面不匹配');
    }

    // 用事务逐个更新 idx
    await this.prisma.$transaction(
      dto.order.map((slideId, idx) =>
        this.prisma.slide.update({ where: { id: slideId }, data: { idx } }),
      ),
    );

    // 重建 PDF
    await this.rebuildPdf(workId);
    return { success: true };
  }

  /** 删除单页 */
  async deleteSlide(userId: number, workId: number, slideId: number) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work) throw new NotFoundException('作品不存在');
    if (work.userId !== userId) throw new ForbiddenException('无权访问');

    const slide = await this.prisma.slide.findUnique({ where: { id: slideId } });
    if (!slide || slide.workId !== workId) throw new NotFoundException('页面不存在');

    const slideCount = await this.prisma.slide.count({ where: { workId } });
    if (slideCount <= 1) throw new BadRequestException('至少保留 1 页');

    // 删除文件
    const imgPath = path.join(this.uploadDir, 'slides', `${workId}-${slide.idx}.png`);
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);

    await this.prisma.slide.delete({ where: { id: slideId } });

    // 重新编号 idx
    const remaining = await this.prisma.slide.findMany({
      where: { workId },
      orderBy: { idx: 'asc' },
    });
    await this.prisma.$transaction(
      remaining.map((s, newIdx) =>
        this.prisma.slide.update({ where: { id: s.id }, data: { idx: newIdx } }),
      ),
    );

    // 重建 PDF
    await this.rebuildPdf(workId);
    return { success: true };
  }

  private async failWork(workId: number, userId: number, errorMsg: string, refundAmount: number) {
    await this.prisma.work.update({
      where: { id: workId },
      data: { status: 'failed', error: errorMsg },
    });
    await this.prisma.slide.updateMany({
      where: { workId, status: 'processing' },
      data: { status: 'failed', error: errorMsg },
    });
    if (!this.isTestUser(userId)) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { balance: { increment: refundAmount } },
      });
    }
  }

  private async buildPdf(panelPaths: string[], size: { width: number; height: number }) {
    const pdf = await PDFDocument.create();
    for (const p of panelPaths) {
      if (!fs.existsSync(p)) continue;
      const png = await pdf.embedPng(fs.readFileSync(p));
      const page = pdf.addPage([size.width, size.height]);
      page.drawImage(png, { x: 0, y: 0, width: size.width, height: size.height });
    }
    return pdf.save();
  }

  /** 极速模式：3x3 网格 prompt */
  private buildGridPrompt(topic: string, style: string, customStyle: string | undefined, slides: any[], styleTag?: string): string {
    const styleDesc = this.styleDesc(style, customStyle);
    const iscsVisual = this.styleEngine.buildVisualPrompt(styleTag);
    const slideList = slides
      .map((s, i) => `- Panel ${i + 1}: ${s.title}${s.content ? ' (' + s.content.replace(/\n/g, ', ') + ')' : ''}`)
      .join('\n');

    return `Generate a single 16:9 widescreen landscape image divided into a 3x3 grid (3 rows, 3 columns, 9 panels total). Each panel is itself in 16:9 landscape orientation. Thin white dividing lines separate the panels.

Topic: ${topic}
Style: ${styleDesc}
${iscsVisual ? `\nInternational Cultural Design DNA:\n${iscsVisual}\n` : ''}
Slide content (one per panel, in reading order):
${slideList}

CRITICAL: This is ONE 16:9 image containing 9 panels arranged in a 3x3 grid. Each panel is a complete slide with title and content. Professional typography, consistent design across all panels. Readable text in each panel.`;
  }

  /** 精细模式：单页 prompt */
  private buildSlidePrompt(title: string, content: string, style: string, customStyle: string | undefined, language?: string, detailLevel?: string, styleTag?: string): string {
    const styleDesc = this.styleDesc(style, customStyle);
    const iscsVisual = this.styleEngine.buildVisualPrompt(styleTag);
    const langHint = language === 'en' ? 'English' : language === 'bilingual' ? 'Chinese title with English subtitle, Chinese content' : 'Simplified Chinese';
    const detailHint = detailLevel === 'brief' ? 'minimal text, focus on visuals' : detailLevel === 'detailed' ? 'richer text content, include data and details' : 'balanced text and visuals';
    return `Generate a single 16:9 widescreen presentation slide.

Slide title: ${title}
Content points: ${content || 'N/A'}
Text language: ${langHint}
Detail level: ${detailHint}
Style: ${styleDesc}
${iscsVisual ? `\nInternational Cultural Design DNA:\n${iscsVisual}\n` : ''}
This is ONE complete slide with the title prominently displayed and content points listed below. Professional typography, clean layout, readable text. 16:9 landscape orientation.`;
  }

  /** PDF 导入：图生图专用 prompt，基于参考图重新设计视觉风格 */
  private buildPdfSlidePrompt(slide: any, dto: GenerateWorkDto): string {
    const styleDesc = this.styleDesc(dto.style, dto.customStyle);
    const iscsVisual = this.styleEngine.buildVisualPrompt(dto.styleTag);
    const langHint = dto.language === 'en' ? 'English' : dto.language === 'bilingual' ? 'Chinese title with English subtitle' : 'Simplified Chinese';

    return `Redesign this presentation slide based on the provided reference image.

Reference: This is slide ${slide.idx + 1} from an existing presentation.
Optimization request: ${dto.prompt}
Slide title: ${slide.title}
Text language: ${langHint}
Target visual style: ${styleDesc}
${iscsVisual ? `\nInternational Cultural Design DNA:\n${iscsVisual}\n` : ''}
CRITICAL instructions:
- Use the reference image as the BASE layout and content structure
- Keep the same information hierarchy and key content from the reference
- Apply the new visual style (${styleDesc}) to redesign the slide
- Improve typography, spacing, color harmony, and visual polish
- Ensure all text is readable and well-positioned
- Output a single 16:9 presentation slide in landscape orientation
- Do NOT simply copy the reference — enhance and modernize it`;
  }

  private styleDesc(style: string, customStyle?: string): string {
    if (style === 'custom' && customStyle && customStyle.trim()) {
      return customStyle.trim();
    }
    if (style === 'none') {
      return '';  // 无风格约束，让 AI 自由发挥
    }
    const map: Record<string, string> = {
      business: 'professional corporate, blue/white palette, formal, clean',
      minimal: 'minimalist, lots of whitespace, simple geometric shapes, monochrome',
      creative: 'vibrant, bold colors, dynamic layouts, modern illustrations',
      academic: 'formal academic, serif typography, data-driven, charts, muted palette',
    };
    return map[style] ?? map.business;
  }

  async getStatus(userId: number, workId: number) {
    const work = await this.prisma.work.findUnique({
      where: { id: workId },
      include: { slides: { orderBy: { idx: 'asc' } } },
    });
    if (!work) throw new NotFoundException('作品不存在');
    if (work.userId !== userId) throw new ForbiddenException('无权访问');
    return {
      id: work.id,
      type: work.type,
      status: work.status,
      progress: work.progress,
      mode: work.mode,
      aspectRatio: work.aspectRatio,
      previewUrl: work.previewUrl,
      pdfUrl: work.pdfUrl,
      error: work.error,
      referenceImages: work.referenceImages ? JSON.parse(work.referenceImages) : null,
      slides: work.slides.map((s) => ({
        id: s.id,
        idx: s.idx,
        title: s.title,
        content: s.content,
        status: s.status,
        imageUrl: s.imageUrl,
        error: s.error,
        referenceImage: s.referenceImage,
      })),
    };
  }

  async listByUser(userId: number, type?: string) {
    const works = await this.prisma.work.findMany({
      where: { userId, ...(type ? { type } : {}) },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { slides: true } } },
    });
    return {
      items: works.map((w) => ({
        id: w.id,
        title: w.title,
        type: w.type,
        previewUrl: w.previewUrl,
        status: w.status,
        mode: w.mode,
        aspectRatio: w.aspectRatio,
        slideCount: w._count.slides,
        createdAt: w.createdAt.toISOString(),
      })),
    };
  }

  /** 当前用户作品总数 */
  countByUser(userId: number) {
    return this.prisma.work.count({ where: { userId } });
  }

  async delete(userId: number, workId: number) {
    const work = await this.prisma.work.findUnique({ where: { id: workId } });
    if (!work) throw new NotFoundException('作品不存在');
    if (work.userId !== userId) throw new ForbiddenException('无权访问');

    const workDir = path.join(this.uploadDir, 'panels', String(workId));
    if (fs.existsSync(workDir)) fs.rmSync(workDir, { recursive: true });
    const pdfPath = path.join(this.uploadDir, 'pdfs', `${workId}.pdf`);
    if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
    const thumbPath = path.join(this.uploadDir, 'thumbnails', `${workId}.png`);
    if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
    // 删除所有 slide 图片
    const slidesDir = path.join(this.uploadDir, 'slides');
    if (fs.existsSync(slidesDir)) {
      const files = fs.readdirSync(slidesDir).filter((f) => f.startsWith(`${workId}-`));
      for (const f of files) fs.unlinkSync(path.join(slidesDir, f));
    }

    await this.prisma.work.delete({ where: { id: workId } });
    return { success: true };
  }

  getPdfPath(workId: number): string {
    return path.join(this.uploadDir, 'pdfs', `${workId}.pdf`);
  }
}
