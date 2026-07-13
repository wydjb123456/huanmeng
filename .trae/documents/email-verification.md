# 注册邮箱验证码功能实现方案

## Context

当前注册流程仅要求用户名 + 密码，任何人可批量注册账号，存在滥用风险（薅 50 积分羊毛、占用户名、机器人注册）。需要加邮箱验证码，确保注册者拥有该邮箱。同时用户已要求全部 4 项安全防护：60s 发送频率、5 次错误上限、5 分钟过期、bcrypt 哈希存储。

## 后端 (NestJS + Prisma + nodemailer)

### 1. Prisma schema 改动（`server/prisma/schema.prisma`）

**User 加 email 字段**（可选，已有用户无需迁移数据）：
```prisma
email String? @unique
```

**新增 EmailVerificationCode 表**：
```prisma
model EmailVerificationCode {
  id          Int      @id @default(autoincrement())
  email       String
  codeHash    String   // bcrypt 哈希，不存明文
  attempts    Int      @default(0)
  consumed     Boolean  @default(false)
  ip          String?
  expiresAt   DateTime  // now + 5min
  createdAt   DateTime  @default(now())

  @@index([email])
  @@index([ip])
}
```

运行 `npx prisma migrate dev --name add_email_verification`。

### 2. 安装依赖
`server` 安装 `nodemailer` + `@types/nodemailer`。

### 3. MailService（新建 `server/src/auth/mail.service.ts`）
- `@nestjs/config` 注入 `MAIL_HOST`、`MAIL_PORT`、`MAIL_USER`、`MAIL_PASS`
- `sendVerificationCode(email, code)`：用 nodemailer 创建 SMTP transporter（QQ: `smtp.qq.com:465`），发 HTML 邮件，主题"幻作 - 注册验证码"
- transporter 单例（构造时创建复用）
- 失败抛 `ServiceUnavailableException`

### 4. AuthController 加端点（`server/src/auth/auth.controller.ts`）

**`POST /auth/send-code`** — body: `{ email }`
1. 校验 email 格式（class-validator `@IsEmail`）
2. 检查 email 是否已被注册（`user.findUnique`）→ 已注册返回 409
3. **60s 频率限制**：查 `emailVerificationCode.findFirst({ where: { email }, orderBy: { createdAt: 'desc' } })`，若 `createdAt > now - 60s` 拒绝
4. 生成 6 位数字验证码（`crypto.randomInt(100000, 999999)`）
5. `bcrypt.hash(code, 10)` 哈希
6. 存 DB（`expiresAt = now + 5min`，记录 IP）
7. 调用 `mailService.sendVerificationCode`
8. 返回 `{ success: true }`（不返回 code）

**修改 `POST /auth/register`** — body: `{ username, password, email, code }`
1. 查 email 是否已注册 → 已注册返回 409
2. 查该 email 最近一条未消费的 code 记录
3. **5 分钟过期检查**：若 `expiresAt < now` → 拒绝"验证码已过期"
4. **5 次错误检查**：若 `attempts >= 5` → 拒绝"错误次数过多，请重新获取"
5. `bcrypt.compare(code, codeHash)` 验证
   - 失败：`attempts++`，若达到 5 则 `consumed = true`，返回 400
   - 成功：`consumed = true`，创建用户（含 email），返回成功
6. 整个验证 + 创建用户用 `$transaction` 保证一致性

### 5. 更新 DTO（`server/src/auth/dto.ts`）
```typescript
export class SendCodeDto {
  @IsEmail()
  email: string;
}

export class RegisterDto {
  @IsString() @MinLength(3) @MaxLength(20)
  username: string;

  @IsString() @MinLength(6)
  password: string;

  @IsEmail()
  email: string;

  @IsString() @MinLength(6) @MaxLength(6)
  code: string;  // 6 位数字
}
```

### 6. AuthModule 配置
- `providers` 加 `MailService`
- `exports` 不需要（仅本模块用）

### 7. 环境变量（`server/.env`）
```env
MAIL_HOST=smtp.qq.com
MAIL_PORT=465
MAIL_USER=your_email@qq.com
MAIL_PASS=your_qq_auth_code
```

### 8. 额外安全：IP 级频率限制
现有 ThrottlerModule 全局 30 req/min。给 `send-code` 端点加 `@Throttle({ default: { limit: 5, ttl: 3600000 } })` —— 同一 IP 每小时最多 5 次发送请求，防短信轰炸。

## 前端 (Vue 3)

### 1. LoginView.vue 注册表单扩展
- `form` 加 `email: ''` + `code: ''`
- 注册模式下添加两个字段（在密码字段下方）：
  - email 输入框（type=email）
  - 验证码输入框 + "获取验证码"按钮（同行）
- 发送验证码按钮逻辑：
  - 校验 email 格式 + 非空
  - 调 `POST /auth/send-code` `{ email }`
  - 成功后启动 60s 倒计时（`setInterval`），按钮 disabled + 显示剩余秒数
  - 倒计时结束恢复可点击
- 提交时 `form` 含 `{ username, password, email, code }`

### 2. API client（`client/src/api/auth.ts` 新建 或直接用 request）
直接用现有 `request` 即可：
```typescript
request.post('/auth/send-code', { email })
request.post('/auth/register', { username, password, email, code })
```
无需新建文件。

## 验证步骤

1. 安装依赖 + 迁移 + 配置 QQ 邮箱授权码到 `.env`
2. 重启后端
3. **正常流程**：
   - 前端注册页填 email → 点"获取验证码" → 邮箱收到 6 位验证码
   - 填验证码 → 提交 → 注册成功 → DB 中 `User.email` 有值，`EmailVerificationCode.consumed = true`
4. **60s 频率限制**：连续两次点"获取验证码"，第二次返回 429"请 60 秒后再试"
5. **5 次错误**：故意输错 5 次 → 第 6 次返回"错误次数过多，请重新获取" → 重新申请后原 code 失效
6. **5 分钟过期**：申请后等 5 分钟再提交 → 返回"验证码已过期"
7. **email 唯一**：用已注册 email 再次申请 → 返回 409
8. **IP 频率限制**：1 小时内连续 6 次申请不同 email → 第 6 次返回 429
9. **DB 安全验证**：Prisma Studio 查 `EmailVerificationCode` 表，`codeHash` 字段是 `$2a$10$...` bcrypt 哈希，无明文 code

## 关键改动文件清单

**后端**：
- `server/prisma/schema.prisma`（User 加 email + 新增 EmailVerificationCode）
- `server/package.json`（加 nodemailer）
- `server/src/auth/mail.service.ts`（新建）
- `server/src/auth/auth.controller.ts`（加 send-code 端点 + 修改 register）
- `server/src/auth/auth.service.ts`（修改 register 接受 email+code 并验证）
- `server/src/auth/dto.ts`（加 SendCodeDto + RegisterDto 加 email/code）
- `server/src/auth/auth.module.ts`（加 MailService provider）
- `server/.env`（加 MAIL_* 配置）

**前端**：
- `client/src/views/LoginView.vue`（注册表单加 email+code 字段 + 倒计时按钮）
