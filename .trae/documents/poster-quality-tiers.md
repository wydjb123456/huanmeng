# 海报质量档位功能

## Context

当前海报生成写死了 EvoLink API 最高参数（`resolution: '4K'` + `quality: 'high'`），固定收费 30 积分。用户希望新增"质量档位"选择（标准/高/极致），不同档位消耗不同积分，让用户在速度/质量/成本之间自主权衡。

EvoLink GPT Image 2 API 支持的参数（已通过官方文档确认）：
- `quality`: `low` / `medium` / `high` — `high` 触发完整推理链（理解-规划-生成-复审），`medium` 跳过复审，`low` 仅几秒出图
- `resolution`: `1K` / `2K` / `4K` — 分辨率档位，组合超过 8.29MP 自动缩放

## 质量档位映射

| 档位 (qualityTier) | resolution | quality | 海报积分 | 定位 |
|---|---|---|---|---|
| `standard` | 1K | medium | 10 | 快速预览，几秒出图 |
| `high`（默认） | 2K | high | 20 | 平衡质量与速度 |
| `ultra` | 4K | high | 30 | 最高品质（与改动前一致） |

定价逻辑：`ultra` 保持现有 30 积分不变；`high` 降一个分辨率等级（2K）定价 20；`standard` 用 1K+medium 定价 10。未严格按 API 30-50 倍价差线性映射，而是按用户可感知的价值梯度定价。

## 后端改动

### 1. 新增 `server/src/works/quality.config.ts`

集中定义档位映射表，供 `evolink.service.ts` 和 `works.service.ts` 共同引用：

```ts
export type QualityTier = 'standard' | 'high' | 'ultra';
export const DEFAULT_QUALITY_TIER: QualityTier = 'high';
export const QUALITY_TIERS: Record<QualityTier, { resolution: string; quality: string; posterCost: number }> = {
  standard: { resolution: '1K', quality: 'medium', posterCost: 10 },
  high:     { resolution: '2K', quality: 'high',    posterCost: 20 },
  ultra:    { resolution: '4K', quality: 'high',    posterCost: 30 },
};
```

### 2. `server/src/works/evolink.service.ts`（L15-53）

- `createImageTask` 新增第 4 个可选参数 `qualityTier`，**默认值设为 `'ultra'`**（不是 `high`），保证 PPT 侧不传该参数时仍走 4K+high，行为完全不变
- L20-27：不再写死 `resolution: '4K'` / `quality: 'high'`，改为从 `QUALITY_TIERS[qualityTier]` 读取
- 无效 `qualityTier` 回退到 `ultra`（向后兼容兜底）

**关键：默认 `'ultra'` 而非 `'high'`**，这样 PPT 的 `processFastMode`、`processFineMode`、`regenerateSlideInBackground` 三处调用不传该参数时，仍走 4K+high，行为零变化。

### 3. `server/src/works/poster.dto.ts`（L33 附近）

新增字段：
```ts
@IsOptional() @IsIn(['standard', 'high', 'ultra'])
qualityTier?: string;
```
Optional，默认值在 service 层补为 `'high'`，保证旧客户端不传时仍可工作。

### 4. `server/src/works/works.service.ts`

**a) 引入配置**：`import { QUALITY_TIERS, DEFAULT_QUALITY_TIER } from './quality.config'`

**b) 新增方法 `previewPosterCost(qualityTier)`**（与 `previewCost` 并列，L76 附近）：
```ts
previewPosterCost(qualityTier?: string) {
  const tier = (qualityTier as QualityTier) || DEFAULT_QUALITY_TIER;
  return QUALITY_TIERS[tier]?.posterCost ?? QUALITY_TIERS.high.posterCost;
}
```

**c) `generatePoster`（L127-181）**：
- L129：`const cost = 30` → `const qualityTier = (dto.qualityTier as QualityTier) || DEFAULT_QUALITY_TIER; const cost = QUALITY_TIERS[qualityTier].posterCost`
- L149-174 `prisma.work.create` 的 data：新增 `qualityTier` 字段存入 Work 记录

**d) `processPoster`（L183-229）**：
- L196：`createImageTask(prompt, dto.aspectRatio, imageUrls)` → 末尾加 `dto.qualityTier || DEFAULT_QUALITY_TIER`
- L227：`failWork(workId, userId, err.message, 30)` 中硬编码 `30` → 从 Work 记录读 `qualityTier` 后映射 cost（异步执行，从 DB 读更稳健）

