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
import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
} from 'docx';
import { PrismaService } from '../prisma/prisma.service';
import { EvolinkTextService } from './evolink-text.service';
import { WordOutlineDto, CreateWordDto } from './word.dto';
import { MAX_WORKS_PER_USER } from './works.service';

const COST_PER_SECTION = 10;

@Injectable()
export class WordService {
  private readonly logger = new Logger(WordService.name);
  private readonly uploadDir: string;

  constructor(
    private prisma: PrismaService,
    private evolinkText: EvolinkTextService,
    private config: ConfigService,
  ) {
    this.uploadDir = this.config.get<string>('UPLOAD_DIR', './uploads');
    fs.mkdirSync(path.join(this.uploadDir, 'documents'), { recursive: true });
  }

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

  /** 免费生成章节大纲 */
  async generateOutline(dto: WordOutlineDto) {
    const sections = await this.evolinkText.generateWordOutline(dto.prompt, dto.style, {
      customStyle: dto.customStyle,
      category: dto.category,
      customCategory: dto.customCategory,
      language: dto.language,
      detailLevel: dto.detailLevel,
      pageCount: dto.sectionCount,
    });
    return { sections };
  }

  /** 创建 Word Work + sections（不预扣费） */
  async createWork(userId: number, dto: CreateWordDto) {
    await this.assertWorkLimit(userId);
    const work = await this.prisma.work.create({
      data: {
        userId,
        type: 'word',
        title: dto.prompt.slice(0, 50),
        prompt: dto.prompt,
        style: dto.style,
        mode: 'fast',
        category: dto.category ?? 'business',
        language: dto.language ?? 'zh',
        detailLevel: dto.detailLevel ?? 'standard',
        aspectRatio: '1:1',
        pageCount: dto.sections.length,
        status: 'processing',
        slides: {
          create: dto.sections.map((s, i) => ({
            idx: i,
            title: s.title,
            content: s.summary,
            status: 'pending',
          })),
        },
      },
      include: { slides: { orderBy: { idx: 'asc' } } },
    });
    return { workId: work.id, sections: work.slides };
  }

