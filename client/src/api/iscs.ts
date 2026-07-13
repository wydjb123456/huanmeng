/**
 * ISCS 国际风格分类系统 — 前端 API
 */
import request from './request';

export interface StyleVariantSummary {
  code: string;
  sphere: 'EAS' | 'CEU' | 'WUS' | 'NOR' | 'MEA' | 'LAT';
  region: string;
  name_zh: string;
  name_en: string;
  description: string;
  design_philosophy: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  applicable_scenarios: string[];
}

export const CULTURAL_SPHERES: Record<string, { name_zh: string; name_en: string; color: string }> = {
  EAS: { name_zh: '东亚', name_en: 'East Asian', color: '#B22222' },
  CEU: { name_zh: '中欧', name_en: 'Central European', color: '#1A1A1A' },
  WUS: { name_zh: '西美', name_en: 'Western American', color: '#2563EB' },
  NOR: { name_zh: '北欧', name_en: 'Nordic', color: '#7C9885' },
  MEA: { name_zh: '中东', name_en: 'Middle Eastern', color: '#C9A961' },
  LAT: { name_zh: '拉美', name_en: 'Latin American', color: '#FF6B35' },
};

/** 获取所有可用风格变体 */
export function getStyles() {
  return request.get<{ styles: StyleVariantSummary[] }>('/works/styles');
}
