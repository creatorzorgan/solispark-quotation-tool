// Convert the letterhead PDF to a high-res JPEG for embedding in jsPDF.
// Usage: node scripts/pdf-to-image.mjs

import fs from 'fs';
import path from 'path';
import { createCanvas } from 'canvas';

// pdfjs-dist for Node
const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

const INPUT = path.resolve('C:/Users/ASUS/Downloads/quotation water mark paper (1).pdf');
const OUTPUT_JPG = path.resolve('src/assets/letterhead.jpg');
const OUTPUT_JS = path.resolve('src/assets/letterheadBase64.js');

async function run() {
  const data = new Uint8Array(fs.readFileSync(INPUT));
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const page = await doc.getPage(1);

  // Render at 2x for crisp output (A4 at 150 DPI ≈ 1240×1754)
  const scale = 2.0;
  const viewport = page.getViewport({ scale });
  const canvas = createCanvas(viewport.width, viewport.height);
  const ctx = canvas.getContext('2d');

  await page.render({ canvasContext: ctx, viewport }).promise;

  // Save as JPEG
  const dir = path.dirname(OUTPUT_JPG);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const jpgBuffer = canvas.toBuffer('image/jpeg', { quality: 0.85 });
  fs.writeFileSync(OUTPUT_JPG, jpgBuffer);
  console.log(`Wrote ${OUTPUT_JPG} (${(jpgBuffer.length / 1024).toFixed(0)} KB)`);

  // Also emit a JS module with the base64 data-URL so the browser can use it
  const b64 = jpgBuffer.toString('base64');
  const jsContent = `// Auto-generated from letterhead PDF — do not edit by hand.\nexport const LETTERHEAD_BASE64 = 'data:image/jpeg;base64,${b64}';\n`;
  fs.writeFileSync(OUTPUT_JS, jsContent);
  console.log(`Wrote ${OUTPUT_JS} (${(jsContent.length / 1024).toFixed(0)} KB)`);
}

run().catch((err) => { console.error(err); process.exit(1); });
