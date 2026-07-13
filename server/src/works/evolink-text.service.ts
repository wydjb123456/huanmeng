import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StyleEngineService } from './iscs/style-engine.service';

const DIRECT_BASE = 'https://direct.evolink.ai/v1';

export interface OutlineSlide {
  title: string;
  points: string[];
}

export interface OutlineOptions {
  category?: string;
  customCategory?: string;
  customStyle?: string;
  language?: string;
  detailLevel?: string;
  pageCount?: number;
  /** ISCS 国际风格标签 — 注入叙事模板 */
  styleTag?: string;
}

@Injectable()
export class EvolinkTextService {
  private readonly logger = new Logger(EvolinkTextService.name);
  private readonly apiKey: string;

  constructor(
    private config: ConfigService,
    private styleEngine: StyleEngineService,
  ) {
    this.apiKey = this.config.get<string>('EVOLINK_TEXT_API_KEY', '') || this.config.get<string>('EVOLINK_API_KEY', '');
  }

  async generateOutline(topic: string, style: string, opts: OutlineOptions = {}): Promise<OutlineSlide[]> {
    const category = opts.category ?? 'business';
    const customCategory = opts.customCategory ?? '';
    const language = opts.language ?? 'zh';
    const detailLevel = opts.detailLevel ?? 'standard';
    const targetCount = opts.pageCount ?? 9;

    const langHint = this.languageHint(language);
    const categoryHint = this.categoryHint(category, customCategory);
    const detailHint = this.detailHint(detailLevel);
    const styleHint = this.styleHint(style, opts.customStyle);
    const iscsNarrative = this.styleEngine.buildNarrativePrompt(opts.styleTag);

    const systemPrompt = `You are a senior presentation designer crafting a ${categoryHint} deck.

Topic: ${topic}
Target language: ${langHint}
Visual style: ${styleHint}
Detail level: ${detailHint}
Number of slides: target ${targetCount} (between ${Math.max(2, targetCount - 2)} and ${Math.min(15, targetCount + 2)}).

${this.categoryStructureGuide(category, customCategory)}
${iscsNarrative ? `\n${iscsNarrative}\n` : ''}
Output STRICT JSON only, no markdown fences, no commentary. Format:
{"slides":[{"title":"...","points":["...","..."]}]}

Rules:
- Title in ${langHint}, max 25 chars
- Each slide has ${detailLevel === 'brief' ? '1-2' : detailLevel === 'detailed' ? '3-5' : '2-4'} bullet points
- Each point max 40 chars, in ${langHint}
- First slide: cover/title slide
- Last slide: closing/Q&A slide
- Middle slides: content slides matching the category structure${iscsNarrative ? '\n- CRITICAL: Follow the Narrative DNA instructions above to shape the storytelling arc' : ''}`;

    const res = await fetch(`${DIRECT_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5.1-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: topic },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`Outline API failed: ${res.status} ${text}`);
      throw new Error(`大纲生成失败: ${res.status}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(content);
    const slides: OutlineSlide[] = (parsed.slides ?? parsed ?? []).map((s: any) => ({
      title: String(s.title ?? '').slice(0, 50),
      points: Array.isArray(s.points) ? s.points.map((p: any) => String(p).slice(0, 100)) : [],
    })).filter((s: OutlineSlide) => s.title);

    if (slides.length === 0) {
      throw new Error('大纲为空，请重试或调整主题');
    }
    return slides;
  }

  /** 基于文档全文重构为幻灯片大纲（不丢失关键内容） */
  async generateOutlineFromDocument(docText: string, style: string, opts: OutlineOptions = {}): Promise<OutlineSlide[]> {
    const category = opts.category ?? 'business';
    const customCategory = opts.customCategory ?? '';
    const language = opts.language ?? 'zh';
    const detailLevel = opts.detailLevel ?? 'standard';
    const targetCount = opts.pageCount ?? 9;

    const langHint = this.languageHint(language);
    const categoryHint = this.categoryHint(category, customCategory);
    const detailHint = this.detailHint(detailLevel);
    const styleHint = this.styleHint(style, opts.customStyle);

    const systemPrompt = `You are a senior presentation designer. The user has provided a document. Your task is to RESTRUCTURE this document's content into a presentation deck — NOT to summarize it away. Preserve the document's key information, data points, and arguments. Reorganize the content into logical slides with clear titles and concise bullet points.

Document text:
---
${docText}
---

Target language: ${langHint}
Visual style: ${styleHint}
Detail level: ${detailHint}
Number of slides: target ${targetCount} (between ${Math.max(2, targetCount - 2)} and 15).

${this.categoryStructureGuide(category, customCategory)}

Output STRICT JSON only, no markdown fences, no commentary. Format:
{"slides":[{"title":"...","points":["...","..."]}]}

Rules:
- PRESERVE key content from the document — do not over-summarize or lose important details
- Extract concrete data, names, and specifics from the document — do not generalize them away
- If the document has natural sections/headings, use them as slide boundaries
- Each slide title: max 25 chars, in ${langHint}
- Each slide has ${detailLevel === 'brief' ? '1-2' : detailLevel === 'detailed' ? '3-5' : '2-4'} bullet points
- Each point max 60 chars, in ${langHint}
- First slide: cover/title slide based on document's main topic
- Last slide: closing/summary slide`;

    const res = await fetch(`${DIRECT_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5.1-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: '请将上述文档内容重构为幻灯片大纲。' },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`Outline-from-doc API failed: ${res.status} ${text}`);
      throw new Error(`文档大纲生成失败: ${res.status}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error('文档大纲生成失败，请重试');
    }
    const slides: OutlineSlide[] = (parsed.slides ?? parsed ?? []).map((s: any) => ({
      title: String(s.title ?? '').slice(0, 50),
      points: Array.isArray(s.points) ? s.points.map((p: any) => String(p).slice(0, 100)) : [],
    })).filter((s: OutlineSlide) => s.title);

    if (slides.length === 0) {
      throw new Error('文档大纲为空，请重试或调整文档');
    }
    return slides;
  }

  private languageHint(language: string): string {
    const map: Record<string, string> = {
      zh: 'Simplified Chinese (简体中文)',
      en: 'English',
      bilingual: 'bilingual — title in Chinese with English subtitle, points in Chinese',
    };
    return map[language] ?? map.zh;
  }

  private categoryHint(category: string, customCategory?: string): string {
    if (category === 'custom' && customCategory) {
      return `custom: ${customCategory}`;
    }
    if (category === 'none') {
      return 'general / unconstrained';
    }
    const map: Record<string, string> = {
      business: 'business plan / corporate',
      academic: 'academic / research',
      product: 'product launch / showcase',
      education: 'educational / teaching',
      marketing: 'marketing / brand storytelling',
      personal: 'personal portfolio / storytelling',
    };
    return map[category] ?? map.business;
  }

  private detailHint(level: string): string {
    const map: Record<string, string> = {
      brief: 'brief — minimal text, focus on visuals',
      standard: 'standard — balanced text and visuals',
      detailed: 'detailed — richer text content and data',
    };
    return map[level] ?? map.standard;
  }

  private styleHint(style: string, customStyle?: string): string {
    if (style === 'custom' && customStyle) {
      return customStyle;
    }
    if (style === 'none') {
      return 'no specific style constraint — let the AI choose an appropriate visual style based on the topic';
    }
    const map: Record<string, string> = {
      business: 'professional corporate, blue/white palette, formal tone',
      minimal: 'minimalist, lots of whitespace, simple shapes, monochrome',
      creative: 'vibrant, bold colors, dynamic layouts, modern illustrations',
      academic: 'formal academic, serif typography, data-driven, charts',
    };
    return map[style] ?? map.business;
  }

  /** 提示词优化：把简短描述扩展为详细提示词 */
  async enhancePrompt(input: string, type: 'ppt' | 'poster'): Promise<{ enhanced: string; suggestions: string[] }> {
    const typeHint = type === 'poster'
      ? 'a single high-impact poster (one image, no slides, no panels)'
      : 'a slide deck / presentation';

    const systemPrompt = `You are a prompt engineer specializing in AI image generation. The user wants to generate ${typeHint}. Improve their prompt to be more vivid, specific, and effective.

Output STRICT JSON only:
{"enhanced":"...","suggestions":["tip1","tip2","tip3"]}

Rules:
- "enhanced": a single improved prompt, 80-200 chars, in the SAME language as the input
- Add concrete visual details: color palette, mood, composition, key visual elements
- Keep the user's core intent; do not invent unrelated content
- Do NOT include technical params (size, resolution) — those are handled elsewhere
- "suggestions": 3 short tips (max 50 chars each) on what user could add/improve
- All text in the same language as the input (Chinese input → Chinese output)`;

    const res = await fetch(`${DIRECT_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5.1-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: input },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`Enhance API failed: ${res.status} ${text}`);
      throw new Error(`提示词优化失败: ${res.status}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(content);
    return {
      enhanced: String(parsed.enhanced ?? '').slice(0, 500),
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 5).map((s: any) => String(s).slice(0, 80)) : [],
    };
  }

  /** 生成 Word 文档章节大纲 */
  async generateWordOutline(topic: string, style: string, opts: OutlineOptions = {}): Promise<{ title: string; summary: string }[]> {
    const category = opts.category ?? 'business';
    const customCategory = opts.customCategory ?? '';
    const language = opts.language ?? 'zh';
    const detailLevel = opts.detailLevel ?? 'standard';
    const targetCount = opts.pageCount ?? 8;

    const langHint = this.languageHint(language);
    const categoryHint = this.categoryHint(category, customCategory);
    const detailHint = this.detailHint(detailLevel);
    const styleHint = this.styleHint(style, opts.customStyle);

    const systemPrompt = `You are a senior document editor structuring a ${categoryHint} document (not slides — a written document with chapters).

Topic: ${topic}
Target language: ${langHint}
Writing style: ${styleHint}
Detail level: ${detailHint}
Number of chapters: target ${targetCount} (between ${Math.max(2, targetCount - 2)} and ${Math.min(20, targetCount + 2)}).

Output STRICT JSON only, no markdown fences:
{"sections":[{"title":"...","summary":"..."}]}

Rules:
- Title in ${langHint}, max 30 chars, chapter-style (not slide-style)
- Summary: 1-2 sentences describing what this chapter covers, max 80 chars, in ${langHint}
- First chapter: introduction/overview
- Last chapter: conclusion/summary
- Middle chapters: logical content progression`;

    const res = await fetch(`${DIRECT_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5.1-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: topic },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`Word outline API failed: ${res.status} ${text}`);
      throw new Error(`文档大纲生成失败: ${res.status}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(content);
    const sections: { title: string; summary: string }[] = (parsed.sections ?? parsed ?? []).map((s: any) => ({
      title: String(s.title ?? '').slice(0, 60),
      summary: String(s.summary ?? '').slice(0, 150),
    })).filter((s: { title: string }) => s.title);

    if (sections.length === 0) {
      throw new Error('大纲为空，请重试或调整主题');
    }
    return sections;
  }

  /** 生成 Word 文档单章节正文 */
  async generateWordSection(
    topic: string,
    sectionTitle: string,
    sectionSummary: string,
    prevSections: { title: string; content?: string }[],
    style: string,
    opts: OutlineOptions = {},
  ): Promise<string> {
    const language = opts.language ?? 'zh';
    const detailLevel = opts.detailLevel ?? 'standard';
    const langHint = this.languageHint(language);
    const detailHint = this.detailHint(detailLevel);
    const styleHint = this.styleHint(style, opts.customStyle);

    const wordCount = detailLevel === 'brief' ? '400-800' : detailLevel === 'detailed' ? '1200-2500' : '800-1500';

    const prevContext = prevSections.length > 0
      ? `\nPrevious chapters (for context, do NOT repeat their content):\n${prevSections.map((s, i) => `${i + 1}. ${s.title}${s.content ? ` (已写: ${s.content.slice(0, 100)}...)` : ''}`).join('\n')}`
      : '';

    const systemPrompt = `You are a professional writer drafting a single chapter of a document.

Document topic: ${topic}
Current chapter title: ${sectionTitle}
Chapter summary: ${sectionSummary}
Language: ${langHint}
Writing style: ${styleHint}
Detail level: ${detailHint}
Target word count: ${wordCount} words (Chinese characters).
${prevContext}

Write the full chapter body in ${langHint}. Use Markdown formatting:
- Use ## for the chapter title (already given, restate it as a level-2 heading)
- Use ### for sub-sections within the chapter
- Use paragraphs, bullet lists, and numbered lists where appropriate
- Do NOT include the document title or other chapters
- Write substantive, coherent content — not placeholders or outlines
- Output the chapter body only, no meta-commentary, no JSON`;

    const res = await fetch(`${DIRECT_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5.1-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Please write the chapter: "${sectionTitle}". ${sectionSummary}` },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`Word section API failed: ${res.status} ${text}`);
      throw new Error(`章节生成失败: ${res.status}`);
    }

    const data = await res.json();
    const body = String(data.choices?.[0]?.message?.content ?? '').trim();
    if (!body) {
      throw new Error('章节内容为空，请重试');
    }
    return body;
  }

