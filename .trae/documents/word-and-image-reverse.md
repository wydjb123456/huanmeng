# Word 文档生成 + 图片反推风格提示词

## Context

用户希望在现有 PPT/海报生成器基础上新增两项能力：
1. **Word 文档生成**：先免费生成章节大纲，用户确认后**按章节逐个生成正文**，每完成一个章节即可预览，全部完成后导出 `.docx`。不要一次性生成全部内容。
2. **图片反推风格提示词**：上传一张图片，AI 分析其视觉风格，输出风格描述，自动填入 PPT/海报/Word 创建页的「风格」输入框。

定价：大纲免费，正文按章节计费（10 积分/章）；图片反推免费（轻量辅助功能）。

现有架构（探索确认）：
- `Work` 模型 `type` 字段目前为 `'ppt' | 'poster'`，`Slide` 模型有 `title`/`content`/`status` 字段 —— 可复用
- `EvolinkTextService`（`server/src/works/evolink-text.service.ts`）封装 `direct.evolink.ai/v1/chat/completions`，模型 `gpt-5.1-chat`，已支持 JSON 输出
- 风格输入区模式一致（`PosterView.vue` L117-135、`GenerateView.vue`）：风格按钮网格 + `custom` 时显示自定义输入框
- 图片上传已有 `ReferenceUploader.vue` 组件 + `POST /works/upload/reference` 端点
- 导航在 `MainLayout.vue` L136-148 `navItems` computed

## 实现方案

### 第一部分：Word 文档生成

#### 1.1 数据模型（`server/prisma/schema.prisma`）

- `Work.type` 注释扩展为 `'ppt' | 'poster' | 'word'`
- 新增字段 `documentUrl String?`（存储 .docx 文件路径，区别于 `pdfUrl`）
- 复用 `Slide` 模型：每个 slide = 一个章节，`title`=章节标题，`content`=章节正文（markdown），`status` 复用 pending/processing/completed/failed
- 同步：`npx prisma db push --accept-data-loss`

#### 1.2 新增 Word 服务（`server/src/works/word.service.ts`）

核心方法：
- `generateOutline(dto)` — 调用 `evolinkText` 生成章节大纲（免费）。prompt 调整为"文档章节结构"而非"slides"，返回 `[{title, summary}]`
- `createWork(userId, dto)` — 创建 `Work(type='word')` + 批量 `Slide`（title + 空 content，status=pending）。不预扣费
- `generateSection(userId, workId, sectionIdx)` — 生成单章节正文：
  1. 余额检查（测试账号 id=1 跳过）
  2. 扣 10 积分
  3. slide.status=processing
  4. 调 `evolinkText` 生成该章节正文（传入整体主题 + 该章节标题 + summary + 上下文章节）
  5. 存入 slide.content，status=completed
  6. 失败则退还积分、status=failed
- `regenerateSection(userId, workId, sectionIdx)` — 重新生成（同上，扣费）
- `exportDocx(userId, workId)` — 用 `docx` npm 包把所有 completed 章节打包成 `.docx`，存到 `uploads/documents/`，更新 `work.documentUrl`
- `getWork(userId, workId)` — 返回 Work + 所有 sections（含状态和内容）

#### 1.3 新增 DTO（`server/src/works/word.dto.ts`）

- `WordOutlineDto`: `prompt`, `style`, `customStyle?`, `category?`, `language?`, `detailLevel?`, `sectionCount?`(2-20)
- `CreateWordDto`: 同上 + `sections: [{title, summary}]`
- `WordSectionDto`: 复用 GenerateWorkDto 的风格字段校验模式

#### 1.4 控制器端点（在 `works.controller.ts` 新增）

```
POST /works/word/outline           生成大纲（免费）
POST /works/word/create            创建 Work + sections
POST /works/word/:id/sections/:idx/generate   生成单章节（扣 10 积分）
POST /works/word/:id/sections/:idx/regenerate 重生成单章节
GET  /works/word/:id               获取 Work + sections（含正文）
GET  /works/word/:id/download      下载 .docx
```

`WorksModule` 注册 `WordService`。

#### 1.5 evolink-text 扩展（`evolink-text.service.ts`）

新增方法：
- `generateWordOutline(topic, style, opts)` — 生成文档章节大纲，返回 `[{title, summary}]`
- `generateWordSection(topic, sectionTitle, sectionSummary, prevSections, style, opts)` — 生成单章节正文（800-2000 字 markdown），返回字符串

#### 1.6 前端 Word 页面（`client/src/views/WordView.vue`）

三步流程，复用 GenerateView 的编辑式视觉风格：
- **Step 0**：输入主题 + 风格 + 配置（章节目标数 2-20、语言、详情程度）→ 调 `POST /works/word/outline`
- **Step 1**：编辑大纲（章节标题 + 摘要，可增删改排序）→ 调 `POST /works/word/create` 创建 workId
- **Step 2**：逐章节生成区 —— 每章节一个卡片（标题 + "生成"按钮 + 正文预览区 + "重生成"按钮）。点击生成后 loading → 完成显示正文 markdown 渲染。底部"下载 .docx"按钮（全部 completed 后可用）

