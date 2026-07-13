import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = process.env.EVOLINK_API_BASE;
const API_KEY = process.env.EVOLINK_API_KEY;
const OUTPUT_DIR = process.env.OUTPUT_DIR || './verify/output';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

console.log('=== 全链路验证：API → 切图 → PDF ===');
console.log(`时间: ${new Date().toISOString()}`);
console.log('');

async function createImageTask(prompt, options = {}) {
  const body = {
    model: 'gpt-image-2',
    prompt,
    size: options.size || '1:1',
    resolution: options.resolution || '4K',
    quality: options.quality || 'high',
    n: 1,
  };
  const res = await fetch(`${API_BASE}/images/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
  return JSON.parse(text);
}

async function queryTask(taskId) {
  const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
  return JSON.parse(text);
}

async function waitForTask(taskId, maxAttempts = 80, intervalMs = 3000) {
  for (let i = 1; i <= maxAttempts; i++) {
    const status = await queryTask(taskId);
    if (status.status === 'completed') return status;
    if (status.status === 'failed') throw new Error(`任务失败: ${JSON.stringify(status)}`);
    process.stdout.write(`\r[${i}/${maxAttempts}] 进度: ${status.progress ?? 0}%   `);
    await sleep(intervalMs);
  }
  throw new Error('轮询超时');
}

async function downloadImage(url, filepath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`下载失败 HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(filepath, buf);
  return buf;
}

async function splitImage(inputPath, outputDir) {
  const metadata = await sharp(inputPath).metadata();
  const { width, height } = metadata;
  const cellWidth = Math.floor(width / 3);
  const cellHeight = Math.floor(height / 3);

  const panels = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const idx = row * 3 + col + 1;
      const name = `panel-${String(idx).padStart(2, '0')}.png`;
      const outputPath = path.join(outputDir, name);
      await sharp(inputPath)
        .extract({ left: col * cellWidth, top: row * cellHeight, width: cellWidth, height: cellHeight })
        .png()
        .toFile(outputPath);
      panels.push({ name, path: outputPath, width: cellWidth, height: cellHeight });
    }
  }
  return { panels, original: { width, height }, cell: { width: cellWidth, height: cellHeight } };
}

async function createPdf(panels, outputPath) {
  const pdfDoc = await PDFDocument.create();
  for (const panel of panels) {
    const pngImage = await pdfDoc.embedPng(fs.readFileSync(panel.path));
    const page = pdfDoc.addPage([panel.width, panel.height]);
    page.drawImage(pngImage, { x: 0, y: 0, width: panel.width, height: panel.height });
  }
  const bytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, bytes);
  return { size: bytes.length, pages: pdfDoc.getPageCount() };
}

async function main() {
  const startTime = Date.now();
  const log = [];

  // 步骤1：调用API
  console.log('\n[1/4] 调用 API 生成图片...');
  const prompt = `Generate a 16:9 widescreen presentation slide deck image with a 3x3 grid layout (3 rows, 3 columns, 9 panels total) for a coffee shop business plan.

CRITICAL LAYOUT REQUIREMENT: The image must be a single 16:9 widescreen image (landscape orientation, wider than tall). The image is divided into a 3x3 grid with 3 rows and 3 columns, creating 9 equal-sized panels. Each panel is itself in 16:9 landscape orientation. Thin white dividing lines separate the panels.

Panel 1 (top-left): Title slide - "Morning Brew Coffee Co." with coffee cup logo
Panel 2 (top-center): Mission statement with coffee beans illustration
Panel 3 (top-right): Market analysis chart showing growth
Panel 4 (middle-left): Menu showcase - 3 featured drinks
Panel 5 (middle-center): Store layout and design concept
Panel 6 (middle-right): Financial projections with bar chart
Panel 7 (bottom-left): Target customer demographics
Panel 8 (bottom-center): Marketing strategy with social media icons
Panel 9 (bottom-right): Team and contact information

Professional warm color palette (browns, creams), modern typography, consistent design across all 9 panels. Each panel should have clear readable content that works as a standalone presentation slide when cropped.

The final output is ONE landscape 16:9 image containing a 3x3 grid of 9 slides.`;

  const task = await createImageTask(prompt, { size: '16:9', resolution: '4K', quality: 'high' });
  console.log(`任务ID: ${task.id}`);
  console.log(`预估耗时: ${task.task_info?.estimated_time}秒`);
  log.push({ step: 'api_call', task_id: task.id, credits_reserved: task.usage?.credits_reserved });

  // 步骤2：轮询
  console.log('\n[2/4] 等待生成完成...');
  const pollStart = Date.now();
  const result = await waitForTask(task.id);
  const pollDuration = ((Date.now() - pollStart) / 1000).toFixed(1);
  console.log(`\n生成完成，耗时 ${pollDuration} 秒`);
  log.push({
    step: 'polling',
    duration_sec: pollDuration,
    credits_used: result.usage?.credits_used,
    total_tokens: result.usage?.total_tokens,
  });

  // 步骤3：下载并切分
  console.log('\n[3/4] 下载并切分图片...');
  fs.mkdirSync(path.join(OUTPUT_DIR, 'split'), { recursive: true });
  const originalPath = path.join(OUTPUT_DIR, 'original-grid.png');
  const imgBuf = await downloadImage(result.results[0], originalPath);
  console.log(`原图大小: ${(imgBuf.length / 1024).toFixed(1)} KB`);

  const { panels, original, cell } = await splitImage(originalPath, path.join(OUTPUT_DIR, 'split'));
  console.log(`原图: ${original.width}x${original.height}`);
  console.log(`子图: ${cell.width}x${cell.height} (${panels.length} 张)`);
  log.push({ step: 'split', original_size: imgBuf.length, cell_size: `${cell.width}x${cell.height}` });

  // 步骤4：生成PDF
  console.log('\n[4/4] 生成 PDF...');
  const pdfPath = path.join(OUTPUT_DIR, 'presentation-16x9.pdf');
  const pdfResult = await createPdf(panels, pdfPath);
  console.log(`PDF: ${(pdfResult.size / 1024 / 1024).toFixed(2)} MB, ${pdfResult.pages} 页`);
  log.push({ step: 'pdf', size: pdfResult.size, pages: pdfResult.pages });

  // 总结
  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n=== 全链路验证完成 ===');
  console.log(`总耗时: ${totalDuration} 秒`);
  console.log(`输出文件:`);
  console.log(`  原图: ${originalPath}`);
  console.log(`  子图目录: ${path.join(OUTPUT_DIR, 'split')}`);
  console.log(`  PDF: ${pdfPath}`);

  // 保存日志
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'pipeline-log.json'),
    JSON.stringify({ ...log, total_duration_sec: totalDuration, timestamp: new Date().toISOString() }, null, 2)
  );
}

main().catch((err) => {
  console.error('\n❌ 全链路验证失败:', err.message);
  process.exit(1);
});
