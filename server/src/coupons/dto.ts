import { IsString, IsNumber, IsDateString, IsOptional, Min, Max } from 'class-validator';

export class RedeemDto {
  @IsString()
  code: string;
}

export class GenerateCouponsDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsNumber()
  @Min(1)
  @Max(100)
  count: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
