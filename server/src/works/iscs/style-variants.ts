/**
 * ISCS P0 风格变体定义库
 * 首批 6 个核心变体,覆盖 6 大文化圈
 */
import type { StyleVariant } from './iscs.types';

// ===== EAS-JP-MIN-01: 日式极简 =====
export const EAS_JP_MIN_01: StyleVariant = {
  code: 'EAS-JP-MIN-01',
  sphere: 'EAS',
  region: 'JP',
  variant: 'MIN',
  visual: {
    whitespace_ratio: { min: 0.35, max: 0.45 },
    color_palette: {
      primary: '#1A1A1A',
      secondary: '#FFFFFF',
      accent: '#B22222',
      max_colors: 3,
      description: '墨黑、纯白、一间朱红 accent — 余白の美',
    },
    typography: {
      title_font: 'YuMincho / Hiragino Mincho (明体)',
      body_font: 'Hiragino Sans / Noto Sans JP',
      title_weight: 400,
      line_height: 1.9,
      description: '明体标题传递传统克制,行高 1.9 营造呼吸感',
    },
    grid: {
      columns: 6,
      gutter_ratio: 0.15,
      description: '6 列网格,宽 gutter 营造松散感',
    },
    imagery: {
      style: 'photographic minimal, single focal point',
      filter: 'low-saturation, soft contrast',
      icon_style: 'thin-line, sparse use',
      description: '少即是多 — 单一焦点,低饱和',
    },
    layout: {
      alignment: 'left',
      title_position: 'top-left, small scale',
      text_density: 'low',
      description: '标题小而精,左上角,大量负空间',
    },
  },
  narrative: {
    opening: 'industry_context_indirect',
    structure: ['行业背景', '行业现状', '主题引入', '核心数据', '留白邀请'],
    argumentation: 'authority_citation_indirect',
    climax: 'single_quiet_number',
    closing: 'inviting_whitespace',
    cta_style: 'subtle',
    description: '间接切入,以行业背景开场,安静的一个数字作高潮,留白式收尾',
  },
  taboos: [
    { type: 'number', value: [4, 9], context: 'page_number', reason: '日语中 4(死)和 9(苦)不吉', action: 'skip' },
    { type: 'color', value: 'pure_white_title', reason: '白色标题在日式中有丧事联想', action: 'warn' },
    { type: 'gesture', value: 'left_hand_point', reason: '左手指向在日本文化中不礼貌', action: 'remove' },
  ],
  metadata: {
    name_zh: '日式极简',
    name_en: 'Japanese Minimal',
    description: '基于余白の美学的克制设计,强调负空间与间',
    design_philosophy: 'Less is more, silence speaks',
    inspiration_sources: ['无印良品', '原研哉', '田中一光'],
    applicable_scenarios: ['内部汇报', '高端品牌', '文化提案'],
    difficulty: 'advanced',
    version: '1.0.0',
  },
};

// ===== EAS-CN-MOD-01: 新中式 =====
export const EAS_CN_MOD_01: StyleVariant = {
  code: 'EAS-CN-MOD-01',
  sphere: 'EAS',
  region: 'CN',
  variant: 'MOD',
  visual: {
    whitespace_ratio: { min: 0.25, max: 0.35 },
    color_palette: {
      primary: '#2C2C2C',
      secondary: '#F5F0E8',
      accent: '#C0392B',
      max_colors: 4,
      description: '墨灰、宣纸米、朱砂红、黛蓝 — 新中式配色',
    },
    typography: {
      title_font: 'Source Han Serif / Noto Serif SC (思源宋体)',
      body_font: 'Source Han Sans / Noto Sans SC',
      title_weight: 600,
      line_height: 1.7,
      description: '宋体标题传递文化底蕴,配以现代无衬线正文',
    },
    grid: {
      columns: 12,
      gutter_ratio: 0.08,
      description: '12 列网格,融合传统秩序与现代严谨',
    },
    imagery: {
      style: 'ink-wash inspired, modern interpretation',
      filter: 'warm tone, moderate saturation',
      icon_style: 'brush-stroke inspired, simplified',
      description: '水墨意境的现代演绎,非传统国画复制',
    },
    layout: {
      alignment: 'left',
      title_position: 'center-top, prominent',
      text_density: 'medium',
      description: '标题居中突出,内容适度充实',
    },
  },
  narrative: {
    opening: 'big_picture_vision',
    structure: ['宏观背景', '核心观点', '数据支撑', '方案展示', '愿景收尾'],
    argumentation: 'data_plus_wisdom',
    climax: 'vision_statement',
    closing: 'future_outlook',
    cta_style: 'aspirational',
    description: '宏观开场,数据与智慧并重,以愿景收尾',
  },
  taboos: [
    { type: 'color', value: 'white_title_large', reason: '白色大标题在中文文化中有丧事联想', action: 'warn' },
    { type: 'number', value: [4], context: 'gift_count', reason: '谐音"死"', action: 'warn' },
  ],
  metadata: {
    name_zh: '新中式',
    name_en: 'Modern Chinese',
    description: '传统中式美学的现代化演绎,水墨意境与当代设计的融合',
    design_philosophy: '传承与创新并行,意境重于形似',
    inspiration_sources: ['靳埭强', '陈幼坚', '故宫文创'],
    applicable_scenarios: ['品牌发布', '文化展示', '企业年报'],
    difficulty: 'intermediate',
    version: '1.0.0',
  },
};

