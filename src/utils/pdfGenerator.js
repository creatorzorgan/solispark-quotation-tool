// 10-page branded PDF proposal generator.
// Uses jsPDF for content rendering, then pdf-lib to stamp the Solispark
// letterhead PDF as the background on every quotation page (vector quality).
// After stamping, selected equipment datasheets are appended (no letterhead).

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { formatINR, formatDate, formatNumber, formatKw, formatKwh } from './format.js';
import { captureSavingsChart } from './captureChart.jsx';

// jsPDF's default Helvetica has no glyph for `₹` (U+20B9) — it renders as
// a garbage character. We substitute `Rs.` for any currency output inside
// the PDF. The browser UI continues to use `₹` via formatINR directly.
const formatRs = (value, opts) => formatINR(value, opts).replace('₹', 'Rs. ');
const RS = 'Rs.';

// Brand colours (RGB arrays for jsPDF)
const NAVY = [15, 26, 46];
const NAVY_MID = [26, 39, 68];
const GOLD = [245, 166, 35];
const GOLD_DARK = [212, 137, 26];
const WHITE = [255, 255, 255];
const OFF_WHITE = [248, 246, 241];
const GRAY = [107, 101, 96];
const LIGHT_GRAY = [240, 237, 232];

const PW = 210; // A4 width mm
const PH = 297; // A4 height mm
const M = 20;   // left/right margin
const CW = PW - 2 * M; // content width

// Safe content zone — letterhead has logo top-right (~30mm) and footer (~18mm)
const TOP = 30;     // content starts below logo area
const BOTTOM = 275; // content must stay above footer area

// Public-folder asset URLs. MUST resolve against the Vite base URL so they
// keep working when the app is loaded from a non-root route (e.g. /quotations/abc).
// Using a relative string like 'foo.pdf' would resolve against the current
// document URL and 404 on every deep link.
const BASE = import.meta.env.BASE_URL || '/';
const publicUrl = (p) => `${BASE}${p}`;

// Signature image in /public (fetched at runtime; cached in module scope)
const SIGNATURE_URL = publicUrl('SYSTEM EQUIPMENTS/Signature conv 1/Signature conv 1.jpeg');
let SIGNATURE_DATA_URL = null;

// Universal bookend pages in /public — every quotation starts with the first
// and ends with the last so branding is constant across every generated PDF.
// The first page is a fully designed static cover supplied by the brand team;
// there is NO dynamic cover option. Any future "dynamic cover" idea must be
// rejected — those details belong on subsequent pages.
const FIRST_PAGE_URL = publicUrl('quotation-page-first.pdf');
const LAST_PAGE_URL = publicUrl('quotation-page-last.pdf');

// Newly-designed static marketing inserts interleaved with the dynamic pages
// at PDF assembly time. Full sequence: first-page → about-us → cover letter →
// why-solar → energy/specs → commercial/ROI → services → scope → how-it-works
// → terms → datasheets → last page. Enforced by the final assembly block.
const ABOUT_US_URL = publicUrl('about-us.pdf');
const WHY_SOLAR_URL = publicUrl('why-solar.pdf');
const SERVICES_URL = publicUrl('services.pdf');
const HOW_IT_WORKS_URL = publicUrl('how-it-works.pdf');

// Deep-navy brand colour used for the dynamic text overlay on about-us.pdf.
// Mirrors #0A192F from the UI.
const OVERLAY_NAVY = rgb(10 / 255, 25 / 255, 47 / 255);

// Letterhead watermark PDF — stamped behind every quotation page. Lives in
// /public so it can be swapped without a rebuild. Cached in module scope.
const LETTERHEAD_URL = publicUrl('quoatation-water-mark-paper-final.pdf');
let LETTERHEAD_BYTES = null;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const rect = (doc, x, y, w, h, color) => {
  doc.setFillColor(...color);
  doc.rect(x, y, w, h, 'F');
};

const centeredText = (doc, text, y, size, color, style = 'normal') => {
  doc.setFontSize(size);
  doc.setTextColor(...color);
  doc.setFont(undefined, style);
  doc.text(text, PW / 2, y, { align: 'center' });
};

const leftText = (doc, text, x, y, size, color, style = 'normal', maxWidth) => {
  doc.setFontSize(size);
  doc.setTextColor(...color);
  doc.setFont(undefined, style);
  if (maxWidth) doc.text(text, x, y, { maxWidth });
  else doc.text(text, x, y);
};

const rightText = (doc, text, x, y, size, color, style = 'normal') => {
  doc.setFontSize(size);
  doc.setTextColor(...color);
  doc.setFont(undefined, style);
  doc.text(text, x, y, { align: 'right' });
};

const goldLine = (doc, y) => {
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.7);
  doc.line(M, y, PW - M, y);
};

const sectionHead = (doc, title, y) => {
  doc.setFillColor(...GOLD);
  doc.rect(M, y, 4, 10, 'F');
  leftText(doc, title, M + 8, y + 7.5, 16, NAVY, 'bold');
  return y + 16;
};

const labelValue = (doc, label, value, y, x = M) => {
  leftText(doc, label, x, y, 9, GRAY, 'normal');
  leftText(doc, String(value), x + 55, y, 9, NAVY, 'bold');
  return y + 6;
};

// Write a bulleted item; auto-wraps and returns new y.
const bullet = (doc, text, y, opts = {}) => {
  const { indent = 6, size = 9, maxWidth = CW - 8, lineHeight = 4.6 } = opts;
  const bx = M + 2;
  doc.setFillColor(...GOLD);
  doc.circle(bx, y - 1.3, 0.9, 'F');
  doc.setFontSize(size);
  doc.setTextColor(...NAVY);
  doc.setFont(undefined, 'normal');
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, M + indent, y);
  return y + lines.length * lineHeight + 1;
};

// Write a paragraph with word-wrap; returns new y.
const para = (doc, text, y, opts = {}) => {
  const { size = 9, color = NAVY, style = 'normal', maxWidth = CW, lineHeight = 4.6 } = opts;
  doc.setFontSize(size);
  doc.setTextColor(...color);
  doc.setFont(undefined, style);
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, M, y);
  return y + lines.length * lineHeight + 1;
};

// Convert a number of rupees to Indian-style words (approximate, capitalised
// for the "Total Basic Price ... Only" row on the commercial offer).
const rupeesInWords = (n) => {
  if (!n || n <= 0) return 'Zero';
  const one = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = (num) => {
    if (num < 20) return one[num];
    return tens[Math.floor(num / 10)] + (num % 10 ? '-' + one[num % 10] : '');
  };
  const three = (num) => {
    const h = Math.floor(num / 100);
    const rest = num % 100;
    return (h ? one[h] + ' Hundred' + (rest ? ' ' : '') : '') + (rest ? two(rest) : '');
  };
  let num = Math.floor(n);
  const parts = [];
  const crore = Math.floor(num / 10000000); num %= 10000000;
  const lakh = Math.floor(num / 100000);   num %= 100000;
  const thousand = Math.floor(num / 1000); num %= 1000;
  const hundred = num;
  if (crore) parts.push(three(crore) + ' Crore');
  if (lakh) parts.push(two(lakh) + ' Lakh');
  if (thousand) parts.push(two(thousand) + ' Thousand');
  if (hundred) parts.push(three(hundred));
  return parts.join(' ');
};

