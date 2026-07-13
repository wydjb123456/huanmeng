# 邮箱验证码注册功能 — 端到端验证与收尾

## 摘要

用户请求："注册需要手机号码验证码或者邮箱验证码，完善这个功能，注意安全问题预防黑客攻击"。

经探索，**后端与前端代码已全部实现完毕**（上个会话已完成 Task #52~#56），并通过了 API 层面的安全测试（60s 频率限制、5 次错误上限、5 分钟过期、bcrypt 哈希存储均已验证）。用户重新提供了 QQ 邮箱授权码 `vjymsyakfftzdeif`，该码已写入 `server/.env`（`MAIL_PASS=vjymsyakfftzdeif`，端口 587/STARTTLS）。

当前唯一未完成的是 **Task #57（端到端验证）**：用真实验证码走完一次完整注册流程，并做收尾处理。

## 当前状态分析

### 已完成（无需改动）

| 模块 | 文件 | 状态 |
|------|------|------|
| Prisma schema | `server/prisma/schema.prisma` | ✅ `User.email` + `EmailVerificationCode` 模型已就位 |
| 邮件服务 | `server/src/auth/mail.service.ts` | ✅ nodemailer + QQ SMTP(587)，已验证可发送到 `wydjb123456@qq.com` |
| 验证码服务 | `server/src/auth/auth.service.ts` | ✅ `sendCode()` + `register()` 全部安全逻辑已实现 |
| 控制器 | `server/src/auth/auth.controller.ts` | ✅ `POST /auth/send-code` 带 `@Throttle`（5次/小时/IP）+ `@Ip()` |
| DTO | `server/src/auth/dto.ts` | ✅ `SendCodeDto` + 扩展 `RegisterDto`（email + code） |
| 模块装配 | `server/src/auth/auth.module.ts` | ✅ `MailService` 已注册 |
| 全局限流 | `server/src/app.module.ts` | ✅ `ThrottlerModule` + `ThrottlerGuard` 全局生效 |
| 环境变量 | `server/.env` | ✅ MAIL_HOST/PORT/USER/PASS 已配置 |
| 前端 | `client/src/views/LoginView.vue` | ✅ 邮箱输入 + 验证码输入 + 60s 倒计时 + 校验 |

### 运行中的服务

- 后端 `:3000` — LISTENING（PID 40424）
- 前端 Vite `:5173` — LISTENING（PID 46496）
- Cloudflared 状态待确认

### 已验证的安全特性（API 层面）

- ✅ 60s 频率限制 → 429 "请 N 秒后再试"
- ✅ 错误码 → 400 "验证码错误，剩余 N 次机会"
- ✅ 未获取验证码直接注册 → 400 "请先获取验证码"
- ✅ bcrypt 哈希存储（DB 确认 `$2a$10$...` 格式，无明文）
- ✅ IP 级限流（5次/小时）

### 待办

1. **完整注册流程端到端测试**（获取码 → 取码 → 注册 → 校验 DB）
2. **收尾决策**：开发模式验证码日志（`console.log [DEV]`）是否保留

## 执行计划

### 步骤 1：确认服务健康

- `curl http://localhost:3000/api/auth/send-code`（OPTIONS 或错误请求）确认后端响应正常
- 确认 cloudflared 是否在运行；若未运行，**不自动重启**（用户的 API，由用户决定是否公开）——仅本地测试即可完成验证

### 步骤 2：端到端注册测试

1. 向 `wydjb123456@qq.com` 发送验证码：
   ```
   POST /api/auth/send-code  { "email": "wydjb123456@qq.com" }
   ```
   预期：201 `{ success: true }`，邮件送达

2. 从后端日志获取验证码：grep `[DEV] Verification code for wydjb123456@qq.com:` 拿到 6 位码

3. 用该验证码完成注册（使用新用户名，避免与已存在用户冲突）：
   ```
   POST /api/auth/register
   { "username": "test<6位时间戳>", "password": "test123456", "email": "wydjb123456@qq.com", "code": "<6位码>" }
   ```
   预期：201 `{ token, user: { id, username, balance: 50, role: "USER" } }`

4. 校验数据库：
   - `EmailVerificationCode` 对应记录 `consumed = true`
   - `User` 表新记录 `email` 字段已填充

### 步骤 3：前端联动验证（可选）

- 打开 `http://localhost:5173/register`
- 输入用户名、邮箱 `wydjb123456@qq.com`、获取验证码、填码、密码
- 提交注册 → 跳转登录页 → 用新账号登录成功

### 步骤 4：开发模式日志收尾决策

当前 `auth.service.ts` 第 54-57 行：
```typescript
if (process.env.NODE_ENV === 'development') {
  console.log(`[DEV] Verification code for ${dto.email}: ${code}`);
}
```

**建议保留**，理由：
- 已用 `NODE_ENV === 'development'` 严格门控，生产环境不会打印
- 用户当前以开发模式运行，需要日志取码做自测
- 不构成安全风险（日志仅在本地 stdout，未对外暴露）

若用户希望更严格，可改为：仅当 `ENABLE_DEV_CODE_LOG=true` 时打印（双重门控）。但当前实现已足够。

### 步骤 5：标记 Task #57 完成

## 假设与决策

- **假设**：用户重新提供授权码是为了确认凭据正确，实际 `.env` 已配置好，无需重复写入
- **决策**：不重启已运行的服务（3000/5173 都在监听），避免打断用户
- **决策**：不主动重启 cloudflared —— 公开访问由用户控制（用户曾强调"我要可控，因为 API 是我的"）
- **决策**：保留 dev-mode 日志，因已做环境门控
- **不做的事**：不新增手机短信验证（用户选择了"仅邮箱验证码"）、不改动已验证通过的安全逻辑、不重构已有代码

## 验证清单

- [ ] `POST /auth/send-code` 返回 201，邮件送达
- [ ] 后端日志出现 `[DEV] Verification code for wydjb123456@qq.com: <6位码>`
- [ ] `POST /auth/register` 用正确码返回 201 + token + `role: "USER"`
- [ ] DB 中 `EmailVerificationCode.consumed = true`
- [ ] DB 中新 `User.email` 已填充
- [ ] 前端注册页可完整走完流程（可选）
