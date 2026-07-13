export type Resolution = '1K' | '2K' | '4K';
export type RenderQuality = 'low' | 'medium' | 'high';

export const DEFAULT_RESOLUTION: Resolution = '2K';
export const DEFAULT_RENDER_QUALITY: RenderQuality = 'high';

export const RESOLUTIONS: Resolution[] = ['1K', '2K', '4K'];
export const RENDER_QUALITIES: RenderQuality[] = ['low', 'medium', 'high'];

export function resolveResolution(v?: string): Resolution {
  return (v && RESOLUTIONS.includes(v as Resolution)) ? (v as Resolution) : DEFAULT_RESOLUTION;
}

export function resolveRenderQuality(v?: string): RenderQuality {
  return (v && RENDER_QUALITIES.includes(v as RenderQuality)) ? (v as RenderQuality) : DEFAULT_RENDER_QUALITY;
}

const POSTER_COST_MATRIX: Record<Resolution, Record<RenderQuality, number>> = {
  '1K': { low: 4, medium: 8, high: 18 },
  '2K': { low: 6, medium: 14, high: 30 },
  '4K': { low: 10, medium: 22, high: 45 },
};

export function posterCost(resolution: Resolution, quality: RenderQuality): number {
  return POSTER_COST_MATRIX[resolution][quality];
}

/** PPT 极速模式成本：单图 + 切图处理费（4K+high 时 = 50，与历史一致） */
export function pptFastCost(resolution: Resolution, quality: RenderQuality): number {
  return POSTER_COST_MATRIX[resolution][quality] + 20;
}

/** PPT 精细模式每页成本（4K+high 时 = 30/页，与历史一致） */
export function pptCostPerSlide(resolution: Resolution, quality: RenderQuality): number {
  return POSTER_COST_MATRIX[resolution][quality];
}