// ─── Roof snapshot renderer ──────────────────────────────────────────────────
// jsPDF's addImage can't do rounded corners or drop shadows on its own, so we
// pre-compose the effect on a canvas: pad the bitmap with transparent gutters,
// stamp a soft shadow underneath, clip the source image to a rounded-rect path,
// and export as PNG with alpha. The resulting sprite drops into the document as
// a single image and feels like a premium custom-designed element.
async function composeRoofSnapshot(dataUrl) {
  if (!dataUrl) return null;
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = 'anonymous';
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = dataUrl;
    });

    // Canvas sizing — square-ish pad so the shadow blur has room to breathe.
    const pad = 48;
    const radius = 36;
    const canvas = document.createElement('canvas');
    canvas.width = img.width + pad * 2;
    canvas.height = img.height + pad * 2;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Path helper for the rounded rect.
    const roundedRectPath = () => {
      const x = pad;
      const y = pad;
      const w = img.width;
      const h = img.height;
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      ctx.lineTo(x + radius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    };

    // 1) Soft drop shadow — fill a rounded-rect "silhouette" with shadow cast.
    ctx.save();
    ctx.shadowColor = 'rgba(15, 26, 46, 0.28)';
    ctx.shadowBlur = 36;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 14;
    ctx.fillStyle = '#ffffff';
    roundedRectPath();
    ctx.fill();
    ctx.restore();

    // 2) Clip to the rounded rect and draw the map bitmap inside.
    ctx.save();
    roundedRectPath();
    ctx.clip();
    ctx.drawImage(img, pad, pad);
    ctx.restore();

    // 3) Subtle gold hairline border for the "premium custom proposal" feel.
    ctx.save();
    ctx.strokeStyle = 'rgba(212, 137, 26, 0.85)';
    ctx.lineWidth = 3;
    roundedRectPath();
    ctx.stroke();
    ctx.restore();

    return {
      dataUrl: canvas.toDataURL('image/png'),
      width: canvas.width,
      height: canvas.height,
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[pdf] composeRoofSnapshot failed:', err);
    return null;
  }
}

// ─── Signature image loader ──────────────────────────────────────────────────
async function loadSignature() {
  if (SIGNATURE_DATA_URL) return SIGNATURE_DATA_URL;
  try {
    const res = await fetch(encodeURI(SIGNATURE_URL));
    if (!res.ok) return null;
    const blob = await res.blob();
    SIGNATURE_DATA_URL = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return SIGNATURE_DATA_URL;
  } catch {
    return null;
  }
}

// ─── Letterhead stamping via pdf-lib ─────────────────────────────────────────
// Fetch the letterhead watermark PDF from /public once per session and cache it.
async function loadLetterheadBytes() {
  if (LETTERHEAD_BYTES) return LETTERHEAD_BYTES;
  const res = await fetch(encodeURI(LETTERHEAD_URL));
  if (!res.ok) {
    throw new Error(
      `[pdf] letterhead fetch failed (${res.status} ${res.statusText}) — tried: ${LETTERHEAD_URL}`
    );
  }
  LETTERHEAD_BYTES = await res.arrayBuffer();
  return LETTERHEAD_BYTES;
}

// Stamps the Solispark letterhead behind every page in `contentBytes`, appending
// the stamped pages to `finalDoc` in order. Returns `finalDoc`.
async function stampLetterheadInto(finalDoc, contentBytes) {
  const letterheadBytes = await loadLetterheadBytes();
  const letterheadDoc = await PDFDocument.load(letterheadBytes);
  const contentDoc = await PDFDocument.load(contentBytes);

  const [letterheadTemplate] = await finalDoc.embedPdf(letterheadDoc, [0]);
  const pages = contentDoc.getPages();

  for (let i = 0; i < pages.length; i++) {
    const { width, height } = pages[i].getSize();
    const newPage = finalDoc.addPage([width, height]);
    // Draw letterhead FIRST (background)
    newPage.drawPage(letterheadTemplate, { x: 0, y: 0, width, height });
    // Then overlay content page
    const [contentEmbed] = await finalDoc.embedPdf(contentDoc, [i]);
    newPage.drawPage(contentEmbed, { x: 0, y: 0, width, height });
  }
  return finalDoc;
}

// Fetch selected datasheet PDFs and append to the final doc (no letterhead).
async function appendDatasheets(finalDoc, paths) {
  if (!paths || !paths.length) return;
  for (const path of paths) {
    try {
      const res = await fetch(path);
      if (!res.ok) {
        console.warn('[pdf] datasheet fetch failed:', path, res.status);
        continue;
      }
      const bytes = await res.arrayBuffer();
      const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const copied = await finalDoc.copyPages(srcDoc, srcDoc.getPageIndices());
      copied.forEach((p) => finalDoc.addPage(p));
    } catch (err) {
      console.warn('[pdf] datasheet append failed:', path, err);
    }
  }
}

// Append every page of a static PDF (e.g. the universal first / last page)
// verbatim into `finalDoc` — no letterhead overlay, no modification. Throws
// on failure so the caller can surface the problem — these bookend pages are
// required on every quotation, silent skips are not acceptable.
async function appendStaticPdf(finalDoc, url, label) {
  // The URL may already contain spaces/special chars; encodeURI is idempotent.
  const res = await fetch(encodeURI(url));
  if (!res.ok) {
    throw new Error(
      `[pdf] ${label} fetch failed (${res.status} ${res.statusText}) — tried: ${url}`
    );
  }
  const bytes = await res.arrayBuffer();
  const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const copied = await finalDoc.copyPages(srcDoc, srcDoc.getPageIndices());
  copied.forEach((p) => finalDoc.addPage(p));
  return true;
}

// Same as appendStaticPdf, but runs `overlayFn(page, font)` on the first page
// after it's added to finalDoc. Used to stamp the personalised greeting onto
// the about-us.pdf cover at exact print-quality coordinates.
async function appendStaticPdfWithOverlay(finalDoc, url, label, overlayFn) {
  const res = await fetch(encodeURI(url));
  if (!res.ok) {
    throw new Error(
      `[pdf] ${label} fetch failed (${res.status} ${res.statusText}) — tried: ${url}`
    );
  }
  const bytes = await res.arrayBuffer();
  const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const copied = await finalDoc.copyPages(srcDoc, srcDoc.getPageIndices());
  copied.forEach((page, idx) => {
    const addedPage = finalDoc.addPage(page);
    if (idx === 0 && typeof overlayFn === 'function') {
      overlayFn(addedPage);
    }
  });
  return true;
}

