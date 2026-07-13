import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = process.env.OUTPUT_DIR || './verify/output';
const SPLIT_DIR = path.join(OUTPUT_DIR, 'split');
const OUTPUT_PDF = path.join(OUTPUT_DIR, 'presentation.pdf');

console.log('=== PDF 生成验证脚本 ===');
console.log(`输入目录: ${SPLIT_DIR}`);
console.log(`输出 PDF: ${OUTPUT_PDF}`);
console.log('');

async function main() {
  if (!fs.existsSync(SPLIT_DIR)) {
    throw new Error(`找不到切分目录 ${SPLIT_DIR}，请先运行 02-split-image.js`);
  }

  // 收集所有子图（按文件名排序确保顺序正确）
  const panelFiles = fs
    .readdirSync(SPLIT_DIR)
    .filter((f) => f.startsWith('panel-') && f.endsWith('.png'))
    .sort();

  if (panelFiles.length !== 9) {
    throw new Error(`期望9张子图，实际找到 ${panelFiles.length} 张`);
  }

  console.log(`找到 ${panelFiles.length} 张子图:`);
  panelFiles.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  console.log('');

  // 创建 PDF 文档
  const pdfDoc = await PDFDocument.create();

  console.log('=== 开始生成 PDF ===');

  for (const panelFile of panelFiles) {
    const panelPath = path.join(SPLIT_DIR, panelFile);
    const imageBytes = fs.readFileSync(panelPath);
    const pngImage = await pdfDoc.embedPng(imageBytes);

    // 创建一个适应图片尺寸的页面（单位是点，1pt = 1/72 inch）
    // 保持图片原始宽高比
    const { width, height } = pngImage;
    const page = pdfDoc.addPage([width, height]);

    page.drawImage(pngImage, {
      x: 0,
      y: 0,
      width,
      height,
    });

    console.log(`✅ 添加页面: ${panelFile} (${width}x${height})`);
  }

  // 保存 PDF
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(OUTPUT_PDF, pdfBytes);

  const sizeMB = (pdfBytes.length / (1024 * 1024)).toFixed(2);
  console.log('');
  console.log('=== PDF 生成结果 ===');
  console.log(`输出文件: ${OUTPUT_PDF}`);
  console.log(`文件大小: ${sizeMB} MB`);
  console.log(`页数: ${pdfDoc.getPageCount()}`);

  console.log('');
  console.log('✅ PDF 生成完成！');
  console.log('下一步：可以打开 presentation.pdf 查看效果。');
}

main().catch((err) => {
  console.error('❌ PDF 生成失败:', err.message);
  process.exit(1);
});
