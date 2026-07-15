import { IsString, IsIn, MinLength, IsArray, ValidateNested, ArrayMinSize, ArrayMaxSize, IsInt, Min, Max, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class GenerateWorkDto {
  @IsString()
  @MinLength(5)
  prompt: string;

  @IsString()
  style: string;  // 预设 key 或 'custom'

  @IsOptional() @IsString()
  customStyle?: string;  // 当 style === 'custom' 时使用

  @IsIn(['fast', 'fine'])
  mode: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(15)
  @ValidateNested({ each: true })
  @Type(() => OutlineSlideDto)
  outline: OutlineSlideDto[];

  @IsOptional() @IsIn(['business', 'academic', 'product', 'education', 'marketing', 'personal', 'custom', 'none'])
  category?: string;

  @IsOptional() @IsString()
  customCategory?: string;  // 当 category === 'custom' 时使用

  @IsOptional() @IsIn(['zh', 'en', 'bilingual'])
  language?: string;

  @IsOptional() @IsIn(['brief', 'standard', 'detailed'])
  detailLevel?: string;

  @IsOptional() @IsIn(['16:9', '4:3', '16:10', '9:16', '9:21'])
  aspectRatio?: string;

  @IsOptional() @IsBoolean()
  pdfImport?: boolean;

  @IsOptional() @IsArray() @ArrayMaxSize(15) @IsString({ each: true })
  referenceImages?: string[];

  @IsOptional() @IsIn(['1K', '2K', '4K'])
  resolution?: string;

  @IsOptional() @IsIn(['low', 'medium', 'high'])
  quality?: string;

  /** ISCS 国际风格标签,如 EAS-JP-MIN-01,支持融合标签 A+B */
  @IsOptional() @IsString()
  styleTag?: string;
}

export class OutlineSlideDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(8)
  @IsString({ each: true })
  points: string[];
}

export class OutlineRequestDto {
  @IsString()
  @MinLength(5)
  prompt: string;

  @IsString()
  style: string;  // 预设 key 或 'custom'

  @IsOptional() @IsString()
  customStyle?: string;

  @IsOptional() @IsIn(['business', 'academic', 'product', 'education', 'marketing', 'personal', 'custom', 'none'])
  category?: string;

  @IsOptional() @IsString()
  customCategory?: string;

  @IsOptional() @IsIn(['zh', 'en', 'bilingual'])
  language?: string;

  @IsOptional() @IsIn(['brief', 'standard', 'detailed'])
  detailLevel?: string;

  @IsOptional() @IsInt() @Min(2) @Max(15)
  pageCount?: number;

  /** ISCS 国际风格标签 — 影响叙事结构 */
  @IsOptional() @IsString()
  styleTag?: string;
}

export class ReorderSlidesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  order: number[];
}
