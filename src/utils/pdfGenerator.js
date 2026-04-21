// 10-page branded PDF proposal generator.
// Uses jsPDF for content rendering, then pdf-lib to stamp the Solispark
// letterhead PDF as the background on every quotation page (vector quality).
// After stamping, selected equipment datasheets are appended (no letterhead).

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { PDFDocument } from 'pdf-lib';
import { formatINR, formatDate, formatNumber, formatKw, formatKwh } from './format.js';

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
// and ends with the last, so branding is constant across every generated PDF.
const FIRST_PAGE_URL = publicUrl('quotation-page-first.pdf');
const LAST_PAGE_URL = publicUrl('quotation-page-last.pdf');

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

// Page number — small, unobtrusive (footer area belongs to letterhead)
const pageNum = (doc, num, total) => {
  rightText(doc, `${num} / ${total}`, PW - M, BOTTOM + 4, 7, GRAY);
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
  const totalPages = 11;
  const refNum = q.referenceNumber || 'SP-2026-XXXX';

  // Load signature up-front (awaited, used on terms page)
  const signature = await loadSignature();

  // Pre-compose the roof snapshot (if captured in Step 1) so it's ready to
  // drop onto the cover letter below the opening paragraph. Pre-composition
  // bakes in the rounded corners + drop shadow that jsPDF can't render.
  const roofSprite = c.roofSnapshot ? await composeRoofSnapshot(c.roofSnapshot) : null;

  // ── PAGE 1: Cover ────────────────────────────────────────────────────────
  let y = 55;
  centeredText(doc, co.name.toUpperCase(), y, 12, NAVY, 'bold');
  y += 7;
  centeredText(doc, co.tagline, y, 9, GOLD_DARK, 'normal');
  y += 20;

  centeredText(doc, 'Solar Energy', y, 34, NAVY, 'bold');
  y += 16;
  centeredText(doc, 'Proposal', y, 34, GOLD, 'bold');
  y += 12;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1);
  doc.line(PW / 2 - 30, y, PW / 2 + 30, y);
  y += 14;

  centeredText(doc, 'Prepared Exclusively For', y, 10, GRAY, 'normal');
  y += 10;
  centeredText(doc, c.fullName, y, 18, NAVY, 'bold');
  y += 8;
  if (c.address) {
    centeredText(doc, c.address, y, 9, GRAY, 'normal');
    y += 10;
  }
  y += 6;
  centeredText(doc, `Reference: ${refNum}`, y, 9, GOLD_DARK, 'bold');
  y += 6;
  centeredText(doc, `Date: ${formatDate(q.createdAt || new Date().toISOString())}`, y, 9, GRAY);

  // ── PAGE 2: Cover Letter ─────────────────────────────────────────────────
  doc.addPage();
  y = TOP + 6;

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
  let coverLetterOverflowed = false;
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

    // If the image pushed us near the footer, stamp page 2, then continue the
    // closing paragraphs on a fresh page so nothing gets clipped. The downstream
    // pageNum(doc, 2, ...) call is skipped via the overflow flag to avoid a
    // double stamp.
    if (y > BOTTOM - 70) {
      pageNum(doc, 2, totalPages);
      doc.addPage();
      y = TOP + 6;
      coverLetterOverflowed = true;
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

  // Only stamp the cover-letter page number here if we didn't already stamp it
  // on the first cover-letter page before overflowing the closing block.
  if (!coverLetterOverflowed) {
    pageNum(doc, 2, totalPages);
  }

  // ── PAGE 3: About Solispark ──────────────────────────────────────────────
  doc.addPage();
  y = TOP + 4;
  y = sectionHead(doc, 'About Solispark Energy', y);
  y += 4;
  const aboutText =
    'Solispark Energy Pvt. Ltd. is a Bengaluru-based solar energy company dedicated to making clean energy accessible, affordable, and beautifully engineered. We specialise in residential, commercial, and industrial solar installations backed by premium components, meticulous engineering, and an unwavering commitment to service excellence.';
  leftText(doc, aboutText, M, y, 10, NAVY, 'normal', CW);
  y += 28;

  // Key stats boxes
  const stats = [
    { label: 'Projects Delivered', value: co.stats.projects_completed },
    { label: 'Capacity Deployed', value: co.stats.deployed_capacity_mw + ' MW' },
    { label: 'Industrial Partners', value: co.stats.industrial_partners },
    { label: 'Google Rating', value: co.stats.google_rating + ' ★' },
  ];
  const statW = (CW - 12) / 4;
  stats.forEach((st, i) => {
    const sx = M + i * (statW + 4);
    rect(doc, sx, y, statW, 22, NAVY);
    doc.setFontSize(16);
    doc.setTextColor(...GOLD);
    doc.setFont(undefined, 'bold');
    doc.text(st.value, sx + statW / 2, y + 10, { align: 'center' });
    doc.setFontSize(7);
    doc.setTextColor(...WHITE);
    doc.setFont(undefined, 'normal');
    doc.text(st.label.toUpperCase(), sx + statW / 2, y + 17, { align: 'center' });
  });
  y += 30;

  y = sectionHead(doc, 'Certifications & Partnerships', y);
  y += 2;
  co.certifications.forEach((cert) => {
    rect(doc, M, y, 3, 3, GOLD);
    leftText(doc, cert, M + 7, y + 3, 10, NAVY, 'normal');
    y += 8;
  });
  y += 6;

  y = sectionHead(doc, 'Founded By', y);
  y += 2;
  co.founders.forEach((f) => {
    leftText(doc, f.name, M, y + 3, 11, NAVY, 'bold');
    leftText(doc, f.title, M + 60, y + 3, 10, GRAY);
    y += 8;
  });
  pageNum(doc, 3, totalPages);

  // ── PAGE 4: Energy Assessment ────────────────────────────────────────────
  doc.addPage();
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
  pageNum(doc, 4, totalPages);

  // ── PAGE 5: System Specifications ────────────────────────────────────────
  doc.addPage();
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
  pageNum(doc, 5, totalPages);

  // ── PAGE 6: Commercial Offer (simplified) ───────────────────────────────
  doc.addPage();
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

  pageNum(doc, 6, totalPages);

  // ── PAGE 7: ROI & Savings ───────────────────────────────────────────────
  doc.addPage();
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

  const barData = roi.yearlyBreakdown || [];
  if (barData.length > 0) {
    y = sectionHead(doc, 'Cumulative Savings vs. Investment (25 Years)', y);
    y += 4;
    const chartX = M;
    const chartW = CW;
    const chartH = 60;
    const maxVal = Math.max(...barData.map((d) => d.cumulative));
    // Payback basis: base cost ex-GST (aligned with ROI calc change)
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
  pageNum(doc, 7, totalPages);

  // ── PAGE 8: Why Solispark ───────────────────────────────────────────────
  doc.addPage();
  y = TOP + 4;
  y = sectionHead(doc, 'Why Solispark?', y);
  y += 4;

  const usps = [
    { title: '3D Modelling Before Commitment', desc: 'We create a detailed 3D model of your rooftop solar installation so you can visualise the outcome before a single panel is placed.' },
    { title: '48-Hour Service SLA', desc: 'Any issue, any time — our team responds within 48 hours, guaranteed. We believe in relationships, not transactions.' },
    { title: 'Custom Engineered Structures', desc: 'Every roof is different. We design and fabricate mounting structures tailored to your property — no cookie-cutter solutions.' },
    { title: 'Authorized Distribution Partner', desc: 'We are official partners of Axitec (Germany), Adani Solar, and Waaree — ensuring you get genuine, Tier-1 components with full warranty.' },
    { title: '30-Year Panel Replacement Warranty', desc: 'Our Axitec panels come with an industry-leading 30-year panel replacement warranty — not just a degradation guarantee.' },
  ];
  usps.forEach((usp, i) => {
    rect(doc, M, y, CW, 24, i % 2 === 0 ? OFF_WHITE : WHITE);
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.3);
    doc.rect(M, y, CW, 24, 'S');
    rect(doc, M + 5, y + 5, 4, 4, GOLD);
    leftText(doc, usp.title, M + 13, y + 9, 11, NAVY, 'bold');
    leftText(doc, usp.desc, M + 13, y + 16, 8, GRAY, 'normal', CW - 18);
    y += 28;
  });
  pageNum(doc, 8, totalPages);

  // ── PAGE 9: Scope of Work ───────────────────────────────────────────────
  doc.addPage();
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

  pageNum(doc, 9, totalPages);

  // ── PAGE 10: Terms of Offer ─────────────────────────────────────────────
  doc.addPage();
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
    pageNum(doc, 10, totalPages);
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

  pageNum(doc, 10, totalPages);

  // ── PAGE 11: Contact & Next Steps ────────────────────────────────────────
  doc.addPage();
  y = TOP + 20;
  centeredText(doc, 'Ready to Go Solar?', y, 26, NAVY, 'bold');
  y += 12;
  centeredText(doc, "Here's what happens next:", y, 12, GOLD_DARK, 'normal');
  y += 16;

  const steps = [
    'Sign this proposal and pay 30% advance',
    'We schedule your installation within 7 days',
    'Installation completed in 4–6 weeks',
    'Net metering application filed',
    'System commissioned — you start saving!',
  ];
  steps.forEach((step, i) => {
    const cx = PW / 2 - 65;
    const cy = y + 1;
    doc.setFillColor(...GOLD);
    doc.circle(cx, cy, 4, 'F');
    doc.setFontSize(9);
    doc.setTextColor(...NAVY);
    doc.setFont(undefined, 'bold');
    doc.text(String(i + 1), cx, cy + 1, { align: 'center' });
    leftText(doc, step, cx + 8, cy + 1, 11, NAVY, 'normal');
    y += 14;
  });

  y += 12;
  goldLine(doc, y);
  y += 16;
  centeredText(doc, 'Contact Us', y, 14, GOLD_DARK, 'bold');
  y += 10;
  centeredText(doc, co.phone_1 + '  |  ' + co.phone_2, y, 11, NAVY);
  y += 7;
  centeredText(doc, co.email, y, 11, NAVY);
  y += 7;
  centeredText(doc, co.website, y, 11, GOLD_DARK, 'bold');
  y += 14;
  centeredText(doc, co.tagline, y, 14, GOLD, 'bold');
  pageNum(doc, 11, totalPages);

  // ── Assemble final PDF ──────────────────────────────────────────────────
  // Order:
  //   1. quotation-page-first.pdf   (universal opener, unchanged)
  //   2. 10 content pages           (with letterhead stamped behind each)
  //   3. Selected datasheets        (original layout, no letterhead)
  //   4. quotation-page-last.pdf    (universal closer, unchanged)
  const contentBytes = doc.output('arraybuffer');
  const finalDoc = await PDFDocument.create();

  // 1. Universal first page — always prepended. Required.
  try {
    await appendStaticPdf(finalDoc, FIRST_PAGE_URL, 'quotation-page-first');
  } catch (err) {
    console.error(err);
    alert(
      `Could not load the universal first page (${FIRST_PAGE_URL}).\n\n` +
      `Check that the file exists at public/quotation-page-first.pdf.\n\n` +
      `Details: ${err.message}`
    );
    throw err;
  }

  // 2. Letterhead-stamped quotation content
  try {
    await stampLetterheadInto(finalDoc, contentBytes);
  } catch (err) {
    console.error(err);
    alert(
      `Could not load the letterhead watermark (${LETTERHEAD_URL}).\n\n` +
      `Check that the file exists at public/quoatation-water-mark-paper-final.pdf.\n\n` +
      `Details: ${err.message}`
    );
    throw err;
  }

  // 3. Selected equipment datasheets
  await appendDatasheets(finalDoc, q.attachedDocs || []);

  // 4. Universal last page — always appended. Required.
  try {
    await appendStaticPdf(finalDoc, LAST_PAGE_URL, 'quotation-page-last');
  } catch (err) {
    console.error(err);
    alert(
      `Could not load the universal last page (${LAST_PAGE_URL}).\n\n` +
      `Check that the file exists at public/quotation-page-last.pdf.\n\n` +
      `Details: ${err.message}`
    );
    throw err;
  }

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
