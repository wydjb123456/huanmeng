import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const API_BASE = process.env.EVOLINK_API_BASE;
const API_KEY = process.env.EVOLINK_API_KEY;
const OUTPUT_DIR = path.resolve('client/public/images');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function createImageTask(prompt) {
  const res = await fetch(`${API_BASE}/images/generations`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-image-2', prompt, size: '1:1', resolution: '2K', quality: 'high', n: 1 }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`提交失败 ${res.status}: ${text}`);
  return JSON.parse(text);
}

async function queryTask(taskId) {
  const res = await fetch(`${API_BASE}/tasks/${taskId}`, { headers: { Authorization: `Bearer ${API_KEY}` } });
  return res.json();
}

async function waitForTask(taskId, label) {
  for (let i = 1; i <= 80; i++) {
    const s = await queryTask(taskId);
    process.stdout.write(`\r[${label}] ${i}/80 ${s.progress ?? 0}%   `);
    if (s.status === 'completed') { process.stdout.write('\n'); return s; }
    if (s.status === 'failed') throw new Error(`${label} 失败`);
    await sleep(3000);
  }
  throw new Error('超时');
}

async function downloadAndCompress(url, name, width) {
  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  const dst = path.join(OUTPUT_DIR, name);
  await sharp(buf).resize({ width }).webp({ quality: 80 }).toFile(dst);
  console.log(`  ${name}: ${(fs.statSync(dst).size / 1024).toFixed(0)} KB`);
}

// 只生成 2 张：流体渐变（用于首页背景装饰）+ 粒子光斑（用于页脚/CTA区装饰）
const TASKS = [
  {
    label: '流体渐变',
    name: 'fluid-gradient.webp',
    width: 1200,
    prompt: 'Abstract fluid gradient art, flowing waves of deep indigo, violet, and electric blue colors, smooth silk-like texture, ethereal mist, soft glowing light, premium aesthetic, ultra high quality, no text, pure visual art',
  },
  {
    label: '粒子光斑',
    name: 'particles.webp',
    width: 1200,
    prompt: 'Abstract particle field, thousands of tiny glowing dots forming flowing waves, deep space background, violet and blue luminescence, depth of field, dreamy ethereal atmosphere, premium digital art, no text, pure visual',
  },
];

async function main() {
  console.log('=== 串行生成 2 张抽象美学图 ===\n');
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const t of TASKS) {
    console.log(`\n[${t.label}] 提交...`);
    const task = await createImageTask(t.prompt);
    console.log(`任务ID: ${task.id}`);
    const result = await waitForTask(task.id, t.label);
    await downloadAndCompress(result.results[0], t.name, t.width);
  }
  console.log('\n=== 完成 ===');
}

main().catch((err) => { console.error('\n失败:', err.message); process.exit(1); });