// ===== CEU-DE-BAU-01: 德式包豪斯 =====
export const CEU_DE_BAU_01: StyleVariant = {
  code: 'CEU-DE-BAU-01',
  sphere: 'CEU',
  region: 'DE',
  variant: 'BAU',
  visual: {
    whitespace_ratio: { min: 0.15, max: 0.25 },
    color_palette: {
      primary: '#1A1A1A',
      secondary: '#F5F5F5',
      accent: '#CE2536',
      max_colors: 3,
      description: '黑白灰 + 信号红 — 功能主义配色',
    },
    typography: {
      title_font: 'Helvetica Neue / Inter (Grotesk)',
      body_font: 'Helvetica Neue / Inter',
      title_weight: 700,
      line_height: 1.4,
      description: '无衬线 Grotesk,粗体标题,紧凑行高',
    },
    grid: {
      columns: 12,
      gutter_ratio: 0.05,
      description: '12 列严谨网格,窄 gutter,所有元素吸附对齐',
    },
    imagery: {
      style: 'technical, precise, geometric',
      filter: 'high-contrast, no filter',
      icon_style: 'geometric, uniform stroke',
      description: '几何精确,技术化,无装饰',
    },
    layout: {
      alignment: 'left',
      title_position: 'top-left, grid-aligned',
      text_density: 'high',
      description: '信息密度高,所有元素严格对齐网格',
    },
  },
  narrative: {
    opening: 'problem_definition',
    structure: ['问题定义', '方法论', '数据分析', '结论', '下一步'],
    argumentation: 'logical_chain',
    climax: 'complete_validation_matrix',
    closing: 'next_steps_checklist',
    cta_style: 'explicit',
    description: '问题→方法→数据→结论,四段式刚性逻辑链',
  },
  taboos: [
    { type: 'imagery', value: 'decorative_without_function', reason: '包豪斯原则:形式追随功能,无功能装饰应移除', action: 'remove' },
    { type: 'text', value: 'unverified_claim', reason: '所有论断必须有数据来源', action: 'warn' },
  ],
  metadata: {
    name_zh: '德式包豪斯',
    name_en: 'Bauhaus',
    description: '基于包豪斯设计学派的功能主义,严谨网格与无装饰美学',
    design_philosophy: 'Form follows function',
    inspiration_sources: ['包豪斯学派', 'Dieter Rams', '乌尔姆设计学院'],
    applicable_scenarios: ['技术评审', '学术报告', '工程提案'],
    difficulty: 'intermediate',
    version: '1.0.0',
  },
};

