# 实现方案：PDF 导入优化 + 海报参考图 + Logo 替换 + 预览下载修复

## Context

用户提出三个需求：
1. **PPT 加"优化已有 PDF"功能** — 用户上传 PDF，系统提取每页为图片，基于这些参考图用图生图（image-to-image）重新设计每页视觉风格
2. **海报加"参考图"功能** — 海报本质是图像生成，加上参考图上传，让 AI 基于参考图风格生成海报
3. **附带修复**：生成成功后无法预览/下载（路径问题）；用户已放 logo 文件，需替换默认 favicon

关键技术发现：EvoLink API 的 `POST /v1/images/generations` **支持 `image_urls` 字段**（1-16 张参考图，jpeg/jpg/png/webp，单张≤50MB），这使参考图功能真正可行。`@nestjs/platform-express` 已安装（multer 可用）。

用户决策：
- URL 可达性：使用 **cloudflared 隧道**（本地开发时通过隧道让 EvoLink 访问本地图片）
- PDF 超 15 页：**截断到前 15 页**（与现有页数上限一致）

---

## 一、依赖安装

`server/package.json` 新增：
- `pdfjs-dist` — PDF 解析与页面渲染
- `@napi-rs/canvas` — Node 环境 Canvas 实现（Windows 无需系统依赖，优于 node-canvas）

---

## 二、数据库 Schema 变更

**文件**：`server/prisma/schema.prisma`

```prisma
model Slide {
  // ... 现有字段 ...
  referenceImage String?   // PDF 导入时该页的参考图 URL
}

model Work {
  // ... 现有字段 ...
  referenceImages String?  // 海报参考图 JSON 数组字符串
}
```

迁移：`npx prisma migrate dev --name add_reference_images`

---

## 三、后端实现

### 3.1 `server/src/works/evolink.service.ts` — 扩展 createImageTask

`createImageTask(prompt, aspectRatio, imageUrls?)` 增加可选第三参数。传入时在请求体加 `image_urls` 字段。

### 3.2 新建 `server/src/works/pdf.service.ts` — PDF 提取服务

使用 `pdfjs-dist/legacy/build/pdf.mjs` + `@napi-rs/canvas` 的 `createCanvas()`。每页渲染为 PNG，用 sharp 压缩到最大宽度 1920px，保存到 `uploads/references/`。

关键配置：
- `pdfjs.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')`
- `getDocument({ data, isEvalSupported: false, useWorkerFetch: false })`
- scale=2 渲染，sharp 限宽 1920px

### 3.3 新建 `server/src/works/upload.config.ts` — Multer 配置 + URL 工具

- `pdfUploadConfig`：20MB 限制，仅 application/pdf
- `imageUploadConfig`：10MB/张，仅 jpeg/jpg/png/webp
- `toPublicUrl(relativePath, configService)`：拼接 `PUBLIC_BASE_URL` 前缀（cloudflared 隧道地址）

### 3.4 `server/src/works/works.controller.ts` — 新增上传端点

- `POST /works/upload/pdf`（`FileInterceptor('file')`）→ 调 `works.extractPdfPages`
- `POST /works/upload/reference`（`FilesInterceptor('files', 4)`）→ 调 `works.saveReferenceImages`

### 3.5 `server/src/works/works.service.ts` — 核心变更

构造函数：注入 `PdfService`，创建 `uploads/references` 目录

新增方法：
- `extractPdfPages(userId, pdfBuffer)` — 调 `pdfService.extractPages`，**超过 15 页截断到前 15 页并提示**，返回 `{ pageCount, pages: [{ idx, imageUrl, title }] }`
- `saveReferenceImages(userId, files)` — sharp 压缩后保存，返回 `{ urls }`
- `buildPdfSlidePrompt(slide, dto)` — 图生图专用 prompt：以参考图为基底重新设计视觉风格，强调保留内容、应用新风格、现代化排版

修改方法：
- `generate()` — 若 `dto.pdfImport`，强制 `mode='fine'`，创建 Slide 时存 `referenceImage`
- `processFineMode()` — 每个 slide 调 `createImageTask` 时传入 `slide.referenceImage`（转公网 URL）；PDF 导入用 `buildPdfSlidePrompt`，否则用原 `buildSlidePrompt`
- `regenerateSlideInBackground()` — 若 slide 有 referenceImage，传给 `createImageTask`
- `generatePoster()` — 创建 Work 时存 `referenceImages` JSON
- `processPoster()` — `createImageTask` 传入参考图 URL 数组
- `getStatus()` — 返回 `referenceImages` 和每个 slide 的 `referenceImage`

### 3.6 `server/src/works/works.module.ts`

`providers` 添加 `PdfService`

### 3.7 DTO 变更

- `dto.ts` 的 `GenerateWorkDto`：加 `pdfImport?: boolean`、`referenceImages?: string[]`（`@ArrayMaxSize(15)`）
- `poster.dto.ts` 的 `GeneratePosterDto`：加 `referenceImages?: string[]`（`@ArrayMinSize(1) @ArrayMaxSize(4)`）

