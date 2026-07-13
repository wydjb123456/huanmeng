import { IsString, MinLength, IsOptional, IsIn, IsInt, Min, Max, IsArray, ArrayMinSize, ArrayMaxSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class WordSectionDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  summary: string;
}

export class WordOutlineDto {
  @IsString()
  @MinLength(5)
  prompt: string;

  @IsString()
  style: string;

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

  @IsOptional() @IsInt() @Min(2) @Max(20)
  sectionCount?: number;
}

export class CreateWordDto {
  @IsString()
  @MinLength(5)
  prompt: string;

  @IsString()
  style: string;

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

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => WordSectionDto)
  sections: WordSectionDto[];
}