// ===== WUS-US-DIR-01: 美式直接冲击 =====
export const WUS_US_DIR_01: StyleVariant = {
  code: 'WUS-US-DIR-01',
  sphere: 'WUS',
  region: 'US',
  variant: 'DIR',
  visual: {
    whitespace_ratio: { min: 0.20, max: 0.30 },
    color_palette: {
      primary: '#0A0A0A',
      secondary: '#FFFFFF',
      accent: '#2563EB',
      max_colors: 4,
      description: '高对比黑白 + 电光蓝 accent — 冲击力优先',
    },
    typography: {
      title_font: 'Inter / SF Pro Display (Grotesk)',
      body_font: 'Inter / SF Pro Text',
      title_weight: 800,
      line_height: 1.3,
      description: '超粗体大标题,紧凑行高,视觉冲击',
    },
    grid: {
      columns: 12,
      gutter_ratio: 0.06,
      description: '12 列,灵活跨列,允许打破网格制造张力',
    },
    imagery: {
      style: 'bold, high-impact, full-bleed',
      filter: 'high-saturation, strong contrast',
      icon_style: 'bold, filled, large scale',
      description: '大胆全出血图,高饱和高对比',
    },
    layout: {
      alignment: 'left',
      title_position: 'center or full-width, oversized',
      text_density: 'medium',
      description: '超大标题,全幅视觉,强 CTA',
    },
  },
  narrative: {
    opening: 'story_or_shocking_data',
    structure: ['故事/数据开场', '问题', '解决方案', '验证', '强 CTA'],
    argumentation: 'case_study_emotional',
    climax: 'one_big_number',
    closing: 'strong_cta',
    cta_style: 'aggressive',
    description: '故事开场,一个惊人数字击穿认知,以强 CTA 收尾',
  },
  taboos: [],
  metadata: {
    name_zh: '美式直接',
    name_en: 'American Direct',
    description: '硅谷风格的高冲击力设计,故事驱动,数据击穿',
    design_philosophy: 'Make them feel it, then make them act',
    inspiration_sources: ['Apple Keynote', 'Stripe', 'Airbnb Design'],
    applicable_scenarios: ['融资路演', '产品发布', '营销提案'],
    difficulty: 'beginner',
    version: '1.0.0',
  },
};

// ===== NOR-SE-MIN-01: 北欧极简自然 =====
export const NOR_SE_MIN_01: StyleVariant = {
  code: 'NOR-SE-MIN-01',
  sphere: 'NOR',
  region: 'SE',
  variant: 'MIN',
  visual: {
    whitespace_ratio: { min: 0.30, max: 0.40 },
    color_palette: {
      primary: '#3A3A3A',
      secondary: '#FAFAF8',
      accent: '#7C9885',
      max_colors: 3,
      description: '灰黑、暖白、莫兰迪绿 — 自然克制',
    },
    typography: {
      title_font: 'Inter / Aktiv Grotesk',
      body_font: 'Inter',
      title_weight: 500,
      line_height: 1.6,
      description: '中等字重,舒适行高,平等不张扬',
    },
    grid: {
      columns: 6,
      gutter_ratio: 0.12,
      description: '6 列宽松网格,强调呼吸感',
    },
    imagery: {
      style: 'natural, organic, soft',
      filter: 'warm, muted, film-like',
      icon_style: 'rounded, organic, soft',
      description: '自然有机,柔和滤镜,木质感',
    },
    layout: {
      alignment: 'left',
      title_position: 'top-left, modest scale',
      text_density: 'low',
      description: '低调平等,不强调层级,一页一词也可以',
    },
  },
  narrative: {
    opening: 'shared_context',
    structure: ['共同背景', '观察', '温和提案', '共识建立', '平等收尾'],
    argumentation: 'consensus_oriented',
    climax: 'quiet_observation',
    closing: 'open_invitation',
    cta_style: 'collaborative',
    description: '共识导向,不强调领导者,以开放邀请收尾',
  },
  taboos: [
    { type: 'imagery', value: 'luxury_flashy', reason: '北欧 Jantelagen: 不应炫耀', action: 'de_prioritize' },
  ],
  metadata: {
    name_zh: '北欧极简',
    name_en: 'Nordic Minimal',
    description: '基于北欧平等主义与自然崇拜的极简设计',
    design_philosophy: 'Lagom — not too much, not too little',
    inspiration_sources: ['IKEA', 'Muuto', 'HAY'],
    applicable_scenarios: ['设计提案', '可持续报告', '团队协作'],
    difficulty: 'intermediate',
    version: '1.0.0',
  },
};

