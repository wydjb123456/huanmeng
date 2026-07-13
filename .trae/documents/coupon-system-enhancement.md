# 兑换码系统增强方案

## Context

项目作为 AI PPT/海报生成平台，由于没有公司主体无法接入微信/支付宝扫码支付，决定采用**兑换码（积分充值码）**作为替代付费方案。当前系统已有基础兑换码功能（后端生成/兑换 API + 管理后台列表），但存在以下不足：

1. **管理员生成体验差**：每次需手动填写面值/数量，无快捷预设
2. **用户端无兑换入口**：用户拿到兑换码后无处输入
3. **安全防护不足**：兑换接口无限流，存在被暴力枚举的风险
4. **缺少批量管理**：无法批量禁用/导出兑换码

本方案在现有基础上增强，实现「管理员一键生成 + 用户双入口兑换 + 接口限流防爆破」的完整闭环。

---

## 安全设计说明

### 关于"加密"

兑换码**不是密码**，不需要哈希存储。理由：
- 管理员需要明文查看以分发给用户（截图/复制发送）
- 兑换码是单次使用的一次性凭证，非可复用身份凭证
- 数据库已有访问控制（JWT + ADMIN 角色守卫）

当前 `randomBytes(4)` 生成 8 位十六进制码（32 位熵 = 42 亿种组合），配合接口限流后暴力枚举不可行。

### 防爆破策略：接口限流（用户选定）

在 `POST /coupons/redeem` 接口添加 `@Throttle({ default: { limit: 10, ttl: 60000 } })`：
- 每用户每分钟最多 10 次兑换尝试
- 32 位熵 + 10 次/分钟 = 平均需 8000 年才能枚举成功
- 利用项目已安装的 `@nestjs/throttler`，零额外依赖

### 现有安全机制（保持不变）

- 兑换操作使用 `$transaction` 原子事务（防并发重复兑换）✅
- `randomBytes` 使用 crypto 模块的密码学安全随机数 ✅
- 代码格式 `PPT-XXXXXXXX` 大写，输入时 `.toUpperCase()` 归一化 ✅

---

## 实施步骤

### 第一步：后端 — 兑换接口限流

**文件**: `server/src/coupons/coupons.controller.ts`

在 `redeem` 方法上添加 `@Throttle` 装饰器：
```typescript
import { Throttle } from '@nestjs/throttler';

@UseGuards(JwtAuthGuard)
@Throttle({ default: { limit: 10, ttl: 60000 } })
@Post('redeem')
redeem(@Request() req: any, @Body() dto: RedeemDto) {
  return this.coupons.redeem(req.user.userId, dto.code);
}
```

### 第二步：后端 — 管理员批量操作与统计

**文件**: `server/src/coupons/coupons.service.ts`

新增方法：
- `batchUpdateStatus(ids: number[], status: 'disabled' | 'unused')` — 批量禁用/恢复
- `deleteCoupon(id: number)` — 删除未使用的兑换码
- `getStats()` — 统计：总数/已用/未用/已过期/已禁用/总面值

**文件**: `server/src/admin/admin.service.ts`

修改 `listCoupons` 支持 `status` 和 `code` 过滤参数：
```typescript
async listCoupons(status?: string, code?: string) {
  const where = {
    ...(status ? { status } : {}),
    ...(code ? { code: { contains: code } } : {}),
  };
  // ...
}
```

新增 `exportCouponsCsv()` 返回 CSV 格式字符串。

**文件**: `server/src/admin/admin.controller.ts`

新增端点：
- `PATCH /admin/coupons/batch` — body `{ ids: number[], action: 'disable' | 'enable' }`
- `DELETE /admin/coupons/:id` — 删除未使用兑换码
- `GET /admin/coupons/stats` — 统计数据
- `GET /admin/coupons/export` — CSV 下载（设置 `text/csv` Content-Type）

**文件**: `server/src/admin/dto.ts`

新增 `BatchCouponDto`：
```typescript
export class BatchCouponDto {
  @IsArray()
  @IsInt({ each: true })
  ids: number[];

  @IsString()
  action: 'disable' | 'enable';
}
```

### 第三步：前端管理员 — 一键生成与批量管理

**文件**: `client/src/api/admin.ts`

新增 API 方法：
```typescript
batchUpdateCoupons: (ids: number[], action: 'disable' | 'enable') =>
  request.patch('/admin/coupons/batch', { ids, action }),
deleteCoupon: (id: number) =>
  request.delete(`/admin/coupons/${id}`),
couponStats: () =>
  request.get('/admin/coupons/stats') as unknown as Promise<CouponStats>,
exportCoupons: () =>
  request.get('/admin/coupons/export', { responseType: 'blob' }) as unknown as Promise<Blob>,
listCouponsWithFilter: (status?: string, code?: string) =>
  request.get('/admin/coupons', { params: { status, code } }) as unknown as Promise<AdminCoupon[]>,
```

新增 `CouponStats` 接口。

**文件**: `client/src/views/AdminView.vue`

优惠券管理 Tab 增强：

