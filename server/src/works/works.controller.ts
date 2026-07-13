import { Controller, Post, Get, Delete, Patch, Body, Param, Query, UseGuards, Request, Res, UseInterceptors, UploadedFile, UploadedFiles, BadRequestException } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import * as fs from 'node:fs';
import { WorksService } from './works.service';
import { WordService } from './word.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GenerateWorkDto, OutlineRequestDto, ReorderSlidesDto } from './dto';
import { WordOutlineDto, CreateWordDto } from './word.dto';
import { GeneratePosterDto } from './poster.dto';
import { pdfUploadConfig, imageUploadConfig, wordUploadConfig } from './upload.config';
import { ConfigService } from '@nestjs/config';
import { EvolinkTextService } from './evolink-text.service';
import { StyleEngineService } from './iscs/style-engine.service';
import { MAX_WORKS_PER_USER } from './works.service';
import * as path from 'node:path';

@Controller('works')
@UseGuards(JwtAuthGuard)
export class WorksController {
  constructor(
    private works: WorksService,
    private wordService: WordService,
    private evolinkText: EvolinkTextService,
    private config: ConfigService,
    private styleEngine: StyleEngineService,
  ) {}

  /** 免费生成大纲 */
  @Post('outline')
  generateOutline(@Body() dto: OutlineRequestDto) {
    return this.works.generateOutline(dto);
  }

  /** 提示词优化（免费） */
  @Post('prompt/enhance')
  enhancePrompt(@Body() body: { input: string; type: 'ppt' | 'poster' }) {
    return this.works.enhancePrompt(body.input, body.type);
  }

  /** 提示词库（静态） */
  @Get('prompt-library')
  promptLibrary() {
    return this.works.getPromptLibrary();
  }

  /** ISCS 国际风格列表 */
  @Get('styles')
  listStyles() {
    return { styles: this.styleEngine.listVariants() };
  }

  /** 费用预览 */
  @Get('cost')
  previewCost(
    @Query('mode') mode: string,
    @Query('slideCount') slideCount: string,
    @Query('type') type: string,
    @Query('resolution') resolution: string,
    @Query('quality') quality: string,
  ) {
    if (type === 'poster') {
      return { cost: this.works.previewPosterCost(resolution, quality) };
    }
    return { cost: this.works.previewCost(mode ?? 'fine', Number(slideCount) || 0, resolution, quality) };
  }

  /** PDF 上传并提取页面 */
  @Post('upload/pdf')
  @UseInterceptors(FileInterceptor('file', pdfUploadConfig))
  uploadPdf(@Request() req: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('请上传 PDF 文件');
    return this.works.extractPdfPages(req.user.userId, file.buffer);
  }

  /** Word 文档上传并提取大纲 */
  @Post('upload/word')
  @UseInterceptors(FileInterceptor('file', wordUploadConfig))
  uploadWord(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: {
      style?: string;
      language?: string;
      detailLevel?: string;
      pageCount?: string;
      category?: string;
      customCategory?: string;
      customStyle?: string;
    },
  ) {
    if (!file) throw new BadRequestException('请上传 Word 文件');
    const pageCount = body.pageCount ? Number(body.pageCount) : undefined;
    return this.works.extractWordOutline(req.user.userId, file.buffer, body.style ?? 'none', {
      language: body.language,
      detailLevel: body.detailLevel,
      pageCount,
      category: body.category,
      customCategory: body.customCategory,
      customStyle: body.customStyle,
    });
  }