// ===== MEA-AE-GEO-01: 中东几何对称 =====
export const MEA_AE_GEO_01: StyleVariant = {
  code: 'MEA-AE-GEO-01',
  sphere: 'MEA',
  region: 'AE',
  variant: 'GEO',
  visual: {
    whitespace_ratio: { min: 0.20, max: 0.30 },
    color_palette: {
      primary: '#1B3A2B',
      secondary: '#F4E9D8',
      accent: '#C9A961',
      max_colors: 4,
      description: '深绿、沙色、金色 — 尊重色彩偏好',
    },
    typography: {
      title_font: 'Dubai / Tajawal (Arabic-supporting)',
      body_font: 'Dubai / Tajawal',
      title_weight: 600,
      line_height: 1.5,
      description: '支持阿拉伯文的字体,中等字重,对称居中',
    },
    grid: {
      columns: 6,
      gutter_ratio: 0.10,
      description: '6 列对称网格,强调中轴线',
    },
    imagery: {
      style: 'geometric patterns, symmetrical, ornamental',
      filter: 'warm, golden, luxurious',
      icon_style: 'geometric, Islamic-inspired, symmetrical',
      description: '几何纹样,对称构图,致敬伊斯兰几何美学',
    },
    layout: {
      alignment: 'center',
      title_position: 'center, symmetrical',
      text_density: 'medium',
      description: '中轴对称,几何纹样装饰,关系优先',
    },
  },
  narrative: {
    opening: 'relationship_trust',
    structure: ['关系建立', '信任', '业务背景', '合作方案', '长期承诺'],
    argumentation: 'heritage_and_vision',
    climax: 'collective_victory',
    closing: 'long_term_commitment',
    cta_style: 'relational',
    description: '先建立关系与信任,再谈业务,以长期承诺收尾',
  },
  taboos: [
    { type: 'gesture', value: 'left_hand_gesture', reason: '阿拉伯文化中左手不洁', action: 'remove' },
    { type: 'imagery', value: 'alcohol_imagery', reason: '伊斯兰文化禁酒', action: 'remove' },
    { type: 'imagery', value: 'pig_imagery', reason: '伊斯兰文化禁忌', action: 'remove' },
    { type: 'number', value: [13], context: 'general', reason: '部分中东文化中 13 不吉', action: 'warn' },
  ],
  metadata: {
    name_zh: '中东几何',
    name_en: 'Arabian Geometric',
    description: '基于伊斯兰几何美学的对称设计,关系优先的叙事',
    design_philosophy: 'Beauty in symmetry, trust in relationship',
    inspiration_sources: ['阿拉伯几何纹样', '迪拜当代设计', '摩洛哥建筑'],
    applicable_scenarios: ['中东市场', '政府关系', '高端商务'],
    difficulty: 'advanced',
    version: '1.0.0',
  },
};

// ===== EAS-JP-TRD-01: 日式传统 =====
export const EAS_JP_TRD_01: StyleVariant = {
  code: 'EAS-JP-TRD-01',
  sphere: 'EAS',
  region: 'JP',
  variant: 'TRD',
  visual: {
    whitespace_ratio: { min: 0.30, max: 0.40 },
    color_palette: {
      primary: '#1A1A1A',
      secondary: '#F5EDE0',
      accent: '#A4243B',
      max_colors: 4,
      description: '墨、和纸米、朱红、藏青 — 传统和风配色',
    },
    typography: {
      title_font: 'YuMincho / Hiragino Mincho (明体,支持竖排)',
      body_font: 'Hiragino Sans / Noto Sans JP',
      title_weight: 500,
      line_height: 1.8,
      description: '明体竖排标题,传统行高,营造书卷感',
    },
    grid: {
      columns: 4,
      gutter_ratio: 0.18,
      description: '4 列宽 gutter 网格,模拟传统书写版面',
    },
    imagery: {
      style: 'washi paper texture, traditional Japanese motifs',
      filter: 'warm, aged, soft',
      icon_style: 'brush-stroke, traditional family crests',
      description: '和纸纹理,传统纹样,家纹式图标',
    },
    layout: {
      alignment: 'left',
      title_position: 'right-side vertical (tategaki) when possible',
      text_density: 'low',
      description: '竖排标题,右起排版,大量留白',
    },
  },
  narrative: {
    opening: 'seasonal_context',
    structure: ['时令/季节', '历史传承', '主题引入', '匠心展示', '静默收尾'],
    argumentation: 'tradition_and_craft',
    climax: 'single_craft_detail',
    closing: 'silent_appreciation',
    cta_style: 'silent',
    description: '以时令开场,强调传承与匠心,以静默欣赏收尾',
  },
  taboos: [
    { type: 'number', value: [4, 9], context: 'page_number', reason: '日语中 4(死)和 9(苦)不吉', action: 'skip' },
    { type: 'color', value: 'pure_white_title', reason: '白色标题在日式中有丧事联想', action: 'warn' },
  ],
  metadata: {
    name_zh: '日式传统',
    name_en: 'Japanese Traditional',
    description: '基于传统和风美学的版面设计,竖排标题与和纸纹理',
    design_philosophy: '伝統を重んじ,静寂を愛す',
    inspiration_sources: ['田中一光', '龟仓雄策', '传统和装版面'],
    applicable_scenarios: ['文化展示', '传统工艺', '茶道/花道'],
    difficulty: 'advanced',
    version: '1.0.0',
  },
};