  /** 生成单章节正文（扣 10 积分） */
  async generateSection(userId: number, workId: number, sectionIdx: number) {
    const work = await this.prisma.work.findFirst({
      where: { id: workId, userId },
      include: { slides: { orderBy: { idx: 'asc' } } },
    });
    if (!work) throw new NotFoundException('作品不存在');
    if (work.type !== 'word') throw new BadRequestException('该作品不是 Word 文档');

    const slide = work.slides.find((s) => s.idx === sectionIdx);
    if (!slide) throw new NotFoundException('章节不存在');

    if (slide.status === 'processing') {
      throw new BadRequestException('该章节正在生成中，请稍候');
    }

    // 积分检查
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('用户不存在');
    if (!this.isTestUser(userId) && user.balance < COST_PER_SECTION) {
      throw new BadRequestException(`积分不足，生成单章节需 ${COST_PER_SECTION} 积分`);
    }

    // 扣费
    if (!this.isTestUser(userId)) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { balance: { decrement: COST_PER_SECTION } },
      });
    }

    // 标记生成中
    await this.prisma.slide.update({
      where: { id: slide.id },
      data: { status: 'processing', error: null },
    });

    try {
      // 收集已完成的上下文章节
      const prevSections = work.slides
        .filter((s) => s.idx < sectionIdx)
        .map((s) => ({ title: s.title, content: s.content }));

      const body = await this.evolinkText.generateWordSection(
        work.prompt,
        slide.title,
        slide.content,
        prevSections,
        work.style,
        { language: work.language, detailLevel: work.detailLevel },
      );

      await this.prisma.slide.update({
        where: { id: slide.id },
        data: { content: body, status: 'completed' },
      });

      // 更新 Work 进度
      const completedCount = work.slides.filter((s) => s.idx !== sectionIdx && s.status === 'completed').length + 1;
      const totalCount = work.slides.length;
      const progress = Math.round((completedCount / totalCount) * 100);
      const allDone = completedCount >= totalCount;
      await this.prisma.work.update({
        where: { id: workId },
        data: { progress, status: allDone ? 'completed' : 'processing' },
      });

      return { sectionIdx, content: body, status: 'completed', progress };
    } catch (err) {
      // 退还积分
      if (!this.isTestUser(userId)) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { balance: { increment: COST_PER_SECTION } },
        });
      }
      await this.prisma.slide.update({
        where: { id: slide.id },
        data: { status: 'failed', error: (err as Error).message },
      });
      this.logger.error(`Word section generation failed: workId=${workId} sectionIdx=${sectionIdx}: ${(err as Error).message}`);
      throw new BadRequestException(`章节生成失败：${(err as Error).message}`);
    }
  }

  /** 获取 Word Work + 所有章节 */
  async getWork(userId: number, workId: number) {
    const work = await this.prisma.work.findFirst({
      where: { id: workId, userId },
      include: { slides: { orderBy: { idx: 'asc' } } },
    });
    if (!work) throw new NotFoundException('作品不存在');
    if (work.type !== 'word') throw new BadRequestException('该作品不是 Word 文档');
    return {
      workId: work.id,
      title: work.title,
      prompt: work.prompt,
      style: work.style,
      status: work.status,
      progress: work.progress,
      documentUrl: work.documentUrl,
      sections: work.slides.map((s) => ({
        idx: s.idx,
        title: s.title,
        content: s.content,
        status: s.status,
        error: s.error,
      })),
    };
  }

  /** 导出 .docx */
  async exportDocx(userId: number, workId: number): Promise<string> {
    const work = await this.prisma.work.findFirst({
      where: { id: workId, userId },
      include: { slides: { orderBy: { idx: 'asc' } } },
    });
    if (!work) throw new NotFoundException('作品不存在');
    if (work.type !== 'word') throw new BadRequestException('该作品不是 Word 文档');

    const completed = work.slides.filter((s) => s.status === 'completed');
    if (completed.length === 0) {
      throw new BadRequestException('尚无已生成的章节，无法导出');
    }

    const docChildren: (Paragraph)[] = [];

    // 文档标题
    docChildren.push(
      new Paragraph({
        heading: HeadingLevel.TITLE,
        children: [new TextRun({ text: work.title, bold: true })],
      }),
    );
    docChildren.push(new Paragraph({ text: '' }));

    for (const slide of completed) {
      const paragraphs = this.markdownToDocxParagraphs(slide.content);
      docChildren.push(...paragraphs);
    }

    const doc = new Document({
      sections: [{ properties: {}, children: docChildren }],
    });

    const buffer = await Packer.toBuffer(doc);
    const filename = `word-${workId}-${Date.now()}.docx`;
    const filepath = path.join(this.uploadDir, 'documents', filename);
    fs.writeFileSync(filepath, buffer);

    const documentUrl = `/uploads/documents/${filename}`;
    await this.prisma.work.update({
      where: { id: workId },
      data: { documentUrl },
    });

    return documentUrl;
  }

  /** 简易 markdown → docx 段落转换 */
  private markdownToDocxParagraphs(markdown: string): Paragraph[] {
    const lines = markdown.split('\n');
    const paragraphs: Paragraph[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        paragraphs.push(new Paragraph({ text: '' }));
        continue;
      }

      // ## 标题
      if (trimmed.startsWith('## ')) {
        paragraphs.push(new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: trimmed.slice(3), bold: true })],
        }));
        continue;
      }
      if (trimmed.startsWith('### ')) {
        paragraphs.push(new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [new TextRun({ text: trimmed.slice(4), bold: true })],
        }));
        continue;
      }
      if (trimmed.startsWith('# ')) {
        paragraphs.push(new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun({ text: trimmed.slice(2), bold: true })],
        }));
        continue;
      }

      // 无序列表
      if (/^[-*]\s+/.test(trimmed)) {
        paragraphs.push(new Paragraph({
          bullet: { level: 0 },
          children: [new TextRun({ text: trimmed.replace(/^[-*]\s+/, '') })],
        }));
        continue;
      }

      // 有序列表
      if (/^\d+\.\s+/.test(trimmed)) {
        paragraphs.push(new Paragraph({
          numbering: { reference: 'default-numbering', level: 0 },
          children: [new TextRun({ text: trimmed.replace(/^\d+\.\s+/, '') })],
        }));
        continue;
      }

      // 普通段落
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: trimmed })],
      }));
    }

    return paragraphs;
  }

  /** 删除 Word 作品 */
  async delete(userId: number, workId: number) {
    const work = await this.prisma.work.findFirst({ where: { id: workId, userId } });
    if (!work) throw new NotFoundException('作品不存在');
    if (work.type !== 'word') throw new BadRequestException('该作品不是 Word 文档');

    await this.prisma.work.delete({ where: { id: workId } });
    return { success: true };
  }
}