### 5. `server/src/works/works.controller.ts`（L44-48）

`/works/cost` 端点扩展：新增 `type` 和 `qualityTier` 查询参数。若 `type === 'poster'`，调用 `previewPosterCost(qualityTier)`；否则走原有 PPT 逻辑。保持向后兼容（不传 type 时默认 PPT）。

### 6. `server/prisma/schema.prisma` Work 模型

新增字段：
```
qualityTier String @default("high")
```
执行 `npx prisma db push --accept-data-loss`（SQLite ADD COLUMN with DEFAULT 对存量数据安全，现有记录自动填充 `high`）。

## 前端改动

### `client/src/views/PosterView.vue`

**a) form 对象（L335-346）**：新增 `qualityTier: 'high'`

**b) 新增 `qualityTiers` 选项数组**（L368 附近，与 `aspectRatios` 同级）：
```ts
const qualityTiers = [
  { value: 'standard', label: '标准', desc: '1K · 快速预览' },
  { value: 'high',     label: '高',   desc: '2K · 推荐' },
  { value: 'ultra',    label: '极致', desc: '4K · 最高品质' },
];
```

**c) 新增 `computePosterCost` 函数**（参考 GenerateView 的 `computeCost` 模式）：
```ts
function computePosterCost(tier: string) {
  const map: Record<string, number> = { standard: 10, high: 20, ultra: 30 };
  return map[tier] ?? 20;
}
```

**d) UI：质量档位选择区**（插入到 "04 / Format" 区块内，尺寸比例下方、输出语言上方，即 L171 和 L173 之间）：
- 参考 `aspectRatio` 按钮组模式（L155-170）
- 3 列按钮组，选中态 `border-ink-900 bg-ink-900 text-white`
- 每项显示 label + desc（分辨率说明）
- **不**用 `v-if="!form.freeMode"` 隐藏（自由模式也能选档位）

**e) 费用展示区动态化（L188-215）**：
- L192：`30` → `{{ computePosterCost(form.qualityTier) }}`
- L201、L208：`< 30` → `< computePosterCost(form.qualityTier)`
- L7 页头副标题：`30 积分/张` → `{{ computePosterCost(form.qualityTier) }} 积分/张`（或改为"按质量档位计费"）

**f) `generate` 函数提交参数（L481-492）**：payload 新增 `qualityTier: form.qualityTier`

## 不改动的部分

- **PPT 不加质量档位**（本次 Phase 1 仅海报）：`createImageTask` 默认 `'ultra'` 保证 PPT 行为不变
- **WorksView**：本次不在作品列表展示档位标签
- **GenerateView**：PPT 页面不改

## 验证步骤

1. **后端重启** → 检查启动日志无错误，路由正常映射
2. **DTO 校验**：传无效 `qualityTier: 'foo'` → 400 拒绝
3. **三档生成测试**（用测试01账号 id=1，跳过扣费）：
   - `standard` → 201，cost=10，API 调用用 1K+medium
   - `high` → 201，cost=20，API 调用用 2K+high
   - `ultra` → 201，cost=30，API 调用用 4K+high（与改动前一致）
4. **退款验证**：`standard` 档失败 → 退款 10 积分（非 30）
5. **费用预览接口**：
   - `GET /works/cost?type=poster&qualityTier=standard` → `{ cost: 10 }`
   - `GET /works/cost?mode=fine&slideCount=9`（不传 type）→ PPT 逻辑不变
6. **前端验证**：
   - 切换档位 → 费用数字实时变化
   - 余额不足时按钮禁用
   - Network 请求 body 含 `qualityTier`
7. **PPT 回归**：极速/精细模式生成正常，API 仍用 4K+high（默认参数）

## 边界情况

- **PPT 兼容性**：`createImageTask` 默认 `'ultra'` 而非 `'high'`，PPT 调用零影响
- **异步退款**：`processPoster` 失败时从 Work 记录读 qualityTier 计算退款，避免 dto 与 DB 不一致
- **测试账号**：`isTestUser(userId=1)` 跳过扣费/退款，所有档位可无限生成
- **freeMode 自由出图**：也走 `processPoster`，同样支持档位
- **存量数据**：迁移后现有 Work 记录 `qualityTier` 为 `high`，已完成作品不再退款，无影响
- **出图时间**：`standard` 用 medium quality，几秒出图，前端轮询（3秒间隔，最多4分钟）仍适用