  /** 图片反推风格提示词：分析图片视觉风格，输出可用于 AI 图像生成的风格描述 */
  async reverseStyleFromImage(imageBuffer: Buffer, mimeType: string): Promise<string> {
    const base64 = imageBuffer.toString('base64');
    const dataUri = `data:${mimeType};base64,${base64}`;

    const systemPrompt = `You are a visual style analyst. Analyze the provided image and output a concise style description suitable for use as an AI image generation prompt.

Analyze: color palette (specific colors), composition, art style, mood/atmosphere, lighting, textures, and any distinctive visual elements.

Output in Simplified Chinese (简体中文), 50-150 characters. Be concrete and specific — mention actual colors, techniques, and art movements where applicable. Do not describe the image content (what's in it), only the visual style. Output the style description text only, no JSON, no markdown, no preamble.`;

    const res = await fetch(`${DIRECT_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5.1-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: '请分析这张图片的视觉风格，输出风格描述。' },
              { type: 'image_url', image_url: { url: dataUri } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`Reverse style API failed: ${res.status} ${text}`);
      throw new Error(`风格反推失败: ${res.status}`);
    }

    const data = await res.json();
    const style = String(data.choices?.[0]?.message?.content ?? '').trim();
    if (!style) {
      throw new Error('风格分析结果为空，请重试');
    }
    return style.slice(0, 300);
  }


  /** 不同类目建议的章节结构 */
  private categoryStructureGuide(category: string, customCategory?: string): string {
    if (category === 'custom' && customCategory) {
      return `The user specified a custom category: "${customCategory}". Design a slide structure appropriate for this category. Include a cover slide, relevant content sections, and a closing slide. Adapt the structure to the topic and category naturally.`;
    }
    if (category === 'none') {
      return `No specific category constraint. Design a slide structure that naturally fits the topic — include a cover slide, relevant content sections, and a closing slide. Use your judgment to adapt the structure to the topic.`;
    }
    const map: Record<string, string> = {
      business: `Suggested structure for business plan:
- Cover: company name + tagline
- Vision/Mission
- Problem & Solution
- Market Analysis
- Product/Service Overview
- Business Model
- Financial Projections
- Team
- Roadmap
- Closing / CTA`,
      academic: `Suggested structure for academic report:
- Title + authors
- Background
- Research Question
- Methodology
- Results
- Discussion
- Limitations
- Conclusion
- References
- Q&A`,
      product: `Suggested structure for product launch:
- Cover: product name
- Problem
- Solution Overview
- Key Features (split across multiple slides if needed)
- Technical Specs
- Pricing
- Comparison
- Use Cases
- Roadmap
- Call to Action`,
      education: `Suggested structure for educational material:
- Title + topic intro
- Learning Objectives
- Key Concept 1
- Key Concept 2
- Examples
- Practice / Exercises
- Summary
- Further Reading`,
      marketing: `Suggested structure for marketing deck:
- Cover: brand / campaign name
- Brand Story
- Audience Insight
- Campaign Concept
- Channels & Tactics
- Creative Showcase
- Metrics / KPIs
- Timeline
- Budget
- Call to Action`,
      personal: `Suggested structure for personal portfolio:
- Cover: name + tagline
- About Me
- Skills
- Experience (split across slides if needed)
- Selected Projects
- Achievements
- Education
- Contact`,
    };
    return map[category] ?? map.business;
  }
}
