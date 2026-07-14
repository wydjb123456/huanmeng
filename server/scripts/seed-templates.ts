import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.template.deleteMany();

  const templates = [
    // --- PPT 模板 ---
    {
      name: '水墨群山',
      category: 'business',
      thumbnail: '/images/ink-wash-mountain.webp',
      promptTemplate: '传统中国水墨画风格，群山连绵，注重留白意境，黑白灰水墨晕染，适合呈现高级商务与文化品牌。',
      type: 'ppt',
      isActive: true,
    },
    {
      name: '极光雪山',
      category: 'academic',
      thumbnail: '/images/aurora-mountain.webp',
      promptTemplate: '绚丽的北极光与雪山背景，深蓝色与青绿色调，充满探索感与严谨的科技氛围，适合前沿学术报告。',
      type: 'ppt',
      isActive: true,
    },
    {
      name: '水彩繁花',
      category: 'personal',
      thumbnail: '/images/watercolor-flowers.webp',
      promptTemplate: '清新淡雅的水彩花卉风格，纸张纹理质感，色彩柔和，适合个人作品集、手帐或生活记录。',
      type: 'ppt',
      isActive: true,
    },
    {
      name: '印象派花园',
      category: 'marketing',
      thumbnail: '/images/impressionist-garden.webp',
      promptTemplate: '莫奈风格的印象派花园，光影交错，色彩斑斓的碎笔触，营造春意盎然的营销活动氛围。',
      type: 'ppt',
      isActive: true,
    },
    
    // --- 海报模板 ---
    {
      name: '浮世绘海浪',
      category: 'creative',
      thumbnail: '/images/ukiyoe-wave.webp',
      promptTemplate: '以日本传统浮世绘风格为主题，表现神奈川冲浪里的海浪元素。配色以深蓝与朱红为主，具有强烈的视觉冲击力。',
      type: 'poster',
      isActive: true,
    },
    {
      name: '星空油画',
      category: 'creative',
      thumbnail: '/images/starry-oil.webp',
      promptTemplate: '梵高星月夜风格的厚涂油画，充满动感的笔触与强烈的色彩对比，适合艺术展览或创意策划海报。',
      type: 'poster',
      isActive: true,
    },
    {
      name: '动漫风景',
      category: 'personal',
      thumbnail: '/images/anime-landscape.webp',
      promptTemplate: '新海诚风格的动漫风景，蔚蓝的天空，大片流云，逆光下的城市街道，充满青春与希望的气息。',
      type: 'poster',
      isActive: true,
    },
    {
      name: '超现实岛屿',
      category: 'creative',
      thumbnail: '/images/surreal-islands.webp',
      promptTemplate: '超现实主义风格，悬浮在空中的岛屿，奇幻的光影与失重的几何元素，适合科幻或极具创意的活动海报。',
      type: 'poster',
      isActive: true,
    },
    {
      name: '水彩秋色',
      category: 'marketing',
      thumbnail: '/images/watercolor-autumn.webp',
      promptTemplate: '温暖的秋季水彩画风，金黄色与橙红色的树叶交织，适合秋季促销、文艺市集或感谢信海报。',
      type: 'poster',
      isActive: true,
    }
  ];

  for (const t of templates) {
    await prisma.template.create({ data: t });
  }

  console.log('Templates seeded successfully (Mixed PPT and Posters).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });