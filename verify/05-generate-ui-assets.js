import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

const API_BASE = process.env.EVOLINK_API_BASE;
const API_KEY = process.env.EVOLINK_API_KEY;
const OUTPUT_DIR = path.resolve('client/public/images');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function createImageTask(prompt, options = {}) {
  const body = {
    model: 'gpt-image-2',
    prompt,
    size: options.size || '16:9',
    resolution: options.resolution || '4K',
    quality: options.quality || 'high',
    n: 1,
  };
  const res = await fetch(`${API_BASE}/images/generations`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`提交失败 ${res.status}: ${text}`);
  return JSON.parse(text);
}

async function queryTask(taskId) {
  const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  if (!res.ok) throw new Error(`查询失败 ${res.status}`);
  return res.json();
}

async function waitForTask(taskId, label, maxAttempts = 80, intervalMs = 3000) {
  for (let i = 1; i <= maxAttempts; i++) {
    const status = await queryTask(taskId);
    const progress = status.progress ?? 0;
    process.stdout.write(`\r[${label}] ${i}/${maxAttempts} 进度: ${progress}%   `);
    if (status.status === 'completed') {
      process.stdout.write('\n');
      return status;
    }
    if (status.status === 'failed') throw new Error(`${label} 失败`);
    await sleep(intervalMs);
  }
  throw new Error(`${label} 超时`);
}

async function downloadImage(url, filepath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`下载失败 ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(filepath, buf);
  return buf.length;
}

// 任务1: Hero 区产品预览图（3x3 PPT 网格示例，16:9）
const PROMPT_PREVIEW = `Generate a 16:9 widescreen presentation slide deck image with a 3x3 grid layout (3 rows, 3 columns, 9 panels total) for a futuristic tech product launch presentation.

CRITICAL LAYOUT: Single 16:9 widescreen landscape image divided into a 3x3 grid of 9 equal panels. Each panel is 16:9. Thin white dividing lines separate panels.

Panel 1 (top-left): Title "Nebula AI" with abstract galaxy logo
Panel 2 (top-center): "The Future of Intelligence" tagline with neural network visualization
Panel 3 (top-right): Market growth chart with glowing upward arrow
Panel 4 (middle-left): Product showcase - holographic interface mockup
Panel 5 (middle-center): Core features - 3 glowing icons (speed, security, scale)
Panel 6 (middle-right): Architecture diagram with connected nodes
Panel 7 (bottom-left): Performance metrics dashboard with animated counters
Panel 8 (bottom-center): Team avatars with glowing borders
Panel 9 (bottom-right): "Join the Future" with contact info and QR code

Design: Dark theme with purple/indigo gradients, glowing accents, glassmorphism panels, futuristic typography. Consistent style across all 9 panels. Professional and visually striking.`;

// 任务2: 登录页装饰插画（抽象 AI 主题，16:9）
const PROMPT_DECOR = `An abstract digital art illustration representing AI-powered creativity and design. A flowing stream of colorful particles transforming into structured geometric shapes, panels, and slides. Deep indigo and violet gradient background with glowing electric blue and purple highlights. Ethereal flowing ribbons of light morphing into presentation slides. Glassmorphism elements, depth of field, cinematic lighting. Minimal, elegant, premium tech aesthetic. No text, no words, pure visual.`;

async function main() {
  console.log('=== 生成 UI 资源图片 ===\n');
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // 并行提交两个任务
  console.log('[1/3] 并行提交两个生成任务...');
  const [task1, task2] = await Promise.all([
    createImageTask(PROMPT_PREVIEW, { size: '16:9', resolution: '4K', quality: 'high' }),
    createImageTask(PROMPT_DECOR, { size: '16:9', resolution: '4K', quality: 'high' }),
  ]);

  console.log(`Hero预览图任务: ${task1.id}`);
  console.log(`登录装饰图任务: ${task2.id}\n`);

  // 并行等待
  console.log('[2/3] 等待生成完成（并行轮询）...\n');
  const [result1, result2] = await Promise.all([
    waitForTask(task1.id, 'Hero预览'),
    waitForTask(task2.id, '登录装饰'),
  ]);

  // 下载
  console.log('\n[3/3] 下载图片...\n');
  const size1 = await downloadImage(result1.results[0], path.join(OUTPUT_DIR, 'hero-preview.png'));
  const size2 = await downloadImage(result2.results[0], path.join(OUTPUT_DIR, 'login-decor.png'));

  console.log('\n=== 完成 ===');
  console.log(`hero-preview.png: ${(size1 / 1024).toFixed(0)} KB`);
  console.log(`login-decor.png: ${(size2 / 1024).toFixed(0)} KB`);
  console.log(`保存目录: ${OUTPUT_DIR}`);
}

main().catch((err) => {
  console.error('\n失败:', err.message);
  process.exit(1);
});