// ===== CEU-CH-INT-01: 瑞士国际主义 =====
export const CEU_CH_INT_01: StyleVariant = {
  code: 'CEU-CH-INT-01',
  sphere: 'CEU',
  region: 'CH',
  variant: 'INT',
  visual: {
    whitespace_ratio: { min: 0.20, max: 0.30 },
    color_palette: {
      primary: '#0A0A0A',
      secondary: '#FFFFFF',
      accent: '#E63946',
      max_colors: 3,
      description: '纯黑白 + 信号红 — 瑞士国际主义经典配色',
    },
    typography: {
      title_font: 'Helvetica Neue / Neue Haas Grotesk',
      body_font: 'Helvetica Neue',
      title_weight: 700,
      line_height: 1.35,
      description: 'Helvetica 无衬线,粗体大标题,紧凑行高',
    },
    grid: {
      columns: 12,
      gutter_ratio: 0.04,
      description: '12 列瑞士网格,极窄 gutter,数学级精确对齐',
    },
    imagery: {
      style: 'photographic, objective, documentary',
      filter: 'none, unmodified',
      icon_style: 'geometric, minimal, functional',
      description: '客观纪实摄影,无滤镜,功能主义图标',
    },
    layout: {
      alignment: 'left',
      title_position: 'top-left, oversized, grid-spanning',
      text_density: 'medium',
      description: '超大标题跨列,左对齐,不对称构图',
    },
  },
  narrative: {
    opening: 'objective_fact',
    structure: ['事实陈述', '数据分析', '逻辑推导', '结论', '引用'],
    argumentation: 'data_first_logic',
    climax: 'irrefutable_data',
    closing: 'source_citation',
    cta_style: 'informational',
    description: '事实先行,数据驱动,以引用来源收尾',
  },
  taboos: [
    { type: 'imagery', value: 'decorative_without_function', reason: '瑞士国际主义:无功能装饰应移除', action: 'remove' },
    { type: 'text', value: 'unverified_claim', reason: '所有论断必须有来源', action: 'warn' },
  ],
  metadata: {
    name_zh: '瑞士国际主义',
    name_en: 'Swiss International',
    description: '基于瑞士国际主义设计学派,数学级网格与 Helvetica 字体',
    design_philosophy: 'Grid is the grammar of design',
    inspiration_sources: ['Josef Müller-Brockmann', 'Armin Hofmann', 'Emil Ruder'],
    applicable_scenarios: ['学术报告', '数据展示', '国际会议'],
    difficulty: 'intermediate',
    version: '1.0.0',
  },
};

// ===== WUS-US-TEC-01: 美式科技极简 =====
export const WUS_US_TEC_01: StyleVariant = {
  code: 'WUS-US-TEC-01',
  sphere: 'WUS',
  region: 'US',
  variant: 'TEC',
  visual: {
    whitespace_ratio: { min: 0.25, max: 0.35 },
    color_palette: {
      primary: '#0D1117',
      secondary: '#161B22',
      accent: '#58A6FF',
      max_colors: 4,
      description: '深色背景 + 荧光蓝 — 硅谷科技风',
    },
    typography: {
      title_font: 'JetBrains Mono / SF Mono (monospace)',
      body_font: 'Inter / SF Pro Text',
      title_weight: 700,
      line_height: 1.4,
      description: '等宽字体标题,无衬线正文,科技感',
    },
    grid: {
      columns: 12,
      gutter_ratio: 0.06,
      description: '12 列,允许打破网格制造科技张力',
    },
    imagery: {
      style: 'abstract tech, circuit-like, data viz',
      filter: 'high-contrast, neon glow on dark',
      icon_style: 'thin-line, geometric, terminal-style',
      description: '抽象科技意象,暗色背景上的荧光线条',
    },
    layout: {
      alignment: 'left',
      title_position: 'top-left, monospace, code-style',
      text_density: 'medium',
      description: '代码风标题,等宽字体,深色优先',
    },
  },
  narrative: {
    opening: 'technical_problem',
    structure: ['技术问题', '架构方案', '实现路径', '性能数据', '开源邀请'],
    argumentation: 'architecture_first',
    climax: 'benchmark_comparison',
    closing: 'github_link_style',
    cta_style: 'technical',
    description: '技术问题开场,架构优先,以 benchmark 数据击穿',
  },
  taboos: [],
  metadata: {
    name_zh: '美式科技',
    name_en: 'American Tech',
    description: '硅谷科技公司风格,深色背景 + 等宽字体 + 数据驱动',
    design_philosophy: 'Talk is cheap, show me the data',
    inspiration_sources: ['GitHub', 'Vercel', 'Stripe Docs'],
    applicable_scenarios: ['技术分享', '开发者大会', '产品技术发布'],
    difficulty: 'beginner',
    version: '1.0.0',
  },
};

