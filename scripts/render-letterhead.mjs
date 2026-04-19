import * as mupdf from 'mupdf';
import fs from 'fs';

const data = fs.readFileSync('C:/Users/ASUS/Downloads/quotation water mark paper (1).pdf');
const doc = mupdf.Document.openDocument(data, 'application/pdf');
const page = doc.loadPage(0);
const bounds = page.getBounds();
console.log('Page bounds:', JSON.stringify(bounds));

// Render at ~150 DPI
const pixmap = page.toPixmap(mupdf.Matrix.scale(2, 2), mupdf.ColorSpace.DeviceRGB, false, true);
const png = pixmap.asPNG();
fs.writeFileSync('src/assets/letterhead-preview.png', png);
console.log('Wrote PNG preview:', (png.length / 1024).toFixed(0), 'KB');
