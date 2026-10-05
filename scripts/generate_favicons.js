const fs = require('fs');
const path = require('path');
const sharp = require('c:/coding/CardForge/node_modules/sharp');

const rootDir = 'c:/coding/CardForge';
const originalSvgPath = path.join(rootDir, 'public', 'Logo PNG.svg');
const originalSvg = fs.readFileSync(originalSvgPath, 'utf8');

// Construct Favicon SVG with Diginoor dark background (#050505) and rounded corners (rx="220")
const faviconSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1072.19 1072.19">
  <rect width="1072.19" height="1072.19" rx="220" fill="#050505"/>
  <defs>
    <style>
      .cls-1 {
        fill: #dfff00;
      }
      .cls-2 {
        fill: #ffffff;
      }
    </style>
  </defs>
  <path class="cls-1" d="M857.11,940.86h-109.12c0-64.71-38.06-106.59-73.59-118-35.52-11.42-72.33,3.81-102.78,45.68-43.14,57.1-106.58,90.09-171.29,90.09-101.51,0-185.25-77.4-185.25-181.44,0-72.33,31.72-131.96,91.36-168.76h1.27c-34.26-44.41-54.56-100.24-54.56-161.14,0-143.38,115.46-258.85,258.85-258.85s258.85,115.47,258.85,258.85-116.73,258.85-258.85,258.85c-32.99,0-64.71-6.34-93.89-17.77-10.15-2.54-35.52,0-59.64,16.5-22.84,15.22-34.26,40.6-34.26,72.33,0,46.95,32.99,63.44,48.21,67.25,7.62,2.54,16.5,3.81,26.65,3.81,27.91,0,60.91-11.42,86.28-45.68,44.41-59.63,104.04-91.36,164.95-91.36,121.81,0,206.82,112.93,206.82,229.66ZM360.99,447.28c0,62.17,38.07,115.46,92.63,138.3,3.81,1.27,7.62,2.54,10.16,3.81,15.22,5.07,31.72,7.61,48.21,7.61,82.48,0,149.73-67.25,149.73-149.72s-67.25-151-149.73-151-151,67.25-151,151ZM688.36,166.86c0-29.18,24.11-53.29,54.56-53.29s54.56,24.11,54.56,53.29-24.11,54.56-54.56,54.56-54.56-24.11-54.56-54.56Z"/>
  <g>
    <path class="cls-2" d="M623.35,392.76h-132.98c13.52-23.47,25.51-44.85,38.28-65.74,1.61-2.64,7.4-4.11,11.11-3.88,30.94,1.86,75.14,38.48,83.59,69.62Z"/>
    <path class="cls-2" d="M523.07,320.1c-23.61,40.81-45.25,78.22-68.46,118.33-13.72-23.58-26.2-44.16-37.52-65.36-1.83-3.42-.18-11.23,2.74-14.24,26.97-27.87,59.92-41.04,103.25-38.73Z"/>
    <path class="cls-2" d="M398.92,500.47h133.57c-13.98,23.74-26.51,45.44-39.67,66.76-1.34,2.17-6.46,3.05-9.72,2.84-31.01-1.98-74.12-37.35-84.18-69.6Z"/>
    <path class="cls-2" d="M567.97,454.51c13.97,24.03,26.09,44.24,37.37,64.92,1.81,3.31,1.64,10.37-.67,12.85-27.34,29.38-61.24,42.71-105.26,41.02,23.26-40.31,44.87-77.73,68.56-118.79Z"/>
    <path class="cls-2" d="M476.16,491.65c-27.89,0-51.46.44-74.98-.42-4.06-.15-10.37-5.07-11.51-8.98-10.99-37.68-5.73-72.99,17.91-108.95,23.2,40.04,44.78,77.29,68.58,118.35Z"/>
    <path class="cls-2" d="M546.63,401.61c27.91,0,51.5-.33,75.06.34,3.72.1,9.58,3.98,10.62,7.3,11.99,38.37,6.93,74.3-17.55,110.32-22.87-39.59-44.41-76.9-68.12-117.95Z"/>
  </g>
