import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveResolution, resolveRenderQuality } from './quality.config';

const API_BASE = 'https://api.evolink.ai/v1';

@Injectable()
export class EvolinkService {
  private readonly logger = new Logger(EvolinkService.name);
  private readonly apiKey: string;

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get<string>('EVOLINK_API_KEY', '');
  }

  async createImageTask(
    prompt: string,
    aspectRatio: string = '16:9',
    imageUrls?: string[],
    resolution?: string,
    quality?: string,
  ): Promise<{ taskId: string; estimatedTime: number; creditsReserved: number }> {
    const resolutionVal = resolveResolution(resolution || '4K');
    const qualityVal = resolveRenderQuality(quality || 'high');
    const body: any = {
      model: 'gpt-image-2',
      prompt,
      size: aspectRatio,
      resolution: resolutionVal,
      quality: qualityVal,
      n: 1,
    };
    if (imageUrls && imageUrls.length > 0) {
      body.image_urls = imageUrls;
    }

    const res = await fetch(`${API_BASE}/images/generations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    if (!res.ok) {
      this.logger.error(`API 调用失败: ${res.status} ${text}`);
      throw new Error(`图片生成 API 调用失败: ${res.status}`);
    }

    const data = JSON.parse(text);
    return {
      taskId: data.id,
      estimatedTime: data.task_info?.estimated_time ?? 300,
      creditsReserved: data.usage?.credits_reserved ?? 0,
    };
  }

  async queryTask(taskId: string): Promise<{ status: string; progress: number; imageUrl?: string }> {
    const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`查询任务失败: ${res.status}`);

    const data = JSON.parse(text);
    return {
      status: data.status,
      progress: data.progress ?? 0,
      imageUrl: data.results?.[0],
    };
  }

  async downloadImage(url: string): Promise<Buffer> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`下载图片失败: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
}
