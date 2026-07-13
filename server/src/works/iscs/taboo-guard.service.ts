/**
 * ISCS 禁忌守卫
 *
 * 职责:
 * 扫描已生成的内容(大纲/页码/图像 prompt),检测是否违反文化禁忌规则。
 * 返回违规列表 + 修复建议。
 *
 * 扫描维度:
 * 1. 页码禁忌 — 某些数字在特定文化中不吉(如 4/9 在日本)
 * 2. 颜色禁忌 — 某些配色组合在特定文化中有负面联想
 * 3. 手势/图像禁忌 — 某些手势或意象在特定文化中冒犯
 * 4. 文本禁忌 — 某些表达方式在特定文化中不妥
 */
import { Injectable } from '@nestjs/common';
import type { TabooRule, TabooScanResult, TabooViolation } from './iscs.types';
import { resolveStyle } from './style-engine-resolver';

@Injectable()
export class TabooGuardService {
  /**
   * 扫描页码列表 — 检查是否包含禁忌数字
   * @param pageCount 总页数
   * @param styleCode 风格标签
   */
  scanPageNumbers(pageCount: number, styleCode?: string): TabooScanResult {
    const variant = resolveStyle(styleCode);
    if (!variant) return { violations: [], hasViolations: false };

    const numberTaboos = variant.taboos.filter((t) => t.type === 'number' && t.context === 'page_number');
    if (numberTaboos.length === 0) return { violations: [], hasViolations: false };

    const violations: TabooViolation[] = [];
    const pages = Array.from({ length: pageCount }, (_, i) => i + 1);

    for (const rule of numberTaboos) {
      const badNumbers = rule.value as number[];
      for (const pageNum of pages) {
        if (badNumbers.includes(pageNum)) {
          violations.push({
            rule,
            context: `第 ${pageNum} 页`,
            suggestion: `页码 ${pageNum} 在此文化中不吉(${rule.reason})— 建议调整页数到 ${pageCount + 1} 页以跳过此数字`,
          });
        }
      }
    }

    return { violations, hasViolations: violations.length > 0 };
  }

  /**
   * 扫描图像 Prompt — 检查是否包含禁忌意象
   * @param prompt 图像生成 prompt
   * @param styleCode 风格标签
   */
  scanImagePrompt(prompt: string, styleCode?: string): TabooScanResult {
    const variant = resolveStyle(styleCode);
    if (!variant) return { violations: [], hasViolations: false };

    const violations: TabooViolation[] = [];
    const lowerPrompt = prompt.toLowerCase();

    for (const rule of variant.taboos) {
      const violation = this.checkRule(rule, lowerPrompt);
      if (violation) violations.push(violation);
    }

    return { violations, hasViolations: violations.length > 0 };
  }

  /**
   * 扫描大纲 — 检查叙事结构是否违反禁忌
   * @param slides 大纲数组
   * @param styleCode 风格标签
   */
  scanOutline(slides: { title: string; points: string[] }[], styleCode?: string): TabooScanResult {
    const variant = resolveStyle(styleCode);
    if (!variant) return { violations: [], hasViolations: false };

    const violations: TabooViolation[] = [];
    const allText = slides.map((s) => `${s.title} ${s.points.join(' ')}`).join(' ').toLowerCase();

    for (const rule of variant.taboos) {
      const violation = this.checkRule(rule, allText);
      if (violation) violations.push(violation);
    }

    return { violations, hasViolations: violations.length > 0 };
  }

  /** 检查单条规则 */
  private checkRule(rule: TabooRule, text: string): TabooViolation | null {
    const trigger = this.getTrigger(rule);
    if (!trigger) return null;

    const triggers = Array.isArray(trigger) ? trigger : [trigger];
    const matched = triggers.some((t) => text.includes(t.toLowerCase()));

    if (!matched) return null;

    return {
      rule,
      context: `在内容中检测到: ${triggers.join(', ')}`,
      suggestion: this.buildSuggestion(rule),
    };
  }

  /** 从规则值提取触发词 */
  private getTrigger(rule: TabooRule): string | string[] | null {
    if (rule.type === 'number') return null; // 数字在页码扫描中处理
    if (rule.type === 'color') return rule.value as string;
    if (rule.type === 'gesture') return rule.value as string;
    if (rule.type === 'imagery') {
      // 从意象描述中提取关键词
      const val = rule.value as string;
      return val.split('_').filter((w) => w.length > 2);
    }
    if (rule.type === 'text') return rule.value as string;
    return null;
  }

  /** 构建修复建议 */
  private buildSuggestion(rule: TabooRule): string {
    const actionMap: Record<string, string> = {
      skip: '跳过此元素',
      warn: '警告:请确认此元素是否合适',
      remove: '移除此元素',
      de_prioritize: '降低此元素的优先级或移除',
    };
    const action = actionMap[rule.action] || rule.action;
    return `${action} — 原因: ${rule.reason}`;
  }
}
