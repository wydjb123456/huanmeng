import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = process.env.OUTPUT_DIR || './verify/output';
const SPLIT_DIR = path.join(OUTPUT_DIR, 'split');

const INPUT_IMAGE = path.join(OUTPUT_DIR, 'original-grid.png');

if (!fs.existsSync(INPUT_IMAGE)) {
  console.error(`错误：找不到输入图片 ${INPUT_IMAGE}`);
  console.error('请先运行 01-test-api.js 生成图片');
  process.exit(1);
}

console.log('=== 图片切分验证脚本 ===');
console.log(`输入图片: ${INPUT_IMAGE}`);
console.log('');

async function main() {
  // 步骤1：获取图片信息
  const metadata = await sharp(INPUT_IMAGE).metadata();
  console.log('=== 原图信息 ===');
  console.log(`宽度: ${metadata.width} px`);
  console.log(`高度: ${metadata.height} px`);
  console.log(`通道: ${metadata.channels}`);
  console.log(`密度: ${metadata.density} dpi`);
  console.log(`格式: ${metadata.format}`);
  console.log(`大小: ${(fs.statSync(INPUT_IMAGE).size / 1024).toFixed(1)} KB`);
  console.log('');

  const { width, height } = metadata;

  if (width !== height) {
    console.warn(`⚠️  警告：图片不是正方形 (${width}x${height})，切分可能不均匀`);
  }

  // 步骤2：切分为3x3网格
  fs.mkdirSync(SPLIT_DIR, { recursive: true });

  const cellWidth = Math.floor(width / 3);
  const cellHeight = Math.floor(height / 3);

  console.log('=== 切分参数 ===');
  console.log(`每个子图宽度: ${cellWidth} px`);
  console.log(`每个子图高度: ${cellHeight} px`);
  console.log('');

  const positions = [
    { row: 0, col: 0, name: 'panel-01-top-left.png' },
    { row: 0, col: 1, name: 'panel-02-top-center.png' },
    { row: 0, col: 2, name: 'panel-03-top-right.png' },
    { row: 1, col: 0, name: 'panel-04-middle-left.png' },
    { row: 1, col: 1, name: 'panel-05-middle-center.png' },
    { row: 1, col: 2, name: 'panel-06-middle-right.png' },
    { row: 2, col: 0, name: 'panel-07-bottom-left.png' },
    { row: 2, col: 1, name: 'panel-08-bottom-center.png' },
    { row: 2, col: 2, name: 'panel-09-bottom-right.png' },
  ];

  console.log('=== 开始切分 ===');
  const results = [];

  for (const pos of positions) {
    const left = pos.col * cellWidth;
    const top = pos.row * cellHeight;

    const outputPath = path.join(SPLIT_DIR, pos.name);
    const info = await sharp(INPUT_IMAGE)
      .extract({
        left,
        top,
        width: cellWidth,
        height: cellHeight,
      })
      .png()
      .toFile(outputPath);

    const sizeKB = (fs.statSync(outputPath).size / 1024).toFixed(1);
    console.log(`✅ ${pos.name}: ${cellWidth}x${cellHeight} (${sizeKB} KB)`);

    results.push({
      name: pos.name,
      path: outputPath,
      width: cellWidth,
      height: cellHeight,
      sizeKB,
      position: `行${pos.row + 1}列${pos.col + 1}`,
    });
  }

  console.log('');
  console.log('=== 切分结果 ===');
  console.log(`原图: ${width}x${height} → 切分为 9 张 ${cellWidth}x${cellHeight} 的子图`);
  console.log(`输出目录: ${SPLIT_DIR}`);

  // 评估分辨率是否足够
  console.log('');
  console.log('=== 分辨率评估 ===');
  const minPptWidth = 1920;
  const minPptHeight = 1080;

  if (cellWidth >= minPptWidth && cellHeight >= minPptHeight) {
    console.log(`✅ 满足 1080p PPT 要求 (${minPptWidth}x${minPptHeight})`);
  } else if (cellWidth >= 1280 && cellHeight >= 720) {
    console.log(`✅ 满足 720p PPT 要求 (1280x720)`);
  } else {
    console.log(`⚠️  分辨率偏低 (${cellWidth}x${cellHeight})`);
    console.log('建议：使用更高分辨率或调整切分策略');
  }

  // 保存切分信息到JSON
  const infoFile = path.join(SPLIT_DIR, 'split-info.json');
  fs.writeFileSync(
    infoFile,
    JSON.stringify(
      {
        original: { width, height, size: fs.statSync(INPUT_IMAGE).size },
        cell: { width: cellWidth, height: cellHeight },
        panels: results,
        createdAt: new Date().toISOString(),
      },
      null,
      2
    )
  );
  console.log(`\n切分信息已保存到: ${infoFile}`);

  console.log('');
  console.log('✅ 切分完成！请查看 split 目录下的9张子图。');
  console.log('下一步：运行 03-generate-pdf.js 验证PDF生成。');
}

main().catch((err) => {
  console.error('❌ 切分失败:', err.message);
  process.exit(1);
});
