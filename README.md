# PPT/海报生成网站

基于 AI 的 PPT/海报生成平台，用户输入主题即可生成可下载的 PDF 演示文稿。

## 技术栈

- **前端**: Vue 3 + Vite + TailwindCSS + Element Plus
- **后端**: NestJS + TypeScript + Prisma ORM
- **数据库**: PostgreSQL + Redis
- **AI**: EvoLink GPT Image 2.0
- **部署**: Docker + docker-compose

## 项目结构

```
.
├── client/          # 前端 Vue 3 应用
├── server/          # 后端 NestJS API
├── verify/          # 技术验证脚本（已完成）
├── docker-compose.yml
└── .env             # 环境变量（不提交）
```

## 快速开始

### 开发环境

1. 安装依赖：

```bash
# 前端
cd client && npm install

# 后端
cd server && npm install
```

2. 配置环境变量：
   - 复制 `.env.example` 为 `.env`
   - 填写 API Key 等敏感信息

3. 启动数据库：
```bash
docker-compose up -d postgres redis
```

4. 启动开发服务：
```bash
# 后端（终端1）
cd server && npm run dev

# 前端（终端2）
cd client && npm run dev
```

### 生产部署

```bash
docker-compose up -d
```

## 核心业务流程

```
用户注册登录 → 输入兑换码充值 → 选择模板/AI生成 → 预览 → 下载PDF
```

## 详细文档

- [技术验证报告](verify/VERIFICATION-REPORT.md)
- [项目计划](PROJECT-PLAN.md)
