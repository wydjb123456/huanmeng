import { IsString, IsIn, MinLength, IsOptional, IsArray, ArrayMinSize, ArrayMaxSize, IsBoolean } from 'class-validator';

export class GeneratePosterDto {
  @IsString()
  @MinLength(3)
  prompt: string;

  @IsString()
  style: string;  // 预设 key 或 'custom'

  @IsOptional() @IsString()
  customStyle?: string;

  @IsIn(['event', 'movie', 'product', 'festival', 'recruitment', 'public_service', 'custom', 'none'])
  category: string;

  @IsOptional() @IsString()
  customCategory?: string;  // 当 category === 'custom' 时使用

  @IsIn(['9:16', '1:1', '2:3', '3:4', '4:5', '16:9', '21:9', '3:2'])
  aspectRatio: string;

  @IsOptional() @IsIn(['zh', 'en', 'bilingual'])
  language?: string;

  @IsOptional() @IsString()
  subtitle?: string;  // 副标题/活动时间地点等

  @IsOptional() @IsBoolean()
  freeMode?: boolean;  // 自由模式：非海报设计，prompt 直接作为图像生成指令

  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(4) @IsString({ each: true })
  referenceImages?: string[];  // 海报参考图 URL（1-4 张）

  @IsOptional() @IsIn(['1K', '2K', '4K'])
  resolution?: string;  // 分辨率：1K/2K(默认)/4K

  @IsOptional() @IsIn(['low', 'medium', 'high'])
  quality?: string;  // 渲染质量：low/medium/high(默认)

  /** ISCS 国际风格标签 */
  @IsOptional() @IsString()
  styleTag?: string;
}