1. **统计概览卡片**（顶部 4 个）：总数、已使用、未使用、总面值
2. **预设套餐按钮**（一键生成）：
   - 「10 积分 × 10 张」按钮 → 直接调用 generate
   - 「50 积分 × 5 张」按钮
   - 「100 积分 × 3 张」按钮
   - 「自定义」按钮 → 打开现有对话框
3. **筛选工具栏**：状态下拉（全部/未使用/已使用/已过期/已禁用）+ 兑换码搜索框
4. **批量操作**：el-table 加 `@selection-change`，选中后显示「批量禁用」「批量恢复」按钮
5. **导出 CSV 按钮**：下载所有兑换码
6. **单行操作**：复制兑换码、删除（仅未使用）、禁用/恢复
7. **分页**：列表超过 100 条时显示分页

预设套餐数据：
```typescript
const couponPresets = [
  { label: '10 积分 × 10 张', amount: 10, count: 10 },
  { label: '50 积分 × 5 张', amount: 50, count: 5 },
  { label: '100 积分 × 3 张', amount: 100, count: 3 },
];
```

### 第四步：前端用户 — 兑换入口（双入口）

**文件**: `client/src/api/coupons.ts`（新建）

```typescript
import request from './request';

export const couponsApi = {
  redeem: (code: string) =>
    request.post('/coupons/redeem', { code }) as unknown as Promise<{ amount: number; newBalance: number }>,
};
```

**文件**: `client/src/layouts/MainLayout.vue`

1. **积分数字可点击**（L34-38）：
   - 给积分区域添加 `@click="openRedeemDialog"` 和 `cursor-pointer` 样式
   - 添加 hover 效果提示可点击

2. **下拉菜单新增「兑换积分」项**（L50 附近）：
   ```html
   <el-dropdown-item @click="openRedeemDialog">
     <svg>...</svg>
     兑换积分
   </el-dropdown-item>
   ```

3. **兑换对话框**：
   ```html
   <el-dialog v-model="redeemDialogVisible" title="兑换积分" width="420px">
     <el-input v-model="redeemCode" placeholder="请输入兑换码，如 PPT-XXXXXXXX" />
     <template #footer>
       <el-button @click="redeemDialogVisible = false">取消</el-button>
       <el-button type="primary" :loading="redeeming" @click="submitRedeem">兑换</el-button>
     </template>
   </el-dialog>
   ```

4. **兑换逻辑**：
   - 调用 `couponsApi.redeem(code)`
   - 成功后 `userStore.fetchUserInfo()` 刷新余额
   - `ElMessage.success(`兑换成功！获得 ${amount} 积分`)`
   - 限流错误（429）显示「操作过于频繁，请 1 分钟后再试」

**文件**: `client/src/stores/user.ts`

无需修改，`fetchUserInfo()` 已存在，兑换成功后调用即可刷新余额。

---

## 涉及文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `server/src/coupons/coupons.controller.ts` | 修改 | 添加 @Throttle |
| `server/src/coupons/coupons.service.ts` | 修改 | 新增 batchUpdateStatus/deleteCoupon/getStats |
| `server/src/admin/admin.service.ts` | 修改 | listCoupons 加过滤、新增 exportCsv |
| `server/src/admin/admin.controller.ts` | 修改 | 新增 batch/delete/stats/export 端点 |
| `server/src/admin/dto.ts` | 修改 | 新增 BatchCouponDto |
| `client/src/api/admin.ts` | 修改 | 新增批量/统计/导出 API |
| `client/src/api/coupons.ts` | 新建 | 用户兑换 API（仅 1 个方法） |
| `client/src/views/AdminView.vue` | 修改 | 预设套餐+批量操作+筛选+导出 |
| `client/src/layouts/MainLayout.vue` | 修改 | 双入口+兑换对话框 |

---

## 验证方案

1. **后端限流验证**：
   - 连续调用 `POST /coupons/redeem` 11 次，第 11 次应返回 429
   - 等待 60 秒后应恢复正常

2. **管理员一键生成验证**：
   - 点击「10 积分 × 10 张」按钮 → 应生成 10 张 PPT-XXXXXXXX 格式兑换码
   - 点击「自定义」→ 填写参数 → 生成 → 列表刷新

3. **批量操作验证**：
   - 勾选多条 → 点击「批量禁用」→ 状态变为 disabled
   - 点击「导出 CSV」→ 下载文件包含所有兑换码

4. **用户兑换验证**：
   - 导航栏点击积分数字 → 弹出兑换对话框
   - 下拉菜单点击「兑换积分」→ 弹出同一对话框
   - 输入有效兑换码 → 成功提示 + 余额增加
   - 输入无效码 → 错误提示
   - 输入已使用码 → 提示「已被使用」

5. **TypeScript 编译检查**：
   - `cd server && npx tsc --noEmit`（0 错误）
   - `cd client && npx vue-tsc --noEmit`（0 错误）

6. **浏览器端到端测试**：
   - 管理员生成兑换码 → 复制 → 切换普通用户 → 兑换 → 余额增加