### 3.8 `server/.env` 新增

```
PUBLIC_BASE_URL=<cloudflared 隧道地址，部署后改实际域名>
```

---

## 四、前端实现

### 4.1 新建 `client/src/api/upload.ts`

- `uploadPdf(file)` — POST FormData 到 `/works/upload/pdf`，timeout 120s
- `uploadReferenceImages(files)` — POST FormData 到 `/works/upload/reference`，timeout 60s

### 4.2 新建 `client/src/components/ReferenceUploader.vue`

可复用组件（v-model 绑定 string[]）：
- 拖拽 + 点击上传
- 缩略图网格 + 删除按钮
- 上传中 spinner
- 限制 maxCount（默认 4）

### 4.3 `client/src/views/PosterView.vue` — 加参考图区

- 03/Style 和 04/Format 之间插入 "03.5 / Reference" 区块
- 引入 `ReferenceUploader`，`form.referenceImages: []`
- `generate()` POST body 传入 `referenceImages`
- `reset()` 清空

### 4.4 `client/src/views/GenerateView.vue` — PDF 导入入口

Step 0 顶部加模式切换按钮组：「从主题生成」/「优化已有 PDF」

PDF 导入模式下：
- 显示 PDF 上传区（拖拽 + 点击），上传后显示页数 + 前 6 页缩略图
- Topic 改为"优化要求"输入框
- 页数选择器隐藏，显示 PDF 页数（只读）
- 强制精细模式，`isModeDisabled('fast')` 返回 true
- 点"下一步"跳到 step 2（模式选择），**跳过大纲编辑步骤**
- `startGenerate()` 传 `pdfImport: true` + `referenceImages: pdfPages.map(p => p.imageUrl)`

非 PDF 模式：流程不变。

---

## 五、预览/下载修复

**问题**：生成成功后无法正常预览和下载。需排查 `works.service.ts` 中 `getStatus()` 返回的字段名，以及前端 `GenerateView.vue` step 5 结果页对 `slide.imageUrl` 的引用。

**排查方向**：
1. `getStatus()` 返回的 slides 字段名是否与前端期望一致（如 `imageUrl` vs `image_url`）
2. 图片 URL 是否以 `/uploads/` 开头且能被 Vite 代理或后端静态服务命中
3. PDF 下载按钮 `window.open('/api/works/:id/download')` 是否被路由拦截

将在实现阶段先复现问题（用测试账号生成一次），定位根因后修复。

---

## 六、Logo 替换

用户说"logo我放在主文件夹里了"，但根目录未发现图片文件。实现阶段开始时**先确认 logo 文件实际路径**（可能在子目录或命名不同），然后：
- 替换 `client/public/favicon.svg`
- 替换 `client/index.html` 中的 favicon 引用
- 如有 header/navbar 中的 logo 引用，一并替换

---

## 七、文件清单

### 新建
| 文件 | 用途 |
|------|------|
| `server/src/works/pdf.service.ts` | PDF 页面提取 |
| `server/src/works/upload.config.ts` | Multer 配置 + URL 工具 |
| `client/src/api/upload.ts` | 前端上传 API |
| `client/src/components/ReferenceUploader.vue` | 参考图上传组件 |

### 修改
| 文件 | 变更 |
|------|------|
| `server/src/works/evolink.service.ts` | createImageTask 加 imageUrls 参数 |
| `server/src/works/works.service.ts` | 新方法 + 修改 generate/processFineMode/processPoster 等 |
| `server/src/works/works.controller.ts` | 两个上传端点 |
| `server/src/works/works.module.ts` | 注册 PdfService |
| `server/src/works/dto.ts` | 加 pdfImport + referenceImages |
| `server/src/works/poster.dto.ts` | 加 referenceImages |
| `server/prisma/schema.prisma` | Slide.referenceImage + Work.referenceImages |
| `server/.env` | PUBLIC_BASE_URL |
| `client/src/views/GenerateView.vue` | step 0 模式切换 + PDF 上传 |
| `client/src/views/PosterView.vue` | 参考图上传区 |
| `client/public/favicon.svg` | 替换为用户 logo |
| `client/index.html` | favicon 引用 |

---

## 八、验证方式

1. **依赖安装**：`cd server && npm install pdfjs-dist @napi-rs/canvas`
2. **数据库迁移**：`npx prisma migrate dev --name add_reference_images`
3. **类型检查**：`cd server && npx tsc --noEmit`；`cd client && npx vue-tsc --noEmit`
4. **启动 cloudflared**：`cloudflared tunnel --url http://localhost:3000`，将输出 URL 填入 `.env` 的 `PUBLIC_BASE_URL`
5. **海报参考图测试**：上传 1-4 张图 → 生成 → 确认基于参考图风格
6. **PDF 导入测试**：上传一个 3-5 页 PDF → 填优化要求 → 选模式 → 生成 → 确认每页基于对应 PDF 页重新设计
7. **预览下载**：生成完成后确认图片预览正常、PDF 可下载
8. **Logo**：刷新浏览器确认 favicon 和 header logo 更新
