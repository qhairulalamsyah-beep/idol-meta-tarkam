import sharp from 'sharp';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const sizes = [72, 96, 128, 144, 152, 180, 192, 384, 512];
const logoPath = join(process.cwd(), 'public/assets/idm-logo.png');
const outputDir = join(process.cwd(), 'public');

async function generateIcons() {
  for (const size of sizes) {
    const outputPath = join(outputDir, `icon-${size}x${size}.png`);
    await sharp(logoPath)
      .resize(size, size, { fit: 'contain', background: { r: 11, g: 11, b: 15, alpha: 1 } })
      .png()
      .toFile(outputPath);
    console.log(`Generated: icon-${size}x${size}.png`);
  }
  
  // Generate favicon
  await sharp(logoPath)
    .resize(48, 48, { fit: 'contain', background: { r: 11, g: 11, b: 15, alpha: 1 } })
    .png()
    .toFile(join(outputDir, 'favicon.ico'));
  
  await sharp(logoPath)
    .resize(16, 16, { fit: 'contain', background: { r: 11, g: 11, b: 15, alpha: 1 } })
    .png()
    .toFile(join(outputDir, 'favicon-16x16.png'));
  
  await sharp(logoPath)
    .resize(32, 32, { fit: 'contain', background: { r: 11, g: 11, b: 15, alpha: 1 } })
    .png()
    .toFile(join(outputDir, 'favicon-32x32.png'));
  
  await sharp(logoPath)
    .resize(180, 180, { fit: 'contain', background: { r: 11, g: 11, b: 15, alpha: 1 } })
    .png()
    .toFile(join(outputDir, 'apple-touch-icon.png'));
  
  console.log('All icons generated!');
}

generateIcons().catch(console.error);
