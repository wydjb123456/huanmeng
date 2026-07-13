import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const API_BASE = process.env.EVOLINK_API_BASE;
const API_KEY = process.env.EVOLINK_API_KEY;
const OUTPUT_DIR = path.resolve('client/public/images');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function createImageTask(prompt, size = '16:9') {
  const res = await fetch(`${API_BASE}/images/generations`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-image-2', prompt, size, resolution: '2K', quality: 'high', n: 1 }),
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
    if (s.status === 'failed') throw new Error(`${label} 失败: ${JSON.stringify(s).slice(0, 200)}`);
    await sleep(3000);
  }
  throw new Error('超时');
}

async function downloadAndCompress(url, name, width) {
  console.log(`下载 ${name}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`下载失败 ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const dst = path.join(OUTPUT_DIR, name);
  await sharp(buf).resize({ width }).webp({ quality: 85 }).toFile(dst);
  console.log(`  ${name}: ${(fs.statSync(dst).size / 1024).toFixed(0)} KB 完成`);
}

// 4 张新增艺术风格，丰富画廊
const TASKS = [
  {
    label: '水墨山水',
    name: 'ink-wash-mountain.webp',
    width: 1400,
    prompt: 'Traditional Chinese ink wash painting of misty mountains, layered peaks fading into clouds, single pine tree on a cliff, small waterfall, calligraphic brush strokes, monochrome with subtle blue-green tint, vast empty space, scholar solitude mood, Song dynasty style landscape art, no text',
  },
  {
    label: '印象派花园',
    name: 'impressionist-garden.webp',
    width: 1400,
    prompt: 'Impressionist oil painting of a garden pond with water lilies, soft dappled sunlight through willow trees, vibrant pink and purple blooms reflected in water, loose visible brushstrokes, atmospheric haze, golden hour warmth, Claude Monet style, museum quality fine art, no text',
  },
  {
    label: '梦境悬浮岛',
    name: 'surreal-islands.webp',
    width: 1500,
    prompt: 'Surreal dreamscape with floating rocky islands in a pastel sky, cascading waterfalls dissolving into clouds, ancient temple ruins atop the largest island, soft pink and lavender atmosphere, distant twin moons, ethereal glowing birds, dreamlike fantasy concept art, ultra detailed, no text',
  },
  {
    label: '秋日水彩林',
    name: 'watercolor-autumn.webp',
    width: 1400,
    prompt: 'Watercolor painting of an autumn forest path, warm orange red and golden maple leaves, soft wet-on-wet technique with pigment bleeds, dappled sunlight filtering through canopy, gentle path winding into depth, cozy nostalgic mood, hand-painted illustration feel, no text',
  },
];

async function main() {
  console.log('=== 生成 4 张新增艺术风格 ===\n');
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const t of TASKS) {
    if (fs.existsSync(path.join(OUTPUT_DIR, t.name))) {
      console.log(`[${t.label}] 已存在，跳过`);
      continue;
    }
    try {
      console.log(`\n[${t.label}] 提交...`);
      const task = await createImageTask(t.prompt, '16:9');
      console.log(`任务ID: ${task.id}`);
      const result = await waitForTask(task.id, t.label);
      await downloadAndCompress(result.results[0], t.name, t.width);
    } catch (err) {
      console.error(`\n[${t.label}] 失败: ${err.message.slice(0, 200)}`);
    }
  }
  console.log('\n=== 完成 ===');
}

main().catch((err) => { console.error('\n失败:', err.message); process.exit(1); });
