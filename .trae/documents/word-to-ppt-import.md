# 上传 Word 文档 → 生成 PPT

## Context

当前项目有"主题生成 PPT"和"上传 PDF → 图生图重设计 PPT"两种创作模式,但缺少"上传 Word 文档 → 生成 PPT"。用户上传 `.docx` 后,应提取文档全文 → 调用 LLM 将文本重构为结构化大纲(每页标题+要点) → 走现有标准文本生图流程。

与 PDF 导入的关键差异:
- PDF 导入是**图生图**(每页 PNG 作为 referenceImage),Word 导入是**文本生图**(提取文本 → LLM 重构大纲 → 标准 `buildSlidePrompt` 流程)
- PDF 导入强制精细模式;Word 导入**不强制**,用户可选极速(若 9 页)或精细模式
- PDF 导入上传后只拿到参考图,需走 `proceedToMode()` 再选模式;Word 导入上传后**直接拿到完整大纲**,跳到 step 1(大纲编辑器)让用户审核

已确认决策:
- 解析库用 `mammoth`(纯 JS,.docx → 纯文本)
- 大纲生成用新增 `generateOutlineFromDocument()`(基于文档全文,非短主题)

## 实施步骤

### 1. 安装依赖

`server` 目录下 `npm install mammoth`(纯 JS,无原生编译,自带类型)

### 2. 后端:`server/src/works/upload.config.ts`

在 `pdfUploadConfig` 后新增 `wordUploadConfig`,镜像 PDF 配置:
- `fileSize: 20MB`
- `fileFilter` 接受 `application/vnd.openxmlformats-officedocument.wordprocessingml.document` + `originalname.endsWith('.docx')` 兜底(部分浏览器发泛型 mimetype)

### 3. 后端:`server/src/works/evolink-text.service.ts`

新增方法 `generateOutlineFromDocument(docText, style, opts)`,镜像 `generateOutline()`(L29-96)但系统提示词不同:

- 用户消息 = 文档全文(截断到 8000 字)
- 系统提示词强调"**重构文档内容为幻灯片,不要过度摘要丢失关键信息**":保留文档的具体数据、论点、专有名词;若文档有自然章节/标题,以其作为幻灯片边界
- 复用现有 `languageHint`、`styleHint`、`detailHint`、`categoryStructureGuide` 辅助方法
- 复用 L29-96 的 JSON 解析+校验逻辑(`response_format: { type: 'json_object' }`,`.filter(s => s.title)`,空数组抛 `大纲为空`)
- `try/catch` 包裹 `JSON.parse(content)`,失败抛 `文档大纲生成失败,请重试`

### 4. 后端:`server/src/works/works.service.ts`

文件顶部 `import * as mammoth from 'mammoth';`

在 `extractPdfPages()`(L93-111)后新增 `extractWordOutline(userId, fileBuffer, style, opts)`:

```
1. mammoth.extractRawText({ buffer: fileBuffer }) → { value: text }
2. 空文档守卫:text.trim().length < 10 → BadRequestException('Word 文档内容为空')
3. 截断:text > 8000 字 → 截断,记录 textTruncated=true
4. 调 this.evolinkText.generateOutlineFromDocument(text, style, opts)
5. slides > 15 → 截断,记录 truncated=true
6. 返回 { slideCount, truncated, originalCount, textTruncated, slides: [{idx, title, points}] }
```

mammoth 解析失败(损坏/非 docx)→ `try/catch` 抛 `BadRequestException('无法解析 Word 文档,请确认文件格式正确')`

**不修改 `generate()`**:Word 导入产出的就是标准 `outline`,无需 `pdfImport` 标志,无需 `referenceImages`。现有 `generate()` 流程完全复用。

### 5. 后端:`server/src/works/works.controller.ts`

在 `uploadPdf`(L59-65)后新增 `@Post('upload/word')`:
- `@UseInterceptors(FileInterceptor('file', wordUploadConfig))`
- `@UploadedFile() file` + `@Body() body`(style, language, detailLevel, pageCount, category, customCategory, customStyle)
- 调 `this.works.extractWordOutline(req.user.userId, file.buffer, body.style ?? 'none', { ... })`
- 免费端点(无余额检查),与 `uploadPdf`、`generateOutline` 一致

### 6. 前端:`client/src/api/upload.ts`

在 `uploadPdf`(L4-16)后新增 `uploadWord(file, opts)`:
- FormData 追加 `file` + opts 各字段
- POST `/works/upload/word`,`timeout: 120000`
- 返回类型 `{ slideCount, truncated?, originalCount?, textTruncated?, slides: [{idx, title, points}] }`

### 7. 前端:`client/src/views/GenerateView.vue`

**保持 `pdfImport` 为 boolean ref**(L756),新增平行 `wordImport` ref,最小侵入修改:

**模板 L30-42 模式切换**:2 按钮 → 3 按钮
- "从主题生成" / "优化已有 PDF" / "导入 Word 文档"
- active 态:`!pdfImport && !wordImport` / `pdfImport` / `wordImport`
- `@click` 调 `switchCreateMode('topic' | 'pdf' | 'word')`

**新增 Word 上传 UI 块**(镜像 L44-80 PDF 上传块,`v-if="wordImport"`):
- 拖拽/点击上传,`accept=".docx"`,`ref="wordInput"`
- 提取中状态 `wordExtracting`(spinner)
- 已上传后显示"已提取 N 页大纲"+提示"点击重新上传"