</svg>`;

function createIco(pngBuffers, sizes) {
  const numImages = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = ICO
  header.writeUInt16LE(numImages, 4);

  let offset = 6 + 16 * numImages;
  const dirEntries = [];
  for (let i = 0; i < numImages; i++) {
    const size = sizes[i];
    const buf = pngBuffers[i];
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(buf.length, 8);
    entry.writeUInt32LE(offset, 12);
    dirEntries.push(entry);
    offset += buf.length;
  }
  return Buffer.concat([header, ...dirEntries, ...pngBuffers]);
}

async function generateAll() {
  const svgBuffer = Buffer.from(faviconSvg);

  // 1. Write public/favicon.svg and src/app/icon.svg
  fs.writeFileSync(path.join(rootDir, 'public', 'favicon.svg'), faviconSvg);
  fs.writeFileSync(path.join(rootDir, 'src', 'app', 'icon.svg'), faviconSvg);
  console.log('✓ Written public/favicon.svg and src/app/icon.svg');

  // 2. Generate PNGs: 16, 32, 48, 180, 192, 512
  const p16 = await sharp(svgBuffer).resize(16, 16).png().toBuffer();
  const p32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
  const p48 = await sharp(svgBuffer).resize(48, 48).png().toBuffer();
  const p180 = await sharp(svgBuffer).resize(180, 180).png().toBuffer();
  const p192 = await sharp(svgBuffer).resize(192, 192).png().toBuffer();
  const p512 = await sharp(svgBuffer).resize(512, 512).png().toBuffer();

  // Save Apple touch icons
  fs.writeFileSync(path.join(rootDir, 'public', 'apple-touch-icon.png'), p180);
  fs.writeFileSync(path.join(rootDir, 'src', 'app', 'apple-icon.png'), p180);
  console.log('✓ Written public/apple-touch-icon.png and src/app/apple-icon.png');

  // Save standard PNG icons
  fs.writeFileSync(path.join(rootDir, 'public', 'icon-192.png'), p192);
  fs.writeFileSync(path.join(rootDir, 'public', 'icon-512.png'), p512);
  fs.writeFileSync(path.join(rootDir, 'public', 'favicon-32x32.png'), p32);
  fs.writeFileSync(path.join(rootDir, 'public', 'favicon-16x16.png'), p16);
  console.log('✓ Written public/icon-192.png, icon-512.png, favicon-32x32.png, favicon-16x16.png');

  // 3. Generate multi-resolution ICO file (16, 32, 48)
  const icoBuffer = createIco([p16, p32, p48], [16, 32, 48]);
  fs.writeFileSync(path.join(rootDir, 'public', 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(rootDir, 'src', 'app', 'favicon.ico'), icoBuffer);
  console.log('✓ Written public/favicon.ico and replaced src/app/favicon.ico');

  // 4. Create Web App Manifest
  const manifest = {
    name: 'Diginoor',
    short_name: 'Diginoor',
    description: 'Ready-Made Poster Photo Replacement',
    start_url: '/',
    display: 'standalone',
    background_color: '#050505',
    theme_color: '#050505',
    icons: [
      {
        src: '/icon-192.png?v=2',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: '/icon-512.png?v=2',
        sizes: '512x512',
        type: 'image/png'
      },
      {
        src: '/favicon.svg?v=2',
        sizes: 'any',
        type: 'image/svg+xml'
      }
    ]
  };

  const manifestStr = JSON.stringify(manifest, null, 2);
  fs.writeFileSync(path.join(rootDir, 'public', 'manifest.json'), manifestStr);
  fs.writeFileSync(path.join(rootDir, 'public', 'site.webmanifest'), manifestStr);
  console.log('✓ Written public/manifest.json and public/site.webmanifest');

  console.log('All favicon assets generated successfully!');
}

generateAll().catch(err => {
  console.error('Generation failed:', err);
  process.exit(1);
});