  /** 参考图上传（海报用） */
  @Post('upload/reference')
  @UseInterceptors(FilesInterceptor('files', 4, imageUploadConfig))
  uploadReference(@Request() req: any, @UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('请上传至少 1 张图片');
    }
    return this.works.saveReferenceImages(req.user.userId, files);
  }

  /** 海报生成 */
  @Post('poster')
  generatePoster(@Request() req: any, @Body() dto: GeneratePosterDto) {
    return this.works.generatePoster(req.user.userId, dto);
  }

  @Post('generate')
  generate(@Request() req: any, @Body() dto: GenerateWorkDto) {
    return this.works.generate(req.user.userId, dto);
  }

  @Get()
  list(@Request() req: any, @Query('type') type?: string) {
    return this.works.listByUser(req.user.userId, type);
  }

  /** 作品存储配额信息 */
  @Get('quota')
  async quota(@Request() req: any) {
    const count = await this.works.countByUser(req.user.userId);
    return { current: count, max: MAX_WORKS_PER_USER };
  }

  @Get(':id/status')
  status(@Request() req: any, @Param('id') id: string) {
    return this.works.getStatus(req.user.userId, Number(id));
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.works.delete(req.user.userId, Number(id));
  }

  @Get(':id/download')
  download(@Request() req: any, @Param('id') id: string, @Res() res: Response) {
    return this.works.getStatus(req.user.userId, Number(id)).then(() => {
      const pdfPath = this.works.getPdfPath(Number(id));
      if (!fs.existsSync(pdfPath)) {
        res.status(404).json({ message: '文件不存在' });
        return;
      }
      res.download(pdfPath, `presentation-${id}.pdf`);
    });
  }

  /** 单页重生成 */
  @Post(':id/slides/:slideId/regenerate')
  regenerateSlide(
    @Request() req: any,
    @Param('id') id: string,
    @Param('slideId') slideId: string,
  ) {
    return this.works.regenerateSlide(req.user.userId, Number(id), Number(slideId));
  }

  /** 重排页面 */
  @Patch(':id/slides/reorder')
  reorderSlides(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: ReorderSlidesDto,
  ) {
    return this.works.reorderSlides(req.user.userId, Number(id), dto);
  }

  /** 删除单页 */
  @Delete(':id/slides/:slideId')
  deleteSlide(
    @Request() req: any,
    @Param('id') id: string,
    @Param('slideId') slideId: string,
  ) {
    return this.works.deleteSlide(req.user.userId, Number(id), Number(slideId));
  }

  // ===== Word 文档生成 =====

  /** 免费生成 Word 章节大纲 */
  @Post('word/outline')
  wordOutline(@Body() dto: WordOutlineDto) {
    return this.wordService.generateOutline(dto);
  }

  /** 创建 Word 作品 + sections */
  @Post('word/create')
  wordCreate(@Request() req: any, @Body() dto: CreateWordDto) {
    return this.wordService.createWork(req.user.userId, dto);
  }

  /** 获取 Word 作品详情 */
  @Get('word/:id')
  wordGet(@Request() req: any, @Param('id') id: string) {
    return this.wordService.getWork(req.user.userId, Number(id));
  }

  /** 生成单章节正文 */
  @Post('word/:id/sections/:idx/generate')
  wordGenerateSection(
    @Request() req: any,
    @Param('id') id: string,
    @Param('idx') idx: string,
  ) {
    return this.wordService.generateSection(req.user.userId, Number(id), Number(idx));
  }

  /** 重生成单章节 */
  @Post('word/:id/sections/:idx/regenerate')
  wordRegenerateSection(
    @Request() req: any,
    @Param('id') id: string,
    @Param('idx') idx: string,
  ) {
    return this.wordService.generateSection(req.user.userId, Number(id), Number(idx));
  }

  /** 导出并下载 .docx */
  @Get('word/:id/download')
  async wordDownload(@Request() req: any, @Param('id') id: string, @Res() res: Response) {
    const documentUrl = await this.wordService.exportDocx(req.user.userId, Number(id));
    const uploadDir = this.config.get<string>('UPLOAD_DIR', './uploads');
    const filePath = path.join(uploadDir, documentUrl.replace('/uploads/', ''));
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ message: '文件不存在' });
      return;
    }
    res.download(filePath, `document-${id}.docx`);
  }

  // ===== 图片反推风格提示词 =====

  /** 上传图片并反推风格描述 */
  @Post('prompt/reverse')
  @UseInterceptors(FileInterceptor('file', imageUploadConfig))
  async reverseStyle(@Request() req: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('请上传图片');

    // 直接用 buffer 转 base64 发给 vision API，无需公开 URL
    const style = await this.evolinkText.reverseStyleFromImage(file.buffer, file.mimetype);
    return { style };
  }
}
