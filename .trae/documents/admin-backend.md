# 管理员后台实现方案

## Context

当前系统没有任何管理后台：`User.role` 字段已存在（USER/ADMIN 枚举）但未启用——JWT 不携带 role，没有 RolesGuard，没有 admin 用户，coupons/generate 端点连鉴权都没有（注释写"后续加管理员鉴权"）。用户需要一个完整的管理后台，支持：①两个管理员账号（test01 升级 + 新建 admin）；②4 项积分操作（增减、搜索、日志、赠券）；③顶部菜单条件显示（仅 ADMIN 可见）；④4 个面板（统计概览、用户管理、作品历史、优惠券管理）。

## 后端 (NestJS + Prisma + SQLite)

### 1. Prisma schema — 新增审计日志模型
`server/prisma/schema.prisma` 在 `Coupon` 后追加：

```prisma
model AdminOperation {
  id            Int       @id @default(autoincrement())
  adminId       Int
  targetUserId  Int?
  action        String    // balance_adjust | coupon_generate
  delta         Int?
  reason        String?
  createdAt     DateTime  @default(now())
  @@index([targetUserId])
  @@index([adminId])
}
```

运行 `npx prisma migrate dev --name add_admin_operation`。

### 2. JWT role 传播链（4 文件）
- `server/src/auth/auth.service.ts`：`issueToken(id, username, balance, role)` 签 `{ sub, username, role }`；`register`/`login` 传 `user.role`；`getUserById` select 加 `role: true` 并返回。**保留 id===1 balance=999999 hack**（test01 升为 admin 后仍无限积分）。
- `server/src/auth/jwt.strategy.ts`：`validate()` 返回 `{ userId, username, role }`。
- 确认 `dto.ts` 响应类型包含 role。

### 3. 角色 Guard 基础设施（2 新文件）
- `server/src/auth/roles.decorator.ts`：`@Roles(...roles: Role[])` 用 `SetMetadata`。
- `server/src/auth/roles.guard.ts`：`RolesGuard implements CanActivate`，读 `req.user.role` 与 Reflector metadata 对比。从 `AuthModule` 导出。

### 4. Admin 模块（新建 `server/src/admin/`）
- `admin.module.ts`：imports `PrismaModule`、`CouponsModule`；注册 `AdminController` + `AdminService`。
- `admin.controller.ts`：`@Controller('admin')` 类级 `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(Role.ADMIN)`。端点：
  - `GET /api/admin/stats` — 用户数、作品按状态分组、积分消耗总额、今日新增
  - `GET /api/admin/users?q=&page=&size=` — 分页用户列表 + workCount + registeredAt
  - `PATCH /api/admin/users/:id/balance` — body `{ delta, reason? }`，正数充值/负数扣减
  - `GET /api/admin/users/:id/operations` — 该用户的操作日志
  - `GET /api/admin/works?page=&size=&userId=` — 分页作品历史
  - `GET /api/admin/coupons` — 全部优惠券
  - `POST /api/admin/coupons` — 生成优惠券（复用现有 CouponsService 逻辑）
- `admin.service.ts`：调积分用 `$transaction` 包 `user.update` + `adminOperation.create`；统计用 `groupBy`/`count`。
- `server/src/app.module.ts` 注册 `AdminModule`。

### 5. 锁现有优惠券端点
`server/src/coupons/coupons.controller.ts` 的 `generate` 和 `list` 加 `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(Role.ADMIN)`。用户侧 `redeem` 保持不变。

### 6. Seed 脚本（新建 `server/prisma/seed.ts`）
- test01 (id=1) `role=ADMIN`
- 创建 `admin` 用户（bcrypt `admin123`，`role=ADMIN`，若不存在）
- `server/package.json` 加 `"prisma": {"seed": "ts-node prisma/seed.ts"}` 和 `"prisma:seed"` 脚本

## 前端 (Vue 3 + Pinia + Element Plus + TailwindCSS)

### 1. 用户 store
`client/src/stores/user.ts`：`UserInfo` 加 `role: 'USER' | 'ADMIN'`。`fetchUserInfo` 已调 `/auth/me`，后端返回 role 后自动获取。

### 2. 路由守卫
`client/src/router/index.ts`：加子路由 `{ path: 'admin', component: () => import('@/views/AdminView.vue'), meta: { requiresAuth: true, requiresAdmin: true } }`。扩展 `beforeEach`：`if (to.meta.requiresAdmin && userStore.userInfo?.role !== 'ADMIN') return '/'`。

### 3. 主布局菜单
`client/src/layouts/MainLayout.vue`（~L136）：`navItems` 改 computed，当 `userStore.userInfo?.role === 'ADMIN'` 时追加 `{ path: '/admin', label: '管理后台' }`。

### 4. AdminView.vue（新建）
单页 + `el-tabs` 4 个标签页：
- **统计概览**：卡片显示用户数、作品数、今日新增、积分消耗
- **用户管理**：`el-table`（用户名/注册时间/余额/作品数）+ 搜索框 + 分页 + 调整积分对话框（输入 delta + reason）+ 查看操作日志
- **作品历史**：`el-table`（用户/类型/状态/积分/时间）+ 按 userId 过滤 + 分页
- **优惠券管理**：列表 + 生成对话框（amount/count/expiresAt）

使用 ink 色板 + `editorial-number` 类保持视觉一致。

### 5. API 客户端（新建 `client/src/api/admin.ts`）
`request` 封装 7 个 admin 端点。

## 验证步骤

1. `npx prisma migrate dev` → `npx prisma db seed`
2. 重启后端；用 `admin/admin123` 登录 → 响应 `user.role === 'ADMIN'`
3. 访问 `/` → 顶部菜单出现"管理后台" → 点击进 `/admin` 显示 4 个标签
4. 用户管理：给某普通用户 +100 积分 → 再 -50 → 查看该用户操作日志 → 两条 `balance_adjust` 记录都在
5. 用非管理员账号登录 → 菜单不显示"管理后台" → 手动访问 `/admin` 被重定向到 `/` → 直接 `POST /api/admin/coupons` 返回 403
6. Prisma Studio 确认 `AdminOperation` 表有数据

## 关键改动文件清单

**后端**：
- `server/prisma/schema.prisma`（新增 AdminOperation）
- `server/prisma/seed.ts`（新建）
- `server/package.json`（seed 配置）
- `server/src/auth/auth.service.ts`、`jwt.strategy.ts`、`dto.ts`
- `server/src/auth/roles.decorator.ts`、`roles.guard.ts`（新建）
- `server/src/auth/auth.module.ts`（导出 RolesGuard）
- `server/src/admin/{module,controller,service}.ts`（新建）
- `server/src/app.module.ts`
- `server/src/coupons/coupons.controller.ts`（加 admin guard）

**前端**：
- `client/src/stores/user.ts`
- `client/src/router/index.ts`
- `client/src/layouts/MainLayout.vue`
- `client/src/views/AdminView.vue`（新建）
- `client/src/api/admin.ts`（新建）
