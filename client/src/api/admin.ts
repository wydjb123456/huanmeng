import request from './request';

export interface AdminStats {
  userCount: number;
  workCount: number;
  todayNewUsers: number;
  completedWorks: number;
  worksByStatus: { status: string; count: number }[];
}

export interface AdminUser {
  id: number;
  username: string;
  balance: number;
  role: 'USER' | 'ADMIN';
  createdAt: string;
  workCount: number;
}

export interface AdminOperation {
  id: number;
  adminId: number;
  adminUsername: string;
  targetUserId: number | null;
  action: string;
  delta: number | null;
  reason: string | null;
  createdAt: string;
}

export interface AdminWork {
  id: number;
  type: string;
  status: string;
  progress: number;
  pageCount: number;
  createdAt: string;
  title: string | null;
  user: { username: string };
}

export interface AdminCoupon {
  id: number;
  code: string;
  amount: number;
  status: string;
  usedById: number | null;
  usedByUsername: string | null;
  usedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface CouponStats {
  total: number;
  totalAmount: number;
  unused: number;
  used: number;
  expired: number;
  disabled: number;
}

export const adminApi = {
  stats: () => request.get('/admin/stats') as unknown as Promise<AdminStats>,
  listUsers: (q?: string, page = 1, size = 20) =>
    request.get('/admin/users', { params: { q, page, size } }) as unknown as Promise<{ total: number; page: number; size: number; items: AdminUser[] }>,
  adjustBalance: (userId: number, delta: number, reason?: string) =>
    request.patch(`/admin/users/${userId}/balance`, { delta, reason }) as unknown as Promise<{ userId: number; newBalance: number; delta: number }>,
  changePassword: (userId: number, newPassword: string) =>
    request.patch(`/admin/users/${userId}/password`, { newPassword }) as unknown as Promise<{ success: boolean }>,
  userOperations: (userId: number) =>
    request.get(`/admin/users/${userId}/operations`) as unknown as Promise<AdminOperation[]>,
  listWorks: (page = 1, size = 20, userId?: number) =>
    request.get('/admin/works', { params: { page, size, userId } }) as unknown as Promise<{ total: number; page: number; size: number; items: AdminWork[] }>,
  listCoupons: (status?: string, code?: string) =>
    request.get('/admin/coupons', { params: { status, code } }) as unknown as Promise<AdminCoupon[]>,
  generateCoupons: (amount: number, count: number, expiresAt?: string) =>
    request.post('/admin/coupons', { amount, count, expiresAt }) as unknown as Promise<{ codes: string[]; count: number }>,
  batchUpdateCoupons: (ids: number[], action: 'disable' | 'enable') =>
    request.patch('/admin/coupons/batch', { ids, action }) as unknown as Promise<{ updated: number; action: string }>,
  deleteCoupon: (id: number) =>
    request.delete(`/admin/coupons/${id}`) as unknown as Promise<{ id: number }>,
  couponStats: () =>
    request.get('/admin/coupons/stats') as unknown as Promise<CouponStats>,
  exportCoupons: () =>
    request.get('/admin/coupons/export', { responseType: 'blob' }) as unknown as Promise<Blob>,
    
  // Announcements
  getAnnouncements: () => request.get('/announcements/admin') as unknown as Promise<any[]>,
  createAnnouncement: (data: { title: string; content: string; isActive?: boolean }) => request.post('/announcements/admin', data),
  updateAnnouncement: (id: number, data: { title?: string; content?: string; isActive?: boolean }) => request.put(`/announcements/admin/${id}`, data),
  deleteAnnouncement: (id: number) => request.delete(`/announcements/admin/${id}`),
  getActiveAnnouncement: () => request.get('/announcements/active') as unknown as Promise<any>,
};
