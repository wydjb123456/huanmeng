import request from './request';

export interface RedeemResult {
  amount: number;
  newBalance: number;
}

export const couponsApi = {
  redeem: (code: string) =>
    request.post('/coupons/redeem', { code }) as unknown as Promise<RedeemResult>,
};