// Letterhead-stamp every page of a jsPDF-generated content buffer into a
// standalone pdf-lib document, WITHOUT adding anything to the final doc. We
// later cherry-pick ranges of pages out of this standalone doc and interleave
// them with the static marketing PDFs. Returns the standalone document.
async function stampContentToStandaloneDoc(contentBytes) {
  const letterheadBytes = await loadLetterheadBytes();
  const letterheadSource = await PDFDocument.load(letterheadBytes);
  const contentDoc = await PDFDocument.load(contentBytes);

  const output = await PDFDocument.create();
  const [letterheadTemplate] = await output.embedPdf(letterheadSource, [0]);

  const pages = contentDoc.getPages();
  for (let i = 0; i < pages.length; i++) {
    const { width, height } = pages[i].getSize();
    const newPage = output.addPage([width, height]);
    // Letterhead in the background
    newPage.drawPage(letterheadTemplate, { x: 0, y: 0, width, height });
    // Content on top
    const [contentEmbed] = await output.embedPdf(contentDoc, [i]);
    newPage.drawPage(contentEmbed, { x: 0, y: 0, width, height });
  }
  return output;
}

// ─── Main generator ──────────────────────────────────────────────────────────
export const generatePdf = async ({ quotation: q, computed, config }) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const co = config.company;
  const c = q.client;
  const s = q.system;
  const e = q.energy;
  // Resolve panel: prefer preset, fall back to whatever the user typed on Step 3.
  const presetPanel = config.pricing_defaults.panels[s.panelKey];
  const panel = presetPanel || {
    brand: s.customPanelBrand || '',
    model: '',
    wattage: s.panelWattage,
    warranty_years: 25,
  };
  const inverter = config.pricing_defaults.inverters[s.inverterKey] || {};
  // DISCOM name (custom typed > preset). Used wherever BESCOM was hardcoded.
  const discomName =
    (computed && computed.discomName) ||
    e.customProviderName ||
    config.electricity_providers[e.provider]?.name ||
    'BESCOM';
  const refNum = q.referenceNumber || 'SP-2026-XXXX';

  // Dynamic-section page ranges inside the jsPDF content doc (1-indexed,
  // inclusive). Filled in as each section renders so the final assembly can
  // cherry-pick page ranges and interleave them with the static marketing
  // PDFs in the exact order the proposal demands. `sectionStart` is reset
  // at each section boundary via beginSection().
  const sections = {};
  const beginSection = (name) => {
    sections[name] = { start: doc.internal.getNumberOfPages() };
  };
  const endSection = (name) => {
    sections[name].end = doc.internal.getNumberOfPages();
  };

  // Load signature up-front (awaited, used on terms page)
  const signature = await loadSignature();

  // Pre-compose the roof snapshot (if captured in Step 1) so it's ready to
  // drop onto the cover letter below the opening paragraph. Pre-composition
  // bakes in the rounded corners + drop shadow that jsPDF can't render.
  const roofSprite = c.roofSnapshot ? await composeRoofSnapshot(c.roofSnapshot) : null;

  // Pre-capture the 25-year savings chart — rendered off-screen via recharts
  // + html2canvas — so we can drop a high-res PNG on the ROI page. We capture
  // up-front (not lazily on page 7) so any failure logs cleanly before jsPDF
  // has done significant work.
  let savingsChartSprite = null;
  const totalsSoFar = computed?.totals || {};
  const netCostForChart = (totalsSoFar.afterSubsidy || 0) + (totalsSoFar.gst || 0);
  if (s.systemSizeKw > 0 && e.perUnitRate > 0) {
    try {
      savingsChartSprite = await captureSavingsChart({
        monthlyBill: e.monthlyBill,
        netCost: netCostForChart,
        systemSizeKw: s.systemSizeKw,
        perUnitRate: e.perUnitRate,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[pdf] captureSavingsChart threw:', err);
    }
  }

  // NOTE: There is no dynamic cover page. The proposal always opens with the
  // static `quotation-page-first.pdf` supplied by the design team — it's
  // stitched in as the very first page during final assembly below. Do NOT
  // re-introduce a jsPDF-rendered cover here: the brand wants the first
  // impression to be a fixed, designed artefact, not something the tool
  // composes on the fly.

  // ── SECTION: Cover Letter (roof snapshot inline) ─────────────────────────
  // jsPDF auto-creates page 1 on construction, so the cover letter lands
  // directly on it — no `doc.addPage()` needed here.
  beginSection('coverLetter');
  let y = TOP + 6;

  // Date (right-aligned)
  const letterDate = formatDate(q.createdAt || new Date().toISOString());
  rightText(doc, letterDate, PW - M, y, 10, NAVY, 'bold');
  y += 10;

  // Reference number (left)
  leftText(doc, `Ref: ${refNum}`, M, y, 9, GOLD_DARK, 'bold');
  y += 10;

  // To: client block
  leftText(doc, 'To,', M, y, 10, NAVY, 'bold');
  y += 6;
  leftText(doc, c.fullName || '—', M, y, 10, NAVY, 'bold');
  y += 5;
  if (c.address) {
    const addrLines = doc.splitTextToSize(c.address, CW / 2);
    doc.setFontSize(9.5);
    doc.setTextColor(...NAVY);
    doc.setFont(undefined, 'normal');
    doc.text(addrLines, M, y);
    y += addrLines.length * 4.8;
  }
  if (c.phone) {
    leftText(doc, `Phone: ${c.phone}`, M, y, 9, GRAY);
    y += 5;
  }
  if (c.email) {
    leftText(doc, `Email: ${c.email}`, M, y, 9, GRAY);
    y += 5;
  }
  y += 6;

  // Subject (bold, underlined via gold line)
  const subjectLine = `Subject: Proposal for ${formatKw(s.systemSizeKw)} Rooftop Solar PV Grid-Connect System`;
  leftText(doc, subjectLine, M, y, 10.5, NAVY, 'bold', CW);
  y += 6;
  goldLine(doc, y);
  y += 8;

  // Salutation
  const salutationName = c.fullName ? c.fullName.split(' ')[0] : 'Sir/Madam';
  leftText(doc, `Dear ${salutationName},`, M, y, 10, NAVY, 'normal');
  y += 8;

  // Body paragraphs
  y = para(
    doc,
    `Thank you for your interest in Solispark Energy and for giving us the opportunity to partner with you on your journey towards clean, sustainable, and cost-effective power generation. We are pleased to submit our proposal for the design, supply, installation, and commissioning of a ${formatKw(s.systemSizeKw)} grid-connected rooftop solar PV system at your ${(c.propertyType || 'premises').toLowerCase()} located at ${c.address || 'the agreed site'}.`,
    y,
    { size: 10, lineHeight: 5 }
  );
  y += 3;

  // ── Roof satellite snapshot (if the sales team captured one in Step 1) ──
  // Centred under the opening paragraph. The drop shadow + rounded corners
  // are already baked into the sprite by composeRoofSnapshot(). We always
  // render if we have a sprite — previously an over-strict overflow guard
  // silently skipped the image on pages that already had long opening
  // paragraphs. Instead, if the remaining letter body won't fit below the
  // image on the same page, we flush to a fresh letterhead page and continue
  // the closing there. That way the sales team's capture is NEVER dropped.
  if (roofSprite) {
    // 95mm wide fits comfortably between the margins and keeps the aspect
    // readable. For a typical 4:3 map capture that's ~71mm tall.
    const imgW = 95;
    const aspect = roofSprite.height / roofSprite.width;
    const imgH = imgW * aspect;
    const imgX = (PW - imgW) / 2;

    // eslint-disable-next-line no-console
    console.debug('[pdf] embedding roof sprite', {
      y, imgW, imgH, spriteW: roofSprite.width, spriteH: roofSprite.height,
    });

    try {
      doc.addImage(roofSprite.dataUrl, 'PNG', imgX, y, imgW, imgH, undefined, 'FAST');
      y += imgH + 2;
      // Tiny caption so the client knows it's their exact property.
      centeredText(doc, 'Satellite view of the proposed installation site', y, 8, GRAY, 'italic');
      y += 6;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[pdf] roof sprite embed failed:', err);
    }

    // If the image pushed us near the footer, continue the closing paragraphs
    // on a fresh page so nothing gets clipped. Both the original cover-letter
    // page AND the overflow page get copied into the coverLetter section at
    // assembly time, so we don't need to track the split separately.
    if (y > BOTTOM - 70) {
      doc.addPage();
      y = TOP + 6;
    }
  }

  y = para(
    doc,
    `The proposed system comprises ${s.panelCount} × ${panel.brand || ''} ${panel.wattage || s.panelWattage}Wp solar modules paired with a ${s.inverterCapacityKw} kW ${inverter.brand || ''} inverter, mounted on a custom-engineered ${String(s.mounting || 'rooftop').toLowerCase()} structure. Based on your current monthly consumption of approximately ${formatRs(e.monthlyBill)}, this system is estimated to offset the majority of your electricity demand and deliver substantial long-term savings.`,
    y,
    { size: 10, lineHeight: 5 }
  );
  y += 3;

  y = para(
    doc,
    `This document contains the complete commercial offer, system specifications, scope of work, ROI projections, and terms of offer. Please review the detailed sections below — you will find a full breakdown of pricing, timelines, warranties, and our post-installation service commitments.`,
    y,
    { size: 10, lineHeight: 5 }
  );
  y += 3;

  y = para(
    doc,
    `We are confident that our Tier-1 components, custom engineering approach, and 48-hour service SLA will deliver a solution that exceeds your expectations. Should you have any questions or require further clarification, please feel free to reach out to us directly.`,
    y,
    { size: 10, lineHeight: 5 }
  );
  y += 3;

  y = para(
    doc,
    `We sincerely thank you for considering Solispark Energy and look forward to a long and mutually rewarding association.`,
    y,
    { size: 10, lineHeight: 5 }
  );
  y += 10;

  // Closing
  leftText(doc, 'Warm regards,', M, y, 10, NAVY, 'normal');
  y += 6;
  leftText(doc, 'For Solispark Energy Pvt. Ltd.', M, y, 10, NAVY, 'bold');
  y += 4;

  // Signature image
  if (signature) {
    try {
      doc.addImage(signature, 'JPEG', M, y, 36, 16);
      y += 17;
    } catch (err) {
      console.warn('[pdf] signature image failed on cover letter:', err);
      y += 10;
    }
  } else {
    y += 12;
  }

  leftText(doc, 'Ranveer Dorai / Pruthvik Hariprasad', M, y, 10, NAVY, 'bold');
  y += 5;
  leftText(doc, 'Director', M, y, 9, GRAY);
  endSection('coverLetter');

  // The legacy "About Solispark" dynamic page has been removed. The new
  // about-us.pdf (with a dynamic client-name overlay) is stitched in at
  // assembly time immediately after the cover page.

  // ── SECTION: Energy Assessment ───────────────────────────────────────────
  doc.addPage();
  beginSection('energy');
  y = TOP + 4;
  y = sectionHead(doc, 'Energy Assessment Summary', y);
  y += 4;

  const assessFields = [
    ['Current Monthly Bill', formatRs(e.monthlyBill)],
    ['Annual Electricity Spend', formatRs(e.monthlyBill * 12)],
    ['Electricity Provider', config.electricity_providers[e.provider]?.name || e.provider],
    ['Per-Unit Rate', `${RS} ${e.perUnitRate}/kWh`],
    ['Daily Consumption', `${e.dailyConsumptionKwh} kWh`],
    ['Available Roof Area', `${e.roofAreaSqft} sq.ft`],
    ['Roof Type', e.roofType],
    ['Shading', e.shading],
    ['Number of Floors', e.floors],
  ];
  assessFields.forEach(([lbl, val]) => { y = labelValue(doc, lbl, val, y); });
  y += 8;

  rect(doc, M, y, CW, 28, OFF_WHITE);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.rect(M, y, CW, 28, 'S');
  leftText(doc, 'RECOMMENDED SYSTEM SIZE', M + 6, y + 8, 8, GOLD_DARK, 'bold');
  leftText(doc, `${formatKw(s.systemSizeKw)}`, M + 6, y + 18, 20, NAVY, 'bold');
  leftText(
    doc,
    `Based on ${RS} ${formatNumber(e.monthlyBill)} monthly bill at ${RS} ${e.perUnitRate}/kWh with ${config.calculation_constants.peak_sun_hours}h peak sun.`,
    M + 6, y + 25, 8, GRAY
  );
  y += 38;

  // ── Bill-reduction visual (before vs. after solar) ──────────────────────
  // A compact horizontal bar comparison the client can read in a glance.
  // Most residential systems offset the majority of grid consumption; we
  // compute the post-solar figure from the ROI helper so it reflects the
  // actual sizing, not a marketing estimate.
  {
    const monthlyBill = e.monthlyBill || 0;
    const monthlyGen = computed?.roi?.monthlyGenKwh || 0;
    // What the solar system is worth each month at today's tariff, capped at
    // the current bill (you can't "save" more than you pay).
    const monthlySolarValue = Math.min(monthlyGen * (e.perUnitRate || 0), monthlyBill);
    const postSolarBill = Math.max(0, monthlyBill - monthlySolarValue);
    const pctReduction = monthlyBill > 0 ? Math.round((monthlySolarValue / monthlyBill) * 100) : 0;

    y = sectionHead(doc, 'What This System Does To Your Monthly Bill', y);
    y += 4;

    const barX = M;
    const barW = CW;
    const barH = 10;
    const labelW = 50;
    const trackW = barW - labelW - 40;

    // "Today" bar — full length (navy)
    leftText(doc, 'Today', barX, y + 7, 9, NAVY, 'bold');
    rect(doc, barX + labelW, y, trackW, barH, LIGHT_GRAY);
    rect(doc, barX + labelW, y, trackW, barH, NAVY);
    rightText(doc, formatRs(monthlyBill, { compact: true }) + ' / mo', barX + barW, y + 7, 9, NAVY, 'bold');
    y += barH + 4;

    // "After solar" bar — proportionally shorter, gold
    const afterBarW = monthlyBill > 0 ? trackW * (postSolarBill / monthlyBill) : 0;
    leftText(doc, 'After Solar', barX, y + 7, 9, NAVY, 'bold');
    rect(doc, barX + labelW, y, trackW, barH, LIGHT_GRAY);
    if (afterBarW > 0.5) rect(doc, barX + labelW, y, afterBarW, barH, GOLD);
    rightText(doc, formatRs(postSolarBill, { compact: true }) + ' / mo', barX + barW, y + 7, 9, GOLD_DARK, 'bold');
    y += barH + 6;

    // Big percentage-reduction callout
    rect(doc, barX, y, barW, 14, OFF_WHITE);
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.4);
    doc.rect(barX, y, barW, 14, 'S');
    leftText(doc, `Monthly bill reduction`, barX + 6, y + 9, 9, GRAY);
    doc.setFontSize(16);
    doc.setTextColor(...GOLD_DARK);
    doc.setFont(undefined, 'bold');
    doc.text(`${pctReduction}%`, barX + barW - 6, y + 10, { align: 'right' });
    y += 18;
  }
  endSection('energy');

  // ── SECTION: System Specifications ───────────────────────────────────────
  doc.addPage();
  beginSection('systemSpecs');
  y = TOP + 4;
  y = sectionHead(doc, 'System Design & Specifications', y);
  y += 2;

  doc.autoTable({
    startY: y,
    margin: { left: M, right: M },
    head: [['Components', 'Make']],
    body: [
      ['Solar Panels', `${s.panelCount} × ${panel.brand || ''} ${panel.model || ''} (${s.panelWattage}W each)`],
      ['Inverter', `${inverter.brand || ''} ${s.inverterCapacityKw} kW`],
      ['Mounting Structure', s.mounting],
      ['Electrical & Wiring', 'AC/DC wiring, ACDB/DCDB, earthing'],
      ['Net Metering', s.netMetering ? `Included (${discomName} application filed by Solispark)` : 'Not included'],
      ['Battery Backup', s.batteryOption === 'None' ? 'Not included' : s.batteryOption],
    ],
    headStyles: { fillColor: NAVY, textColor: WHITE, fontSize: 10, fontStyle: 'bold', halign: 'left' },
    bodyStyles: { textColor: NAVY, fontSize: 10, cellPadding: 5 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 55 },
      1: { cellWidth: 'auto' },
    },
    alternateRowStyles: { fillColor: OFF_WHITE },
    styles: { lineWidth: 0.1, lineColor: LIGHT_GRAY },
  });

  y = doc.lastAutoTable.finalY + 10;
  leftText(doc, 'Total System Capacity: ' + formatKw(s.systemSizeKw), M, y, 11, NAVY, 'bold');
  y += 6;
  leftText(doc, `Estimated monthly generation: ${formatKwh(computed?.roi?.monthlyGenKwh || 0)}`, M, y, 9, GRAY);
  endSection('systemSpecs');

  // ── SECTION: Commercial Offer ────────────────────────────────────────────
  doc.addPage();
  beginSection('commercial');
  y = TOP + 4;
  y = sectionHead(doc, 'Commercial Offer', y);
  y += 2;

  leftText(
    doc,
    'Note: Detailed Engineering and Design of structure will be done on receipt of customer confirmation.',
    M, y, 9, NAVY_MID, 'italic', CW
  );
  y += 8;

  const costs = computed?.costs || {};
  const totals = computed?.totals || {};

  // Resolved system price + DISCOM charges come straight from the computed
  // helper — they honour any manual overrides entered on Step 4.
  const systemPrice = computed?.systemPrice ?? 0;
  const discomFee = computed?.discomCharges ?? 0;
  const basicPrice = systemPrice + discomFee;

  const panelLabel = panel.brand
    ? `For ${String(panel.brand).toUpperCase()} ${panel.wattage || s.panelWattage}Wp ${panel.model ? panel.model : ''} for ${s.systemSizeKw} kW`
    : `For ${s.systemSizeKw} kW`;

  doc.autoTable({
    startY: y,
    margin: { left: M, right: M },
    head: [['Sl. No', 'Item Description', 'Rate (INR)', 'Qty (Nos)', 'Subtotal (INR)']],
    body: [
      [
        '1',
        `${s.systemSizeKw} kW capacity Roof Top Solar PV Grid Connect System for Design, Supply and Installation .`,
        formatNumber(systemPrice),
        '1',
        formatNumber(systemPrice),
      ],
      [
        '2',
        `Liasoning with ${discomName} for implementation of Systems (Registration, PPA, Bidirectional Meter & Synchronization and Enhancement of sanctioned load along with approval of PPA for solar load.`,
        formatNumber(discomFee),
        '1',
        formatNumber(discomFee),
      ],
      [
        {
          content: `Total Basic Price  Rs. ${rupeesInWords(basicPrice)} Only  ( ${panelLabel} )`,
          colSpan: 4,
          styles: { fontStyle: 'bold', fillColor: [...GOLD_DARK, 0], textColor: NAVY },
        },
        { content: formatNumber(basicPrice), styles: { fontStyle: 'bold', halign: 'right' } },
      ],
    ],
    headStyles: { fillColor: GOLD, textColor: NAVY, fontSize: 9, fontStyle: 'bold', halign: 'center' },
    bodyStyles: { textColor: NAVY, fontSize: 9, cellPadding: 4, valign: 'top' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 15 },
      2: { halign: 'right', cellWidth: 26 },
      3: { halign: 'center', cellWidth: 18 },
      4: { halign: 'right', cellWidth: 28, fontStyle: 'bold' },
    },
    styles: { lineWidth: 0.2, lineColor: GRAY },
  });

  y = doc.lastAutoTable.finalY + 8;

  // Subsidy / GST / Grand total summary
  if ((computed?.subsidy || 0) > 0) {
    leftText(doc, 'Government Subsidy (PM Surya Ghar Muft Bijli Yojana)', M + CW / 2 - 40, y, 10, GRAY);
    rightText(doc, `- ${formatRs(computed.subsidy)}`, PW - M, y, 11, NAVY, 'bold');
    y += 7;
  }
  leftText(doc, `GST @ ${config.pricing_defaults.tax.gst_rate_percent}%`, M + CW / 2 - 40, y, 10, GRAY);
  rightText(doc, formatRs(totals.gst), PW - M, y, 11, NAVY, 'bold');
  y += 5;
  goldLine(doc, y);
  y += 10;
  leftText(doc, 'GRAND TOTAL', M + CW / 2 - 40, y, 14, NAVY, 'bold');
  rightText(doc, formatRs(totals.grandTotal), PW - M, y, 16, GOLD_DARK, 'bold');
  endSection('commercial');

  // ── SECTION: ROI & Savings ───────────────────────────────────────────────
  doc.addPage();
  beginSection('roi');
  y = TOP + 4;
  y = sectionHead(doc, 'ROI & Savings Projection', y);
  y += 2;

  const roi = computed?.roi || {};
  // 2×4 stat-card grid — big bold numbers, tinted backgrounds so figures pop.
  const roiCards = [
    { label: 'Monthly Generation', value: formatKwh(roi.monthlyGenKwh) },
    { label: 'Monthly Savings', value: formatRs(roi.monthlySavings, { compact: true }) },
    { label: 'Annual Savings (Yr 1)', value: formatRs(roi.annualSavings, { compact: true }) },
    { label: 'Payback Period', value: `${roi.paybackYears} yrs` },
    { label: '25-Year Total Savings', value: formatRs(roi.totalSavings, { compact: true }) },
    { label: 'Effective ROI', value: `${roi.roiPercent}%` },
    { label: 'CO2 Offset / Year', value: `${formatNumber(roi.co2PerYear)} kg` },
    { label: 'Lifetime CO2 Offset', value: `${formatNumber(roi.co2Lifetime)} kg` },
  ];
  const gridCols = 4;
  const gridGap = 3;
  const cardW = (CW - gridGap * (gridCols - 1)) / gridCols;
  const cardH = 24;
  roiCards.forEach((card, i) => {
    const col = i % gridCols;
    const row = Math.floor(i / gridCols);
    const cx = M + col * (cardW + gridGap);
    const cy = y + row * (cardH + gridGap);
    // Alternating card tone: navy on row 0, off-white on row 1
    const bg = row === 0 ? NAVY : OFF_WHITE;
    const labelColor = row === 0 ? [200, 195, 188] : GRAY;
    const valueColor = row === 0 ? GOLD : NAVY;
    rect(doc, cx, cy, cardW, cardH, bg);
    // Gold accent bar on top of each card
    rect(doc, cx, cy, cardW, 1.2, GOLD);
    leftText(doc, card.label.toUpperCase(), cx + 3, cy + 6, 6.5, labelColor, 'bold');
    // Big bold value
    doc.setFontSize(14);
    doc.setTextColor(...valueColor);
    doc.setFont(undefined, 'bold');
    doc.text(String(card.value), cx + 3, cy + 17);
  });
  y += 2 * (cardH + gridGap) + 4;

  // Hero 25-year chart — captured from the recharts component so the PDF gets
  // exactly the same visual as the UI. Fills the full content width on the
  // ROI page, making this the single most prominent financial asset in the
  // whole proposal. If the capture failed (recharts didn't mount, html2canvas
  // threw, etc.), we fall back to the previous primitive bar chart so the
  // ROI page is never left bare.
  if (savingsChartSprite) {
    y = sectionHead(doc, '25-Year Savings vs. Grid Electricity', y);
    y += 4;

    // Keep the natural aspect so the recharts output doesn't get stretched.
    const chartW = CW;
    const chartH = chartW * (savingsChartSprite.height / savingsChartSprite.width);
    // Drop-shadow-ish framing: off-white rect behind, gold hairline outline.
    rect(doc, M - 1, y - 1, chartW + 2, chartH + 2, OFF_WHITE);
    try {
      doc.addImage(savingsChartSprite.dataUrl, 'PNG', M, y, chartW, chartH, undefined, 'FAST');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[pdf] savings chart embed failed:', err);
    }
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.4);
    doc.rect(M, y, chartW, chartH, 'S');
    y += chartH + 4;

    leftText(
      doc,
      'Net Solar Savings cross zero at payback year, turning into pure profit thereafter. Grid costs are projected at 3% yearly tariff escalation.',
      M, y, 8, GRAY, 'italic', CW
    );
    y += 6;
  } else {
    // Fallback: tiny jsPDF bar chart (original pre-recharts implementation).
    const barData = roi.yearlyBreakdown || [];
    if (barData.length > 0) {
      y = sectionHead(doc, 'Cumulative Savings vs. Investment (25 Years)', y);
      y += 4;
      const chartX = M;
      const chartW = CW;
      const chartH = 60;
      const maxVal = Math.max(...barData.map((d) => d.cumulative));
      const netCost = totals.afterSubsidy || 0;
      const barW = (chartW - 10) / barData.length;

      rect(doc, chartX, y, chartW, chartH, OFF_WHITE);

      barData.forEach((d, i) => {
        const bh = (d.cumulative / maxVal) * (chartH - 8);
        const bx = chartX + 5 + i * barW;
        const by = y + chartH - bh;
        const color = d.cumulative >= netCost ? GOLD : NAVY_MID;
        rect(doc, bx, by, barW - 1, bh, color);
        if (d.year === 1 || d.year % 5 === 0) {
          doc.setFontSize(6);
          doc.setTextColor(...GRAY);
          doc.text(`Y${d.year}`, bx + barW / 2, y + chartH + 4, { align: 'center' });
        }
      });

      if (netCost > 0 && netCost < maxVal) {
        const lineY = y + chartH - (netCost / maxVal) * (chartH - 8);
        doc.setDrawColor(239, 68, 68);
        doc.setLineWidth(0.5);
        doc.setLineDashPattern([2, 2], 0);
        doc.line(chartX, lineY, chartX + chartW, lineY);
        doc.setLineDashPattern([], 0);
        leftText(doc, `Investment: ${formatRs(netCost, { compact: true })}`, chartX + 2, lineY - 2, 7, [239, 68, 68], 'bold');
      }

      y += chartH + 10;
      rect(doc, M, y, 4, 4, NAVY_MID);
      leftText(doc, 'Recovering investment', M + 6, y + 3.5, 7, GRAY);
      rect(doc, M + 50, y, 4, 4, GOLD);
      leftText(doc, 'Net profit zone', M + 56, y + 3.5, 7, GRAY);
    }
  }
  endSection('roi');

  // The legacy "Why Solispark" USP page has been removed. services.pdf now
  // sits in that position in the final assembly and covers those points via
  // the new custom design.

  // ── SECTION: Scope of Work ───────────────────────────────────────────────
  doc.addPage();
  beginSection('scope');
  y = TOP + 4;
  y = sectionHead(doc, 'Scope of Work', y);
  y += 2;

  // Solispark responsibilities
  leftText(doc, "Solispark's Responsibilities", M, y, 12, GOLD_DARK, 'bold');
  y += 7;
  const ourResp = [
    'Supply, packing and forwarding of all system components',
    'Transportation & unloading at site',
    'Installation, testing and commissioning of the PV system',
    'Walkways (where applicable for serviceability)',
    'AC cable is considered maximum 25 meters; any additional length required will be charged extra at actuals',
    `${discomName} liaisoning — registration, PPA, bi-directional meter & synchronization`,
    'System earthing, lightning arrester and SPD installation',
  ];
  ourResp.forEach((t) => { y = bullet(doc, t, y); });
  y += 4;

  // Customer responsibilities
  leftText(doc, "Customer's Responsibilities", M, y, 12, GOLD_DARK, 'bold');
  y += 7;
  const custResp = [
    'Provision of staircase access to the roof',
    'Safe storage of material at site during installation',
    'All civil works — if required',
    'Provision of cable trench — if required',
    'Provision of parapet walls for RCC roofs / support railings for galvalume roofs',
    'Provision of pump for water line for module cleaning & plumbing lines',
    'Approvals and synchronization coordination with local authorities',
    'Regular cleaning of solar panels after system installation',
    'Ensure roof stability and strength for the installation',
    'Elevated / super structure for module mounting (where required)',
  ];
  custResp.forEach((t) => { y = bullet(doc, t, y); });
  y += 4;

  // Installation & Timelines
  leftText(doc, 'Installation and Timelines', M, y, 12, GOLD_DARK, 'bold');
  y += 7;
  y = para(
    doc,
    `The entire capacity of ${formatKw(s.systemSizeKw)} for ${c.fullName || 'the customer'} will be installed, commissioned and put into operation within a period of maximum 4-6 weeks from the date of your order, receipt of advance payments and all necessary drawing approvals in place.`,
    y, { size: 9, color: NAVY }
  );
  y += 4;

  // After-Sales Service
  leftText(doc, 'After-Sales Service', M, y, 12, GOLD_DARK, 'bold');
  y += 7;
  const afterSales = [
    'Solispark provides 1 year of free after-sales service. This entails:',
    '   — 3 free preventative maintenance visits by Solispark to check on system performance',
    '   — Free call-out in the event of any issues / troubleshooting',
    '   — An app to help you monitor the performance of your solar solution',
  ];
  afterSales.forEach((t, i) => {
    if (i === 0) y = para(doc, t, y, { size: 9, color: NAVY });
    else { leftText(doc, t, M + 2, y, 9, NAVY, 'normal', CW - 4); y += 5; }
  });
  y += 2;
  y = para(
    doc,
    `You can also choose an Annual Maintenance Contract (AMC) for preventative maintenance services of your system from the second year onward by contacting our customer care number ${co.phone_1 || co.phone || ''}.`,
    y, { size: 9, color: NAVY }
  );
  endSection('scope');

  // ── SECTION: Terms of Offer ──────────────────────────────────────────────
  doc.addPage();
  beginSection('terms');
  y = TOP + 4;
  y = sectionHead(doc, 'Terms of Offer', y);
  y += 4;

  const termHeading = (label, yy) => {
    leftText(doc, label, M, yy, 9.5, GOLD_DARK, 'bold');
    return yy + 5;
  };

  // 1. DELIVERY
  y = termHeading('1. DELIVERY:', y);
  y = para(doc, 'Supply & Installation will be completed within 4-6 weeks from the date of confirmation / PO from you with payment.', y, { size: 9 });
  y += 2;

  // 2. BASIS OF OFFER
  y = termHeading('2. BASIS OF OFFER:', y);
  y = para(doc, `Quoted Price is basic, GST extra @ ${config.pricing_defaults.tax.gst_rate_percent}%. Basis of offer is for Supply, Installation and Commissioning of the systems at site.`, y, { size: 9 });
  y += 2;

  // 3. VALIDITY
  y = termHeading('3. VALIDITY OF THE OFFER:', y);
  y = para(doc, '10 days from this offer date. Extension is only against our written confirmation.', y, { size: 9 });
  y += 2;

  // 4. PAYMENT TERMS
  y = termHeading('4. PAYMENT TERMS:', y);
  y = para(doc, '30% Advance Payment along with Confirmation/PO, 65% On readiness of Material against PI before supply & Balance 5% on completion of work.', y, { size: 9 });
  y += 2;

  // 5. Interest
  y = termHeading('5. Interest on Overdue Payment:', y);
  y = para(doc, 'In case Purchaser fails to make the due payment within the agreed stipulated timeframe, the Contractor/supplier shall be eligible to charge an interest @ 18% per annum on all overdue payments until the duration the payments are received.', y, { size: 9 });
  y += 2;

  // 6. Force Majeure
  y = termHeading('6. Force Majeure clause:', y);
  y = para(doc, 'This quotation as well as the resulting contract are subject to the standard force majeure condition.', y, { size: 9 });
  y += 2;

  // 7. Guarantees
  y = termHeading('7. Guarantees and Warranties:', y);
  const warranties = [
    'Solar PV modules are warranted for performance output. The standard terms are 90% of PV module output is guaranteed for a period of 10 years and 80% of the PV module output is guaranteed for a total period of 25 years by module manufacturers. Any shortfall in PV module output beyond what is defined above is compensated with additional modules for the drop in output as per manufacturer policy. We shall assign the module warranty in favour of end user. We do not provide any separate or additional warranty.',
    'Solar Inverter is warranted for 10 years against any manufacturing defects. The warranty / guarantee of manufacturer shall be assigned in favour of end user. We do not provide any separate or additional warranty.',
    'Balance of system components: We provide five-year warranty against any manufacturing defects and workmanship from the date of completion of work.',
    'System is covered under the comprehensive service for 1 year.',
  ];
  warranties.forEach((w) => { y = bullet(doc, w, y, { size: 8.5, maxWidth: CW - 10, lineHeight: 4.2 }); });
  y += 2;

  // 8. AMC
  y = termHeading('8. Annual Maintenance Contract:', y);
  y = para(doc, 'We can provide a separate annual maintenance contract if desired, which will be excluding the original warranties of inverter and module. We can also train your personnel for handling routine maintenance on their own while commissioning the system.', y, { size: 9 });
  y += 4;

  // If page is full, continue signature on the next page
  if (y > BOTTOM - 55) {
    doc.addPage();
    y = TOP + 4;
  }

  y = para(doc, 'You are requested to review our offer and come back to us for any further clarification. We look forward to have further communication from You to close the Purchase Order in Our Favour.', y, { size: 9 });
  y += 2;
  y = para(doc, 'Solispark Energy assures You our best after-sales services in ensuring the system performs exceeding the expectations.', y, { size: 9 });
  y += 6;
  leftText(doc, 'Thanking You,', M, y, 9, NAVY, 'normal');
  y += 5;
  leftText(doc, 'For Solispark Energy Pvt Ltd', M, y, 9.5, NAVY, 'bold');
  y += 3;

  // Signature image (above names). Sized ~40×18mm.
  if (signature) {
    try {
      doc.addImage(signature, 'JPEG', M, y, 40, 18);
      y += 18;
    } catch (err) {
      console.warn('[pdf] signature image failed:', err);
      y += 4;
    }
  } else {
    y += 14;
  }

  y += 2;
  leftText(doc, 'Ranveer Dorai / Pruthvik Hariprasad', M, y, 10, NAVY, 'bold');
  y += 5;
  leftText(doc, 'Director.', M, y, 9, GRAY);
  endSection('terms');

  // The legacy "Contact & Next Steps" dynamic page has been removed — the
  // new quotation-page-last.pdf supplied by design fulfils that role as the
  // permanent closing page, stitched in at assembly time.

  // ── Assemble final PDF ──────────────────────────────────────────────────
  // Interleave the dynamic sections (stamped with the Solispark letterhead)
  // with the four static marketing PDFs in this exact order:
  //
  //   1.  Cover Page — quotation-page-first.pdf   (static — the only cover)
  //   2.  About Our Company — about-us.pdf        (static + dynamic client-name overlay)
  //   3.  Cover Letter & Roof Snapshot            (dynamic)
  //   4.  Why Choose Solar? — why-solar.pdf       (static)
  //   5.  Energy Assessment                       (dynamic)
  //   6.  System Design & Specifications          (dynamic)
  //   7.  Commercial Offer                        (dynamic)
  //   8.  ROI & Savings Projection (w/ chart)     (dynamic)
  //   9.  Our Best Services — services.pdf        (static)
  //   10. Scope of Work                           (dynamic)
  //   11. How It Works — how-it-works.pdf         (static)
  //   12. Terms of Offer                          (dynamic)
  //   13. Technical Data Sheets                   (static — selected by user)
  //   14. quotation-page-last.pdf                 (universal closer)
  //
  // We render the dynamic pages into a jsPDF content buffer above, then
  // letterhead-stamp them into a standalone pdf-lib doc once, and cherry-pick
  // page ranges out of that doc to drop between the static inserts. The
  // `sections` map populated during rendering tells us where each section
  // lives in the stamped doc (1-indexed page ranges, inclusive).
  const contentBytes = doc.output('arraybuffer');
  const stampedDoc = await stampContentToStandaloneDoc(contentBytes);

  const finalDoc = await PDFDocument.create();
  const overlayFont = await finalDoc.embedFont(StandardFonts.HelveticaBold);

  // Copy a named section out of the stamped doc into the final doc, in order.
  const copySection = async (name) => {
    const range = sections[name];
    if (!range || range.start == null || range.end == null) {
      console.warn('[pdf] section missing from stamped doc:', name);
      return;
    }
    // Convert 1-indexed inclusive range → 0-indexed array of page indices.
    const indices = [];
    for (let i = range.start; i <= range.end; i++) indices.push(i - 1);
    const copied = await finalDoc.copyPages(stampedDoc, indices);
    copied.forEach((p) => finalDoc.addPage(p));
  };

  // Dynamic greeting stamped on page 1 of about-us.pdf. Navy-bold, top-center,
  // positioned so it sits cleanly inside the layout's designed header band.
  // pdf-lib uses a bottom-left origin in PDF points (1pt ≈ 0.353mm).
  const aboutOverlayFn = (page) => {
    const greeting = `A Custom Partnership Prepared For: ${c.fullName || 'Our Valued Client'}`;
    const { width, height } = page.getSize();
    const fontSize = 14;
    const textWidth = overlayFont.widthOfTextAtSize(greeting, fontSize);
    // ~36pt (≈ 12mm) from the top edge — sits above most hero imagery but
    // below any top-bar ornament the designer likely used.
    const y = height - 50;
    const x = (width - textWidth) / 2;
    page.drawText(greeting, {
      x,
      y,
      size: fontSize,
      font: overlayFont,
      color: OVERLAY_NAVY,
    });
  };

  // Helper: append a static PDF, loudly surfacing the failure if the file is
  // missing from /public so the sales team doesn't silently get an incomplete
  // document.
  const safeAppendStatic = async (url, label, overlayFn) => {
    try {
      if (overlayFn) {
        await appendStaticPdfWithOverlay(finalDoc, url, label, overlayFn);
      } else {
        await appendStaticPdf(finalDoc, url, label);
      }
    } catch (err) {
      console.error(err);
      alert(
        `Could not load ${label} (${url}).\n\n` +
        `Check that the file exists in /public.\n\n` +
        `Details: ${err.message}`
      );
      throw err;
    }
  };

  // 1. Universal first page (static — quotation-page-first.pdf). This is the
  //    ONLY valid cover page; there is no dynamic fallback.
  await safeAppendStatic(FIRST_PAGE_URL, 'quotation-page-first');

  // 2. About Our Company (static + client-name overlay)
  await safeAppendStatic(ABOUT_US_URL, 'about-us', aboutOverlayFn);

  // 3. Cover Letter with roof snapshot (dynamic)
  await copySection('coverLetter');

  // 4. Why Choose Solar? (static)
  await safeAppendStatic(WHY_SOLAR_URL, 'why-solar');

  // 5. Energy Assessment (dynamic)
  await copySection('energy');

  // 6. System Specifications (dynamic)
  await copySection('systemSpecs');

  // 7. Commercial Offer (dynamic)
  await copySection('commercial');

  // 8. ROI & Savings Chart (dynamic)
  await copySection('roi');

  // 9. Our Best Services (static)
  await safeAppendStatic(SERVICES_URL, 'services');

  // 10. Scope of Work (dynamic)
  await copySection('scope');

  // 11. How It Works (static)
  await safeAppendStatic(HOW_IT_WORKS_URL, 'how-it-works');

  // 12. Terms of Offer (dynamic)
  await copySection('terms');

  // 13. Technical Data Sheets — user-selected equipment datasheets (no
  //     letterhead so the OEM artwork reads at full fidelity).
  await appendDatasheets(finalDoc, q.attachedDocs || []);

  // 14. Universal last page — required.
  await safeAppendStatic(LAST_PAGE_URL, 'quotation-page-last');

  const finalBytes = await finalDoc.save();

  // Trigger download
  const blob = new Blob([finalBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Solispark_Proposal_${c.fullName.replace(/[^a-zA-Z0-9]/g, '_')}_${refNum}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
  return link.download;
};
