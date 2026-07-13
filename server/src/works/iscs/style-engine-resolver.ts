/**
 * 风格解析辅助 — 避免 service 之间的循环依赖
 */
import { STYLE_MAP } from './style-variants';
import type { StyleVariant } from './iscs.types';

/** 解析风格标签(支持融合标签 A+B)→ 返回风格变体 */
export function resolveStyle(code?: string): StyleVariant | null {
  if (!code) return null;

  if (code.includes('+')) {
    const [a, b] = code.split('+');
    const va = STYLE_MAP[a.trim()];
    const vb = STYLE_MAP[b.trim()];
    if (!va || !vb) return null;

    const avg = (x: { min: number; max: number }, y: { min: number; max: number }) => ({
      min: +((x.min + y.min) / 2).toFixed(2),
      max: +((x.max + y.max) / 2).toFixed(2),
    });

    return {
      code: `${va.code}+${vb.code}`,
      sphere: va.sphere,
      region: `${va.region}+${vb.region}`,
      variant: 'FUS',
      visual: {
        ...va.visual,
        whitespace_ratio: avg(va.visual.whitespace_ratio, vb.visual.whitespace_ratio),
        color_palette: {
          ...va.visual.color_palette,
          description: `${va.metadata.name_en} + ${vb.metadata.name_en} harmonized palette`,
        },
      },
      narrative: {
        ...va.narrative,
        description: `Fusion of ${va.metadata.name_en} and ${vb.metadata.name_en}`,
      },
      taboos: [...va.taboos, ...vb.taboos],
      metadata: {
        name_zh: `${va.metadata.name_zh}×${vb.metadata.name_zh}`,
        name_en: `${va.metadata.name_en} × ${vb.metadata.name_en}`,
        description: `文化融合:${va.metadata.name_zh}与${vb.metadata.name_zh}的混血设计`,
        design_philosophy: `${va.metadata.design_philosophy} + ${vb.metadata.design_philosophy}`,
        inspiration_sources: [...va.metadata.inspiration_sources, ...vb.metadata.inspiration_sources],
        applicable_scenarios: [...va.metadata.applicable_scenarios, ...vb.metadata.applicable_scenarios],
        difficulty: 'advanced',
        version: '1.0.0',
      },
    };
  }

  return STYLE_MAP[code] ?? null;
}
