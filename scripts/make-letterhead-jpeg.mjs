// Render letterhead PDF → high-quality JPEG → base64 JS module for jsPDF embedding
import * as mupdf from 'mupdf';
import fs from 'fs';

const data = fs.readFileSync('C:/Users/ASUS/Downloads/quotation water mark paper (1).pdf');
const doc = mupdf.Document.openDocument(data, 'application/pdf');
const page = doc.loadPage(0);

// Render at higher DPI for crisp output (A4: 595×842 pt → scale 2.5 ≈ 180 DPI)
const pixmap = page.toPixmap(mupdf.Matrix.scale(2.5, 2.5), mupdf.ColorSpace.DeviceRGB, false, true);
const pngBuf = pixmap.asPNG();

// Write PNG → JPEG via mupdf (use PNG directly for jsPDF — it handles both)
const outDir = 'src/assets';
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Write as PNG (jsPDF supports PNG natively)
fs.writeFileSync(`${outDir}/letterhead.png`, pngBuf);
console.log('PNG size:', (pngBuf.length / 1024).toFixed(0), 'KB');

// Create JS module with base64 data URL
const b64 = pngBuf.toString('base64');
const jsContent = `// Auto-generated — do not edit. Letterhead background for PDF proposals.\nexport const LETTERHEAD_IMG = 'data:image/png;base64,${b64}';\n`;
fs.writeFileSync(`${outDir}/letterheadImg.js`, jsContent);
console.log('JS module:', (jsContent.length / 1024).toFixed(0), 'KB');
