/**
 * ISCS — International Style Classification System
 * 国际风格分类系统类型定义
 *
 * 三层分类: L1 文化圈 → L2 国别 → L3 风格变体
 * 标签格式: <L1>-<L2>-<L3>-<序号>  例: EAS-JP-MIN-01
 */

// ===== L1 文化圈 =====
export type CulturalSphere = 'EAS' | 'CEU' | 'WUS' | 'NOR' | 'MEA' | 'LAT';

export const CULTURAL_SPHERES: Record<CulturalSphere, { name_zh: string; name_en: string }> = {
  EAS: { name_zh: '东亚圈', name_en: 'East Asian' },
  CEU: { name_zh: '中欧圈', name_en: 'Central European' },
  WUS: { name_zh: '西美圈', name_en: 'Western American' },
  NOR: { name_zh: '北欧圈', name_en: 'Nordic' },
  MEA: { name_zh: '中东圈', name_en: 'Middle Eastern' },
  LAT: { name_zh: '拉美圈', name_en: 'Latin American' },
};

// ===== 风格变体类型 =====
export type StyleVariantCode = string; // e.g. "EAS-JP-MIN-01"

export type Alignment = 'left' | 'center' | 'right';
export type TextDensity = 'low' | 'medium' | 'high';
export type TabooAction = 'skip' | 'warn' | 'remove' | 'de_prioritize';
export type TabooType = 'number' | 'color' | 'gesture' | 'imagery' | 'text';

/** A 层 — 视觉参数:直接注入图像生成 Prompt */
export interface VisualParams {
  whitespace_ratio: { min: number; max: number };
  color_palette: {
    primary: string;
    secondary: string;
    accent: string;
    max_colors: number;
    description: string;
  };
  typography: {
    title_font: string;
    body_font: string;
    title_weight: number;
    line_height: number;
    description: string;
  };
  grid: {
    columns: number;
    gutter_ratio: number;
    description: string;
  };
  imagery: {
    style: string;
    filter: string;
    icon_style: string;
    description: string;
  };
  layout: {
    alignment: Alignment;
    title_position: string;
    text_density: TextDensity;
    description: string;
  };
}

/** B 层 — 叙事模板:影响 LLM 大纲生成的结构 */
export interface NarrativeTemplate {
  opening: string;
  structure: string[];
  argumentation: string;
  climax: string;
  closing: string;
  cta_style: string;
  description: string;
}

/** C 层 — 禁忌规则 */
export interface TabooRule {
  type: TabooType;
  value: number[] | string;
  context?: string;
  reason?: string;
  action: TabooAction;
}

/** D 层 — 元数据 */
export interface StyleMetadata {
  name_zh: string;
  name_en: string;
  description: string;
  design_philosophy: string;
  inspiration_sources: string[];
  applicable_scenarios: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  version: string;
}

/** 完整风格变体 */
export interface StyleVariant {
  code: StyleVariantCode;
  sphere: CulturalSphere;
  region: string;
  variant: string;
  visual: VisualParams;
  narrative: NarrativeTemplate;
  taboos: TabooRule[];
  metadata: StyleMetadata;
}

/** 禁忌扫描结果 */
export interface TabooScanResult {
  violations: TabooViolation[];
  hasViolations: boolean;
}

export interface TabooViolation {
  rule: TabooRule;
  context: string;
  suggestion: string;
}
