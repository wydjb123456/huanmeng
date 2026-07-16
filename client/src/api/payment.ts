import { request } from './request';

export interface CreateOrderParams {
  packageId: string;
  payType: 'wechat' | 'alipay';
}

export interface CreateOrderResult {
  orderNo: string;
  amount: number;
  points: number;
  payUrl: string;
}

export interface Order {
  id: number;
  orderNo: string;
  amount: number;
  points: number;
  status: string;
  payType?: string;
  tradeNo?: string;
  paidAt?: string;
  createdAt: string;
}

export const paymentApi = {
  createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    return request.post('/payment/order', params);
  },
  getOrder(orderNo: string): Promise<Order> {
    return request.get('/payment/order', { params: { orderNo } });
  },
  getOrders(): Promise<Order[]> {
    return request.get('/payment/orders');
  },
};
