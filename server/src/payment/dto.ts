import { IsString, IsNumber, Min, IsIn, IsOptional } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  packageId: string;

  @IsString()
  @IsIn(['wechat', 'alipay'])
  payType: 'wechat' | 'alipay';
}

export class PaymentCallbackDto {
  [key: string]: any;
}