// ===== NOR-DK-HYG-01: 丹麦 Hygge 温暖 =====
export const NOR_DK_HYG_01: StyleVariant = {
  code: 'NOR-DK-HYG-01',
  sphere: 'NOR',
  region: 'DK',
  variant: 'HYG',
  visual: {
    whitespace_ratio: { min: 0.28, max: 0.38 },
    color_palette: {
      primary: '#4A3F35',
      secondary: '#F7F1E8',
      accent: '#D4915D',
      max_colors: 4,
      description: '焦糖棕、奶油白、暖橙 — Hygge 温暖配色',
    },
    typography: {
      title_font: 'Playfair Display / Recoleta (serif, warm)',
      body_font: 'Inter / Noto Sans',
      title_weight: 600,
      line_height: 1.7,
      description: '温暖衬线标题,舒适行高,亲切不冷峻',
    },
    grid: {
      columns: 6,
      gutter_ratio: 0.14,
      description: '6 列宽松网格,圆润边角,呼吸感',
    },
    imagery: {
      style: 'cozy, candlelight, natural textures',
      filter: 'warm, soft, golden hour',
      icon_style: 'rounded, organic, hand-drawn feel',
      description: '烛光氛围,木质感,手绘风图标',
    },
    layout: {
      alignment: 'left',
      title_position: 'center-top, warm and inviting',
      text_density: 'low',
      description: '圆润边角,温暖配色,亲密不疏离',
    },
  },
  narrative: {
    opening: 'personal_story',
    structure: ['个人故事', '共同感受', '温和建议', '舒适方案', '温暖收尾'],
    argumentation: 'empathy_first',
    climax: 'shared_moment',
    closing: 'warm_invitation',
    cta_style: 'warm',
    description: '个人故事开场,共情优先,以温暖邀请收尾',
  },
  taboos: [
    { type: 'imagery', value: 'cold_corporate', reason: 'Hygge 应避免冷漠的企业感', action: 'de_prioritize' },
  ],
  metadata: {
    name_zh: '丹麦 Hygge',
    name_en: 'Danish Hygge',
    description: '基于丹麦 Hygge 文化的温暖设计,烛光氛围与舒适感',
    design_philosophy: 'Coziness is the ultimate luxury',
    inspiration_sources: ['Norm Architects', 'Menu', '丹麦生活方式'],
    applicable_scenarios: ['生活方式品牌', '餐饮', '家居', ' Wellness'],
    difficulty: 'intermediate',
    version: '1.0.0',
  },
};

