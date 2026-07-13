/**
 * ISCS 风格引擎
 *
 * 职责:
 * 1. 按 code 加载风格变体
 * 2. 将视觉参数转化为图像生成 Prompt 片段
 * 3. 将叙事模板转化为大纲生成 Prompt 片段
 * 4. 支持文化融合(两个风格取中值)
 */
import { Injectable } from '@nestjs/common';
import { STYLE_MAP, STYLE_VARIANTS } from './style-variants';
import { resolveStyle } from './style-engine-resolver';
import type {
  StyleVariant,
  StyleVariantCode,
  CulturalSphere,
  VisualParams,
  NarrativeTemplate,
} from './iscs.types';

@Injectable()
export class StyleEngineService {
  /** 按 code 获取风格变体,不存在返回 null */
  getVariant(code?: string): StyleVariant | null {
    if (!code) return null;
    return STYLE_MAP[code] ?? null;
  }

  /** 列出所有可用风格(前端选择器用) */
  listVariants() {
    return STYLE_VARIANTS.map((v) => ({
      code: v.code,
      sphere: v.sphere,
      region: v.region,
      name_zh: v.metadata.name_zh,
      name_en: v.metadata.name_en,
      description: v.metadata.description,
      design_philosophy: v.metadata.design_philosophy,
      difficulty: v.metadata.difficulty,
      applicable_scenarios: v.metadata.applicable_scenarios,
    }));
  }

  /** 按文化圈筛选 */
  listBySphere(sphere: CulturalSphere) {
    return STYLE_VARIANTS.filter((v) => v.sphere === sphere);
  }

  /**
   * 生成视觉风格 Prompt 片段 — 注入图像生成 Prompt
   * 返回一段英文描述,可拼入 buildSlidePrompt / buildGridPrompt / buildPosterPrompt
   */
  buildVisualPrompt(code?: string): string {
    const variant = this.getVariant(code);
    if (!variant) return '';

    const v = variant.visual;
    const parts: string[] = [];

    parts.push(`Cultural design DNA: ${variant.metadata.name_en} (${variant.metadata.design_philosophy})`);

    // 配色
    parts.push(
      `Color palette: ${v.color_palette.description}. Use max ${v.color_palette.max_colors} colors — ` +
        `primary ${v.color_palette.primary}, secondary ${v.color_palette.secondary}, ` +
        `accent ${v.color_palette.accent} used sparingly.`,
    );

    // 留白
    const wsPct = Math.round(((v.whitespace_ratio.min + v.whitespace_ratio.max) / 2) * 100);
    parts.push(`Whitespace: aim for ~${wsPct}% negative space. ${v.layout.description}.`);

    // 字体
    parts.push(`Typography: ${v.typography.description}. Title font: ${v.typography.title_font}.`);

    // 网格
    parts.push(`Grid: ${v.grid.description}.`);

    // 图像风格
    parts.push(`Imagery: ${v.imagery.description}. Image style: ${v.imagery.style}, filter: ${v.imagery.filter}.`);

    // 布局
    parts.push(
      `Layout: ${v.layout.alignment} alignment, title at ${v.layout.title_position}, ` +
        `${v.layout.text_density} text density.`,
    );

    return parts.join('\n');
  }

  /**
   * 生成叙事模板 Prompt 片段 — 注入大纲生成 system prompt
   * 返回英文指令,指导 LLM 如何组织大纲结构
   */
  buildNarrativePrompt(code?: string): string {
    const variant = this.getVariant(code);
    if (!variant) return '';

    const n = variant.narrative;
    const parts: string[] = [];

    parts.push(`Narrative DNA: ${variant.metadata.name_en} — ${n.description}`);
    parts.push(`Opening strategy: ${n.opening}. The deck should NOT start with the topic directly.`);
    parts.push(`Argumentation style: ${n.argumentation}.`);
    parts.push(`Climax approach: ${n.climax}.`);
    parts.push(`Closing strategy: ${n.closing}.`);
    parts.push(`CTA style: ${n.cta_style} (not aggressive).`);
    parts.push(`Suggested narrative arc: ${n.structure.join(' → ')}.`);

    return parts.join('\n');
  }

  /**
   * 文化融合 — 两个风格取中值
   * 冲突参数取平均值,非冲突参数保留各自特色
   */
  fuseVariants(codeA: string, codeB: string): StyleVariant | null {
    const a = this.getVariant(codeA);
    const b = this.getVariant(codeB);
    if (!a || !b) return null;

    const avg = (x: { min: number; max: number }, y: { min: number; max: number }) => ({
      min: +((x.min + y.min) / 2).toFixed(2),
      max: +((x.max + y.max) / 2).toFixed(2),
    });

    const fusedVisual: VisualParams = {
      ...a.visual,
      whitespace_ratio: avg(a.visual.whitespace_ratio, b.visual.whitespace_ratio),
      color_palette: {
        ...a.visual.color_palette,
        description: `${a.metadata.name_en} palette + ${b.metadata.name_en} palette, harmonized`,
      },
    };

    const fusedNarrative: NarrativeTemplate = {
      ...a.narrative,
      description: `Fusion of ${a.metadata.name_en} and ${b.metadata.name_en} narrative approaches`,
    };

    return {
      code: `${a.code}+${b.code}`,
      sphere: a.sphere,
      region: `${a.region}+${b.region}`,
      variant: 'FUS',
      visual: fusedVisual,
      narrative: fusedNarrative,
      taboos: [...a.taboos, ...b.taboos],
      metadata: {
        name_zh: `${a.metadata.name_zh}×${b.metadata.name_zh}`,
        name_en: `${a.metadata.name_en} × ${b.metadata.name_en}`,
        description: `文化融合:${a.metadata.name_zh}与${b.metadata.name_zh}的混血设计`,
        design_philosophy: `${a.metadata.design_philosophy} + ${b.metadata.design_philosophy}`,
        inspiration_sources: [...a.metadata.inspiration_sources, ...b.metadata.inspiration_sources],
        applicable_scenarios: [...a.metadata.applicable_scenarios, ...b.metadata.applicable_scenarios],
        difficulty: 'advanced',
        version: '1.0.0',
      },
    };
  }

  /**
   * 解析风格标签 — 支持融合标签 (A+B)
   * 返回最终的风格变体(融合或单一)
   */
  resolveStyle(code?: string): StyleVariant | null {
    return resolveStyle(code);
  }
}
