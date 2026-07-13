import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = process.env.EVOLINK_API_BASE;
const API_KEY = process.env.EVOLINK_API_KEY;
const OUTPUT_DIR = process.env.OUTPUT_DIR || './verify/output';

if (!API_BASE || !API_KEY) {
  console.error('错误：缺少 API_BASE 或 API_KEY 环境变量');
  process.exit(1);
}

console.log('=== EvoLink GPT Image 2.0 API 验证脚本 ===');
console.log(`API Base: ${API_BASE}`);
console.log(`时间: ${new Date().toISOString()}`);
console.log('');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function createImageTask(prompt, options = {}) {
  const body = {
    model: 'gpt-image-2',
    prompt,
    size: options.size || '1:1',
    resolution: options.resolution || '4K',
    quality: options.quality || 'high',
    n: options.n || 1,
  };

  console.log('提交图片生成任务...');
  console.log('请求参数:', JSON.stringify(body, null, 2));

  const res = await fetch(`${API_BASE}/images/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`提交任务失败 HTTP ${res.status}: ${text}`);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`响应不是 JSON: ${text}`);
  }

  console.log('任务已提交:');
  console.log(JSON.stringify(data, null, 2));
  return data;
}

async function queryTask(taskId) {
  const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`查询任务失败 HTTP ${res.status}: ${text}`);
  }
  return JSON.parse(text);
}

async function waitForTask(taskId, { maxAttempts = 60, intervalMs = 3000 } = {}) {
  console.log('');
  console.log(`开始轮询任务状态（间隔 ${intervalMs}ms，最多 ${maxAttempts} 次）...`);

  for (let i = 1; i <= maxAttempts; i++) {
    const status = await queryTask(taskId);
    const progress = status.progress ?? 0;
    console.log(`[${i}/${maxAttempts}] 状态: ${status.status}, 进度: ${progress}%`);

    if (status.status === 'completed') {
      console.log('任务完成！');
      console.log(JSON.stringify(status, null, 2));
      return status;
    }
    if (status.status === 'failed') {
      throw new Error(`任务失败: ${JSON.stringify(status)}`);
    }
    await sleep(intervalMs);
  }
  throw new Error('超过最大轮询次数，任务仍未完成');
}

async function downloadImage(url, filepath) {
  console.log(`下载图片: ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`下载失败 HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(filepath, buf);
  console.log(`已保存到: ${filepath} (${(buf.length / 1024).toFixed(1)} KB)`);
  return filepath;
}

async function main() {
  // 测试用 prompt：生成一个3x3网格布局的PPT页面图
  // 要求模型生成一张包含9个PPT页面的正方形大图
  const prompt = `Generate a 3x3 grid layout image (3 rows, 3 columns, total 9 panels) for a tech startup pitch deck presentation.

The image must be a single large square divided into a 3x3 grid with clear dividing lines between each panel. Each of the 9 panels represents one slide of the presentation:

Panel 1 (top-left): Title slide - "TechVision 2026" with a modern logo
Panel 2 (top-center): Problem statement - show a frustrated user with outdated tools
Panel 3 (top-right): Market opportunity - show growth chart with upward arrow
Panel 4 (middle-left): Solution overview - product dashboard mockup
Panel 5 (middle-center): Product features - three key feature icons
Panel 6 (middle-right): Business model - revenue streams diagram
Panel 7 (bottom-left): Traction - user growth metrics and stats
Panel 8 (bottom-center): Team - team member portraits
Panel 9 (bottom-right): Call to action - contact info and next steps

Use a consistent modern design language: clean layout, professional color scheme (blue and white), clear typography, and iconography. Each panel should have visible content that can be read when cropped separately.

CRITICAL: The image MUST be a single square image with 9 equal-sized panels arranged in a 3x3 grid, separated by thin white dividing lines.`;

  console.log('=== 验证目标 ===');
  console.log('1. 调用 API 生成3x3网格布局的大图');
  console.log('2. 验证API可用性和返回结果');
  console.log('3. 下载图片并检查分辨率');
  console.log('');

  // 步骤1：提交任务
  const task = await createImageTask(prompt, {
    size: '1:1',
    resolution: '4K',
    quality: 'high',
    n: 1,
  });

  const taskId = task.id;
  if (!taskId) {
    throw new Error('未获取到 task_id');
  }
  console.log(`\nTask ID: ${taskId}`);

  if (task.usage) {
    console.log(`预估消耗: ${task.usage.credits_reserved} credits`);
  }

  // 步骤2：轮询任务状态
  const result = await waitForTask(taskId);

  // 步骤3：下载图片
  if (!result.results || result.results.length === 0) {
    throw new Error('任务完成但未返回图片URL');
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const imagePath = path.join(OUTPUT_DIR, 'original-grid.png');
  await downloadImage(result.results[0], imagePath);

  // 步骤4：检查图片信息
  console.log('');
  console.log('=== 验证结果 ===');
  console.log(`任务状态: ${result.status}`);
  console.log(`图片URL: ${result.results[0]}`);
  console.log(`本地保存: ${imagePath}`);

  if (result.usage) {
    console.log(`实际消耗: ${JSON.stringify(result.usage)}`);
  }

  console.log('');
  console.log('✅ API 调用验证完成！请查看输出的图片。');
  console.log('下一步：运行 02-split-image.js 验证切图逻辑。');
}

main().catch((err) => {
  console.error('❌ 验证失败:', err.message);
  process.exit(1);
});
