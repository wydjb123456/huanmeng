import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class CreateAnnouncementDto {
  @IsString()
  @IsNotEmpty({ message: '公告标题不能为空' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: '公告内容不能为空' })
  content: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateAnnouncementDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
