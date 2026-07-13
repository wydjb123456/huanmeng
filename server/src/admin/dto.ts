import { IsInt, IsString, IsOptional, Min, IsArray } from 'class-validator';

export class AdjustBalanceDto {
  @IsInt()
  delta: number;  // 正数充值，负数扣减

  @IsOptional() @IsString()
  reason?: string;
}

export class GenerateCouponDto {
  @IsInt() @Min(1)
  amount: number;

  @IsInt() @Min(1)
  count: number;

  @IsOptional() @IsString()
  expiresAt?: string;
}

export class BatchCouponDto {
  @IsArray()
  @IsInt({ each: true })
  ids: number[];

  @IsString()
  action: 'disable' | 'enable';
}