#### 1.7 前端路由与导航

- `router/index.ts`：新增 `/word` 路由（requiresAuth）
- `MainLayout.vue` L140：`navItems` 加 `{ path: '/word', label: '文档' }`
- `client/src/api/word.ts`：6 个 API 函数（outline/create/generateSection/regenerate/getWork/download）

### 第二部分：图片反推风格提示词

#### 2.1 验证 EvoLink Vision 支持（实现第一步）

`gpt-5.1-chat` 是否支持 OpenAI 兼容的 `image_url` content 格式需先验证。实现时先发一个测试请求：
```json
{
  "model": "gpt-5.1-chat",
  "messages": [{"role":"user","content":[
    {"type":"text","text":"描述这张图片的视觉风格"},
    {"type":"image_url","image_url":{"url":"https://..."}}
  ]}]
}
```
- 若支持 → 直接用
- 若不支持 → 备选：EvoLink 可能有 vision 专用模型，或回退为"用户上传后用 base64 + 不同模型名尝试"

#### 2.2 后端端点（`works.controller.ts`）

```
POST /works/prompt/reverse   接收上传图片，返回风格描述
```
- 复用 `@UseInterceptors(FileInterceptor('file', imageUploadConfig))`
- 调用 `evolinkText.reverseStyleFromImage(imageUrl)`
- 图片先存到 `uploads/references/`（复用 `saveReferenceImages` 逻辑），返回公开 URL 给 vision API

#### 2.3 evolink-text 新增方法

- `reverseStyleFromImage(imageUrl)` — 调 vision API，prompt：「分析这张图片的视觉风格，输出适合用于 AI 图像生成提示词的风格描述（色彩、构图、艺术风格、情绪氛围），50-150 字，中文」
- 返回 `{ style: string }`，自动填入风格输入框（切换 `style='custom'`，填入 `customStyle`）

#### 2.4 前端组件（`client/src/components/StyleReverseButton.vue`）

可复用的小组件，放在风格输入区：
- 一个"从图片提取风格"按钮
- 点击 → 弹出文件选择 → 上传 → loading → 成功后 emit `reverse` 事件带风格文本
- 父组件接收后 `form.style = 'custom'; form.customStyle = style`

集成位置：
- `PosterView.vue` 风格区（L117 附近）
- `GenerateView.vue` 风格区
- `WordView.vue` 风格区（新增）

### 第三部分：依赖与收尾

#### 3.1 新增依赖

- `server`：`docx`（生成 .docx 文件）、`@types/docx`

#### 3.2 作品列表与下载

- `WorksView.vue`：作品卡片支持显示 word 类型 + 下载 .docx（L177 附近扩展下载逻辑）

## 关键文件清单

**新增**：
- `server/src/works/word.service.ts` — Word 生成服务
- `server/src/works/word.dto.ts` — Word DTO
- `client/src/views/WordView.vue` — Word 生成页面
- `client/src/api/word.ts` — Word API
- `client/src/components/StyleReverseButton.vue` — 图片反推按钮组件

**修改**：
- `server/prisma/schema.prisma` — type 注释 + documentUrl 字段
- `server/src/works/works.controller.ts` — 新增 Word + 反推端点
- `server/src/works/works.module.ts` — 注册 WordService
- `server/src/works/evolink-text.service.ts` — 新增 generateWordOutline/generateWordSection/reverseStyleFromImage
- `client/src/router/index.ts` — /word 路由
- `client/src/layouts/MainLayout.vue` — navItems 加"文档"
- `client/src/views/PosterView.vue` — 风格区加反推按钮
- `client/src/views/GenerateView.vue` — 风格区加反推按钮
- `client/src/views/WorksView.vue` — word 作品下载

## 验证步骤

1. **Vision 支持验证**：先单独测 `reverseStyleFromImage`，上传一张图确认返回风格文本
2. **Word 大纲**：`POST /works/word/outline` 返回章节列表
3. **Word 创建**：`POST /works/word/create` 返回 workId + sections
4. **单章节生成**：`POST /works/word/:id/sections/0/generate` 返回正文，DB 中 slide.status=completed、user.balance 扣 10
5. **章节预览**：前端 WordView Step 2 显示已生成章节正文
6. **导出 docx**：`POST /works/word/:id/export`（或下载时自动生成）→ 下载 .docx 能用 Word 打开
7. **图片反推**：前端点"从图片提取风格"→ 上传 → 风格自动填入 customStyle
8. **积分边界**：余额不足时生成章节返回 402/400；测试账号 id=1 跳过扣费