// ===== LAT-BR-VIB-01: 巴西热情 =====
export const LAT_BR_VIB_01: StyleVariant = {
  code: 'LAT-BR-VIB-01',
  sphere: 'LAT',
  region: 'BR',
  variant: 'VIB',
  visual: {
    whitespace_ratio: { min: 0.15, max: 0.25 },
    color_palette: {
      primary: '#1B1B1B',
      secondary: '#FFF8E7',
      accent: '#FF6B35',
      max_colors: 5,
      description: '热带绿、阳光黄、热情橙 — 拉美高饱和',
    },
    typography: {
      title_font: 'Poppins / Montserrat (geometric sans, bold)',
      body_font: 'Inter / Noto Sans',
      title_weight: 800,
      line_height: 1.3,
      description: '超粗几何无衬线,大字号,充满能量',
    },
    grid: {
      columns: 12,
      gutter_ratio: 0.05,
      description: '12 列,允许斜切和动态打破网格',
    },
    imagery: {
      style: 'vibrant, energetic, people-centric',
      filter: 'high-saturation, warm, vivid',
      icon_style: 'bold, filled, colorful, large',
      description: '高饱和人像,充满生命力,动态构图',
    },
    layout: {
      alignment: 'center',
      title_position: 'center, oversized, energetic',
      text_density: 'medium',
      description: '居中大标题,饱满色彩,充满活力',
    },
  },
  narrative: {
    opening: 'personal_passion',
    structure: ['热情开场', '故事分享', '机会展示', '集体行动', '庆祝收尾'],
    argumentation: 'emotion_and_community',
    climax: 'celebration_moment',
    closing: 'celebration_cta',
    cta_style: 'enthusiastic',
    description: '热情开场,情感与社区并重,以庆祝收尾',
  },
  taboos: [
    { type: 'imagery', value: 'cold_isolated', reason: '拉美文化重视人际温暖,避免冷漠孤立', action: 'de_prioritize' },
  ],
  metadata: {
    name_zh: '巴西热情',
    name_en: 'Brazilian Vibrant',
    description: '基于拉美热情文化的高饱和设计,人本主义与社区感',
    design_philosophy: 'Viver com paixão — live with passion',
    inspiration_sources: ['巴西狂欢节视觉', 'Ambev Design', '拉美街头艺术'],
    applicable_scenarios: ['消费品牌', '活动营销', '社区运营', '快消品'],
    difficulty: 'beginner',
    version: '1.0.0',
  },
};

// ===== EAS-KR-MOD-01: 韩国 K-Modern =====
export const EAS_KR_MOD_01: StyleVariant = {
  code: 'EAS-KR-MOD-01',
  sphere: 'EAS',
  region: 'KR',
  variant: 'MOD',
  visual: {
    whitespace_ratio: { min: 0.25, max: 0.35 },
    color_palette: {
      primary: '#1E1E1E',
      secondary: '#F8F8F8',
      accent: '#4F46E5',
      max_colors: 4,
      description: '极简黑白 + 靛蓝 accent — K-Design 精致感',
    },
    typography: {
      title_font: 'Pretendard / Spoqa Han Sans (Korean-optimized)',
      body_font: 'Pretendard / Inter',
      title_weight: 700,
      line_height: 1.5,
      description: '韩语优化字体,粗体标题,精致行高',
    },
    grid: {
      columns: 8,
      gutter_ratio: 0.08,
      description: '8 列网格,精致对齐,允许微妙不对称',
    },
    imagery: {
      style: 'clean, polished, K-pop aesthetic',
      filter: 'clean, slightly cool, high-quality',
      icon_style: 'thin-line, precise, modern',
      description: '精致干净,K-Design 美学,微冷调',
    },
    layout: {
      alignment: 'left',
      title_position: 'top-left, bold and precise',
      text_density: 'medium',
      description: '精致排版,微不对称,现代感',
    },
  },
  narrative: {
    opening: 'trend_insight',
    structure: ['趋势洞察', '问题定义', '精致方案', '用户验证', '未来导向'],
    argumentation: 'data_and_trend',
    climax: 'user_growth_data',
    closing: 'future_vision',
    cta_style: 'confident',
    description: '趋势洞察开场,数据与趋势并重,以未来愿景收尾',
  },
  taboos: [],
  metadata: {
    name_zh: '韩式现代',
    name_en: 'Korean Modern',
    description: '基于韩国 K-Design 美学的精致现代设计,干净与品质感',
    design_philosophy: '정교함의 미학 — aesthetics of precision',
    inspiration_sources: ['Naver Design', 'Kakao Design', '韩国网页设计'],
    applicable_scenarios: ['科技产品', '美妆品牌', '内容平台', '时尚'],
    difficulty: 'intermediate',
    version: '1.0.0',
  },
};

// ===== 风格注册表 =====
export const STYLE_VARIANTS: StyleVariant[] = [
  EAS_JP_MIN_01,
  EAS_JP_TRD_01,
  EAS_CN_MOD_01,
  EAS_KR_MOD_01,
  CEU_DE_BAU_01,
  CEU_CH_INT_01,
  WUS_US_DIR_01,
  WUS_US_TEC_01,
  NOR_SE_MIN_01,
  NOR_DK_HYG_01,
  MEA_AE_GEO_01,
  LAT_BR_VIB_01,
];

export const STYLE_MAP: Record<string, StyleVariant> = Object.fromEntries(
  STYLE_VARIANTS.map((s) => [s.code, s]),
);
