/**
 * Generate og-image.png from og-image.svg
 * Run with: node scripts/generate-og-image.js
 */

import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

async function generateOgImage() {
  try {
    const svgPath = join(publicDir, 'og-image.svg');
    const pngPath = join(publicDir, 'og-image.png');
    
    const svgBuffer = readFileSync(svgPath);
    
    await sharp(svgBuffer)
      .resize(1200, 630)
      .png({ quality: 90 })
      .toFile(pngPath);
    
    console.log('✅ Generated og-image.png successfully!');
  } catch (error) {
    console.error('❌ Error generating og-image:', error.message);
    process.exit(1);
  }
}

generateOgImage();