**`switchCreateMode` 重构**(L838-844)→ 接收 mode 字符串:
- `'pdf'`:设 `pdfImport=true, wordImport=false`,强制 `form.mode='fine'`,清空 `pdfPages`
- `'word'`:设 `wordImport=true, pdfImport=false`,清空 `wordSlides`,**不强制 fine 模式**
- `'topic'`:两者都 false

**新增 `handleWordUpload(file)`**(镜像 `handlePdfUpload` L792-819):
- 校验 20MB
- 调 `uploadWord(file, { style, customStyle, language, detailLevel, pageCount, category, customCategory })`
- 成功后:
  - `wordSlides.value = data.slides`
  - **直接填充 `outline.value`** = slides 映射为 `{ _key, title, pointsText: points.join('\n'), points }`
  - `form.pageCount = data.slideCount`
  - 若 `form.prompt` 为空,用首张标题作默认主题
  - `truncated` / `textTruncated` → `ElMessage.warning`
  - **跳到 `step.value = 1`(大纲编辑器)**,跳过 `proceedToMode()`,因为大纲已就绪
- 失败:拦截器处理

**新增 `triggerWordInput` / `onWordChange` / `onWordDrop`**(镜像 PDF 同名方法 L821-834)

**`resetAll()`(L1124-1131)**:追加 `wordImport.value = false; wordSlides.value = []`

**生成 payload(L1009-1010)**:无需修改。`pdfImport` 会是 false(因 `switchCreateMode('word')` 时设了 `pdfImport=false`),`referenceImages` 会是 undefined,`outline` 已填充。

## 边界情况处理

| 情况 | 处理 |
|---|---|
| 空 docx | `text.trim().length < 10` → 400 "Word 文档内容为空" |
| 无标题结构的 docx | mammoth `extractRawText` 返回扁平文本,LLM 提示词已涵盖"若无自然章节,按内容流逻辑切分" |
| 超长 docx(>8000 字) | 截断文本,`textTruncated=true` 返回前端,`ElMessage.warning` 提示 |
| 大纲 > 15 页 | 截断到 15 页,`truncated=true` 返回前端 |
| LLM 返回非法 JSON | `try/catch` 包裹 `JSON.parse`,抛 "文档大纲生成失败,请重试" |
| 损坏的 .docx | mammoth 抛错 → `try/catch` → 400 "无法解析 Word 文档,请确认文件格式正确" |

## 关键文件

- [server/src/works/upload.config.ts](file:///c:/Users/21875/Desktop/ppt%E6%B5%B7%E6%8A%A5%E5%88%B6%E4%BD%9C%E5%99%A8/server/src/works/upload.config.ts) — 新增 `wordUploadConfig`
- [server/src/works/evolink-text.service.ts](file:///c:/Users/21875/Desktop/ppt%E6%B5%B7%E6%8A%A5%E5%88%B6%E4%BD%9C%E5%99%A8/server/src/works/evolink-text.service.ts) — 新增 `generateOutlineFromDocument()` 方法
- [server/src/works/works.service.ts](file:///c:/Users/21875/Desktop/ppt%E6%B5%B7%E6%8A%A5%E5%88%B6%E4%BD%9C%E5%99%A8/server/src/works/works.service.ts) — 新增 `extractWordOutline()` 方法,顶部 import mammoth
- [server/src/works/works.controller.ts](file:///c:/Users/21875/Desktop/ppt%E6%B5%B7%E6%8A%A5%E5%88%B6%E4%BD%9C%E5%99%A8/server/src/works/works.controller.ts) — 新增 `@Post('upload/word')` 端点
- [client/src/api/upload.ts](file:///c:/Users/21875/Desktop/ppt%E6%B5%B7%E6%8A%A5%E5%88%B6%E4%BD%9C%E5%99%A8/client/src/api/upload.ts) — 新增 `uploadWord()` 函数
- [client/src/views/GenerateView.vue](file:///c:/Users/21875/Desktop/ppt%E6%B5%B7%E6%8A%A5%E5%88%B6%E4%BD%9C%E5%99%A8/client/src/views/GenerateView.vue) — 3 段式模式切换、Word 上传 UI、`handleWordUpload()` 填充大纲并跳 step 1

## 验证步骤

1. `cd server && npm install mammoth` — 无原生编译错误
2. `npm run build`(server)— 无 TS 错误
3. `npx vue-tsc --noEmit`(client)— 无新 TS 错误(已有 WordView 错误可忽略)
4. 启动后端,Postman POST `/api/works/upload/word`(带 JWT + .docx 文件 + style/language 等表单字段)— 验证返回 `{slideCount, slides:[{idx,title,points}]}`
5. 测试空 .docx → 400 "Word 文档内容为空"
6. 测试超长 .docx(>8000 字)→ 响应含 `textTruncated: true`
7. 前端 dev server,GenerateView 点"导入 Word 文档"→ 上传 .docx → 验证跳到 step 1 且大纲已填充标题+要点
8. 编辑大纲(增删页)→ step 2 → 验证极速+精细模式都可选(不强制精细)
9. 生成 PPT → 验证走标准 `generate()` 流程,payload 无 `pdfImport`,无 `referenceImages`
