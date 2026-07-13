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
    body: JSON.stringify({ model: 'gpt-image-2', prompt, size, resolution: '4K', quality: 'high', n: 1 }),
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
    if (s.status === 'failed') {
      const detail = JSON.stringify(s);
      throw new Error(`${label} 失败: ${detail}`);
    }
    await sleep(3000);
  }
  throw new Error('超时');
}

async function downloadAndCompress(url, name, width) {
  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  const dst = path.join(OUTPUT_DIR, name);
  await sharp(buf).resize({ width }).webp({ quality: 85 }).toFile(dst);
  console.log(`  ${name}: ${(fs.statSync(dst).size / 1024).toFixed(0)} KB`);
}

// 调整后的艺术风格 prompt（避免品牌词，用描述性语言）
const TASKS = [
  {
    label: '动漫风景',
    name: 'anime-landscape.webp',
    width: 1600,
    prompt: 'Hand-painted anime style landscape illustration, lush green rolling hills under vast blue sky with fluffy cumulus clouds, winding river through golden meadows, distant misty mountains, warm afternoon sunlight, soft watercolor texture, dreamy peaceful pastoral scene, cinematic wide composition, highly detailed digital painting, no text, pure scenery art',
  },
  {
    label: '水彩花海',
    name: 'watercolor-flowers.webp',
    width: 1200,
    prompt: 'Dreamy watercolor painting of an endless flower field at sunset, soft washes of pink purple and gold, lavender and wildflowers swaying in breeze, loose wet-on-wet technique, ethereal romantic impressionist style, delicate color bleeding, artistic paper texture, no text, pure art',
  },
  {
    label: '星空油画',
    name: 'starry-oil.webp',
    width: 1400,
    prompt: 'Impressionist oil painting of a starry night sky over rolling hills, thick impasto brushstrokes, swirling cosmos in deep blues purples and golds, glowing stars, peaceful village silhouette below, textured canvas feel, post-impressionist style, museum quality artwork, no text',
  },
  {
    label: '浮世绘波浪',
    name: 'ukiyoe-wave.webp',
    width: 1400,
    prompt: 'Japanese woodblock print style artwork, great wave with stylized curling foam, gradient sky from indigo to soft pink at horizon, distant snow-capped mountain, traditional flat perspective with contemporary color palette, gold leaf accents, elegant minimal composition, no text',
  },
  {
    label: '极光山景',
    name: 'aurora-mountain.webp',
    width: 1600,
    prompt: 'Breathtaking aurora borealis digital painting over snowy mountain peaks, vibrant green and violet light curtains dancing across star-filled sky, mirror reflection in calm glacial lake, soft pastel snow gradients, dreamy cinematic atmosphere, ultra detailed, no text, pure landscape art',
  },
];

async function main() {
  console.log('=== 串行生成 5 张艺术风格主视觉图 ===\n');
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const succeeded = [];
  for (const t of TASKS) {
    try {
      console.log(`\n[${t.label}] 提交...`);
      const task = await createImageTask(t.prompt, '16:9');
      console.log(`任务ID: ${task.id}`);
      const result = await waitForTask(task.id, t.label);
      await downloadAndCompress(result.results[0], t.name, t.width);
      succeeded.push(t.name);
    } catch (err) {
      console.error(`\n[${t.label}] 失败: ${err.message.slice(0, 200)}`);
    }
  }
  console.log(`\n=== 完成，成功 ${succeeded.length}/${TASKS.length} ===`);
  console.log('已生成:', succeeded.join(', '));
}

main().catch((err) => { console.error('\n失败:', err.message); process.exit(1); });
