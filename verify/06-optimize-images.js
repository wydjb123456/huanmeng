import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const INPUT_DIR = path.resolve('client/public/images');
const SIZES = {
  'hero-preview.png': { width: 1280, name: 'hero-preview.webp' },
  'login-decor.png': { width: 1024, name: 'login-decor.webp' },
};

async function main() {
  console.log('压缩 UI 图片...\n');
  for (const [input, cfg] of Object.entries(SIZES)) {
    const src = path.join(INPUT_DIR, input);
    const dst = path.join(INPUT_DIR, cfg.name);
    const origSize = fs.statSync(src).size;
    await sharp(src).resize({ width: cfg.width }).webp({ quality: 82 }).toFile(dst);
    const newSize = fs.statSync(dst).size;
    console.log(`${input} -> ${cfg.name}`);
    console.log(`  ${(origSize / 1024).toFixed(0)} KB -> ${(newSize / 1024).toFixed(0)} KB (减少 ${((1 - newSize / origSize) * 100).toFixed(0)}%)`);
    // 删除原始大图
    fs.unlinkSync(src);
    console.log(`  已删除原图 ${input}`);
  }
  console.log('\n压缩完成');
}

main().catch((err) => {
  console.error('失败:', err.message);
  process.exit(1);
});
