// Word (.docx) proposal generator — mirrors the PDF content in an editable
// Word-friendly layout. Uses `docx` which runs fully in the browser.
//
// The Word version is text-focused (no letterhead watermark, no charts, no
// datasheets). It carries the full written content of the proposal —
// cover letter, system specs, commercial offer, ROI, scope of work, terms
// — so the sales team can edit copy directly in Word before sending.

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  PageBreak,
  UnderlineType,
  convertInchesToTwip,
} from 'docx';
import { formatINR, formatDate, formatNumber, formatKw, formatKwh } from './format.js';

// Substitute Rs. for ₹ in the Word file — keeps it consistent with the PDF
// output and sidesteps any default-font glyph gaps in Word.
const formatRs = (value, opts) => formatINR(value, opts).replace('₹', 'Rs. ');

// ─── Brand colours (hex for docx) ────────────────────────────────────────────
const NAVY = '0F1A2E';
const GOLD = 'F5A623';
const GOLD_DARK = 'D4891A';
const GRAY = '6B6560';
const OFF_WHITE = 'F8F6F1';
const WHITE = 'FFFFFF';

// ─── Small helpers for building docx nodes ──────────────────────────────────
const run = (text, opts = {}) => new TextRun({
  text: String(text ?? ''),
  bold: opts.bold,
  italics: opts.italic,
  color: opts.color,
  size: opts.size,   // half-points: 20 = 10pt
  font: opts.font || 'Calibri',
  break: opts.break,
});

const p = (children, opts = {}) => new Paragraph({
  children: Array.isArray(children) ? children : [children],
  alignment: opts.alignment,
  heading: opts.heading,
  spacing: opts.spacing || { after: 120 },
  indent: opts.indent,
});

const txt = (text, opts = {}) => p(run(text, opts), { alignment: opts.alignment, spacing: opts.spacing });

const h1 = (text) => new Paragraph({
  children: [run(text, { bold: true, color: NAVY, size: 36, font: 'Calibri' })],
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 200, after: 160 },
  border: {
    bottom: { color: GOLD, size: 12, style: BorderStyle.SINGLE, space: 4 },
  },
});

const h2 = (text) => new Paragraph({
  children: [run(text, { bold: true, color: GOLD_DARK, size: 26 })],
  spacing: { before: 180, after: 120 },
});

const h3 = (text) => new Paragraph({
  children: [run(text, { bold: true, color: NAVY, size: 22 })],
  spacing: { before: 140, after: 100 },
});

const body = (text, opts = {}) => p(run(text, { color: NAVY, size: 22, ...opts }), {
  alignment: opts.alignment,
  spacing: { after: opts.afterSpacing ?? 120 },
});

const muted = (text, opts = {}) => p(run(text, { color: GRAY, size: 20, ...opts }));

const bulletP = (text) => new Paragraph({
  children: [run(text, { color: NAVY, size: 22 })],
  bullet: { level: 0 },
  spacing: { after: 80 },
});

const emptyLine = () => p(run(''), { spacing: { after: 80 } });

const pageBreak = () => new Paragraph({ children: [new PageBreak()] });

// ─── Table helpers ──────────────────────────────────────────────────────────
const cell = (text, opts = {}) => new TableCell({
  children: [
    new Paragraph({
      children: [run(text, {
        bold: opts.bold,
        color: opts.color || NAVY,
        size: opts.size || 20,
      })],
      alignment: opts.alignment || AlignmentType.LEFT,
    }),
  ],
  shading: opts.fill ? { type: ShadingType.CLEAR, color: 'auto', fill: opts.fill } : undefined,
  width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
});

const headerCell = (text, width) => cell(text, {
  bold: true,
  color: WHITE,
  fill: NAVY,
  alignment: AlignmentType.LEFT,
  width,
});

// ─── Section builders ───────────────────────────────────────────────────────
function coverPage({ co, c, refNum, dateStr }) {
  return [
    emptyLine(),
    txt(co.name.toUpperCase(), {
      bold: true, color: NAVY, size: 30, alignment: AlignmentType.CENTER,
    }),
    txt(co.tagline, {
      color: GOLD_DARK, size: 22, alignment: AlignmentType.CENTER,
    }),
    emptyLine(),
    emptyLine(),
    txt('Solar Energy Proposal', {
      bold: true, color: NAVY, size: 60, alignment: AlignmentType.CENTER,
    }),
    emptyLine(),
    txt('Prepared Exclusively For', {
      color: GRAY, size: 20, alignment: AlignmentType.CENTER,
    }),
    txt(c.fullName || '', {
      bold: true, color: NAVY, size: 36, alignment: AlignmentType.CENTER,
    }),
    c.address
      ? txt(c.address, { color: GRAY, size: 20, alignment: AlignmentType.CENTER })
      : emptyLine(),
    emptyLine(),
    txt(`Reference: ${refNum}`, {
      bold: true, color: GOLD_DARK, size: 20, alignment: AlignmentType.CENTER,
    }),
    txt(`Date: ${dateStr}`, {
      color: GRAY, size: 20, alignment: AlignmentType.CENTER,
    }),
    pageBreak(),
  ];
}

function coverLetter({ c, s, e, panel, inverter, refNum, dateStr }) {
  const salutationName = c.fullName ? c.fullName.split(' ')[0] : 'Sir/Madam';
  const systemSize = formatKw(s.systemSizeKw);
  const propertyType = (c.propertyType || 'premises').toLowerCase();

  return [
    txt(dateStr, { bold: true, color: NAVY, size: 22, alignment: AlignmentType.RIGHT }),
    txt(`Ref: ${refNum}`, { bold: true, color: GOLD_DARK, size: 20 }),
    emptyLine(),
    txt('To,', { bold: true, color: NAVY, size: 22 }),
    txt(c.fullName || '—', { bold: true, color: NAVY, size: 22 }),
    c.address ? body(c.address) : emptyLine(),
    c.phone ? muted(`Phone: ${c.phone}`) : null,
    c.email ? muted(`Email: ${c.email}`) : null,
    emptyLine(),
    new Paragraph({
      children: [run(`Subject: Proposal for ${systemSize} Rooftop Solar PV Grid-Connect System`, {
        bold: true, color: NAVY, size: 24,
      })],
      border: { bottom: { color: GOLD, size: 8, style: BorderStyle.SINGLE, space: 2 } },
      spacing: { after: 200 },
    }),
    body(`Dear ${salutationName},`, { afterSpacing: 160 }),
    body(
      `Thank you for your interest in Solispark Energy and for giving us the opportunity to partner with you on your journey towards clean, sustainable, and cost-effective power generation. We are pleased to submit our proposal for the design, supply, installation, and commissioning of a ${systemSize} grid-connected rooftop solar PV system at your ${propertyType} located at ${c.address || 'the agreed site'}.`,
      { afterSpacing: 160 },
    ),
    body(
      `The proposed system comprises ${s.panelCount} × ${panel.brand || ''} ${panel.wattage || s.panelWattage}Wp solar modules paired with a ${s.inverterCapacityKw} kW ${inverter.brand || ''} inverter, mounted on a custom-engineered ${String(s.mounting || 'rooftop').toLowerCase()} structure. Based on your current monthly consumption of approximately ${formatRs(e.monthlyBill)}, this system is estimated to offset the majority of your electricity demand and deliver substantial long-term savings.`,
      { afterSpacing: 160 },
    ),
    body(
      'This document contains the complete commercial offer, system specifications, scope of work, ROI projections, and terms of offer. Please review the detailed sections below — you will find a full breakdown of pricing, timelines, warranties, and our post-installation service commitments.',
      { afterSpacing: 160 },
    ),
    body(
      'We are confident that our Tier-1 components, custom engineering approach, and 48-hour service SLA will deliver a solution that exceeds your expectations. Should you have any questions or require further clarification, please feel free to reach out to us directly.',
      { afterSpacing: 160 },
    ),
    body(
      'We sincerely thank you for considering Solispark Energy and look forward to a long and mutually rewarding association.',
      { afterSpacing: 240 },
    ),
    body('Warm regards,'),
    txt('For Solispark Energy Pvt. Ltd.', { bold: true, color: NAVY, size: 22 }),
    emptyLine(),
    emptyLine(),
    txt('Ranveer Dorai / Pruthvik Hariprasad', { bold: true, color: NAVY, size: 22 }),
    muted('Director'),
    pageBreak(),
  ].filter(Boolean);
}

function aboutSolispark({ co }) {
  const out = [
    h1('About Solispark Energy'),
    body(
      'Solispark Energy Pvt. Ltd. is a Bengaluru-based solar energy company dedicated to making clean energy accessible, affordable, and beautifully engineered. We specialise in residential, commercial, and industrial solar installations backed by premium components, meticulous engineering, and an unwavering commitment to service excellence.',
    ),
    h3('Key Statistics'),
  ];

  const statsRows = [
    ['Projects Delivered', String(co.stats.projects_completed)],
    ['Capacity Deployed', `${co.stats.deployed_capacity_mw} MW`],
    ['Industrial Partners', String(co.stats.industrial_partners)],
    ['Google Rating', `${co.stats.google_rating} stars`],
  ];
  out.push(simpleTwoColTable(statsRows));

  out.push(h3('Certifications & Partnerships'));
  co.certifications.forEach((cert) => out.push(bulletP(cert)));

  out.push(h3('Founded By'));
  co.founders.forEach((f) => {
    out.push(p([
      run(f.name, { bold: true, color: NAVY, size: 22 }),
      run(`   —   ${f.title}`, { color: GRAY, size: 20 }),
    ]));
  });

  out.push(pageBreak());
  return out;
}

function simpleTwoColTable(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([k, v]) => new TableRow({
      children: [
        cell(k, { bold: true, width: 50, fill: OFF_WHITE }),
        cell(v, { width: 50 }),
      ],
    })),
  });
}

function energyAssessment({ e, s, config }) {
  const rows = [
    ['Current Monthly Bill', formatRs(e.monthlyBill)],
    ['Annual Electricity Spend', formatRs(e.monthlyBill * 12)],
    ['Electricity Provider', config.electricity_providers[e.provider]?.name || e.provider],
    ['Per-Unit Rate', `Rs. ${e.perUnitRate}/kWh`],
    ['Daily Consumption', `${e.dailyConsumptionKwh} kWh`],
    ['Available Roof Area', `${e.roofAreaSqft} sq.ft`],
    ['Roof Type', e.roofType],
    ['Shading', e.shading],
    ['Number of Floors', String(e.floors)],
  ];
  return [
    h1('Energy Assessment Summary'),
    simpleTwoColTable(rows),
    emptyLine(),
    h3('Recommended System Size'),
    txt(formatKw(s.systemSizeKw), { bold: true, color: NAVY, size: 44 }),
    muted(
      `Based on Rs. ${formatNumber(e.monthlyBill)} monthly bill at Rs. ${e.perUnitRate}/kWh with ${config.calculation_constants.peak_sun_hours}h peak sun.`,
    ),
    pageBreak(),
  ];
}

function systemSpecs({ s, panel, inverter, computed }) {
  const head = new TableRow({
    children: [headerCell('Components', 40), headerCell('Make', 60)],
  });
  const dataRows = [
    ['Solar Panels', `${s.panelCount} × ${panel.brand || ''} ${panel.model || ''} (${s.panelWattage}W each)`],
    ['Inverter', `${inverter.brand || ''} ${s.inverterCapacityKw} kW`],
    ['Mounting Structure', s.mounting],
    ['Electrical & Wiring', 'AC/DC wiring, ACDB/DCDB, earthing'],
    ['Net Metering', s.netMetering ? 'Included (BESCOM application filed by Solispark)' : 'Not included'],
    ['Battery Backup', s.batteryOption === 'None' ? 'Not included' : s.batteryOption],
  ].map(([k, v], i) => new TableRow({
    children: [
      cell(k, { bold: true, fill: i % 2 === 0 ? OFF_WHITE : WHITE }),
      cell(v, { fill: i % 2 === 0 ? OFF_WHITE : WHITE }),
    ],
  }));

  return [
    h1('System Design & Specifications'),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [head, ...dataRows],
    }),
    emptyLine(),
    txt(`Total System Capacity: ${formatKw(s.systemSizeKw)}`, {
      bold: true, color: NAVY, size: 24,
    }),
    muted(`Estimated monthly generation: ${formatKwh(computed?.roi?.monthlyGenKwh || 0)}`),
    pageBreak(),
  ];
}

function commercialOffer({ s, panel, computed, config }) {
  const costs = computed?.costs || {};
  const totals = computed?.totals || {};
  const systemPrice =
    (costs.panelsCost || 0) +
    (costs.inverter || 0) +
    (costs.mounting || 0) +
    (costs.electrical || 0) +
    (costs.labor || 0) +
    (costs.transport || 0) +
    (costs.battery || 0);
  const bescomFee = costs.netMetering || 0;
  const basicPrice = systemPrice + bescomFee;

  const head = new TableRow({
    children: [
      headerCell('Sl. No', 8),
      headerCell('Item Description', 52),
      headerCell('Rate (INR)', 14),
      headerCell('Qty', 8),
      headerCell('Subtotal (INR)', 18),
    ],
  });

  const rows = [
    new TableRow({
      children: [
        cell('1', { alignment: AlignmentType.CENTER }),
        cell(`${s.systemSizeKw} kW capacity Roof Top Solar PV Grid Connect System for Design, Supply and Installation.`),
        cell(formatNumber(systemPrice), { alignment: AlignmentType.RIGHT }),
        cell('1', { alignment: AlignmentType.CENTER }),
        cell(formatNumber(systemPrice), { alignment: AlignmentType.RIGHT, bold: true }),
      ],
    }),
    new TableRow({
      children: [
        cell('2', { alignment: AlignmentType.CENTER }),
        cell('Liasoning with BESCOM for implementation of Systems (Registration, PPA, Bidirectional Meter & Synchronization and Enhancement of sanctioned load along with approval of PPA for solar load).'),
        cell(formatNumber(bescomFee), { alignment: AlignmentType.RIGHT }),
        cell('1', { alignment: AlignmentType.CENTER }),
        cell(formatNumber(bescomFee), { alignment: AlignmentType.RIGHT, bold: true }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 4,
          shading: { type: ShadingType.CLEAR, color: 'auto', fill: OFF_WHITE },
          children: [new Paragraph({
            children: [run(`Total Basic Price — for ${panel.brand || ''} ${panel.wattage || s.panelWattage}Wp ${panel.model || ''} for ${s.systemSizeKw} kW`, {
              bold: true, color: NAVY, size: 20,
            })],
          })],
        }),
        cell(formatNumber(basicPrice), { bold: true, alignment: AlignmentType.RIGHT, fill: OFF_WHITE }),
      ],
    }),
  ];

  const out = [
    h1('Commercial Offer'),
    txt('Note: Detailed Engineering and Design of structure will be done on receipt of customer confirmation.', {
      italic: true, color: NAVY, size: 20,
    }),
    emptyLine(),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [head, ...rows],
    }),
    emptyLine(),
  ];

  if ((computed?.subsidy || 0) > 0) {
    out.push(simpleTwoColTable([
      ['Government Subsidy (PM Surya Ghar Muft Bijli Yojana)', `- ${formatRs(computed.subsidy)}`],
      [`GST @ ${config.pricing_defaults.tax.gst_rate_percent}%`, formatRs(totals.gst)],
    ]));
  } else {
    out.push(simpleTwoColTable([
      [`GST @ ${config.pricing_defaults.tax.gst_rate_percent}%`, formatRs(totals.gst)],
    ]));
  }

  out.push(emptyLine());
  out.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          cell('GRAND TOTAL', { bold: true, size: 26, fill: NAVY, color: WHITE, width: 60 }),
          cell(formatRs(totals.grandTotal), {
            bold: true, size: 30, color: GOLD, fill: NAVY,
            alignment: AlignmentType.RIGHT, width: 40,
          }),
        ],
      }),
    ],
  }));
  out.push(pageBreak());
  return out;
}

function roiSection({ computed }) {
  const roi = computed?.roi || {};
  const out = [
    h1('ROI & Savings Projection'),
    simpleTwoColTable([
      ['Estimated Monthly Generation', formatKwh(roi.monthlyGenKwh)],
      ['Estimated Monthly Savings', formatRs(roi.monthlySavings)],
      ['Annual Savings (Year 1)', formatRs(roi.annualSavings)],
      ['Payback Period', `${roi.paybackYears} years`],
      ['25-Year Total Savings', formatRs(roi.totalSavings)],
      ['Effective ROI', `${roi.roiPercent}%`],
      ['CO2 Offset per Year', `${formatNumber(roi.co2PerYear)} kg`],
      ['Lifetime CO2 Offset', `${formatNumber(roi.co2Lifetime)} kg`],
    ]),
    pageBreak(),
  ];
  return out;
}

function whySolispark() {
  const usps = [
    { title: '3D Modelling Before Commitment', desc: 'We create a detailed 3D model of your rooftop solar installation so you can visualise the outcome before a single panel is placed.' },
    { title: '48-Hour Service SLA', desc: 'Any issue, any time — our team responds within 48 hours, guaranteed. We believe in relationships, not transactions.' },
    { title: 'Custom Engineered Structures', desc: 'Every roof is different. We design and fabricate mounting structures tailored to your property — no cookie-cutter solutions.' },
    { title: 'Authorized Distribution Partner', desc: 'We are official partners of Axitec (Germany), Adani Solar, and Waaree — ensuring you get genuine, Tier-1 components with full warranty.' },
    { title: '30-Year Panel Replacement Warranty', desc: 'Our Axitec panels come with an industry-leading 30-year panel replacement warranty — not just a degradation guarantee.' },
  ];
  const out = [h1('Why Solispark?')];
  usps.forEach((usp) => {
    out.push(p([run(usp.title, { bold: true, color: NAVY, size: 24 })]));
    out.push(p([run(usp.desc, { color: GRAY, size: 20 })]));
    out.push(emptyLine());
  });
  out.push(pageBreak());
  return out;
}

function scopeOfWork({ s, c, co }) {
  const ourResp = [
    'Supply, packing and forwarding of all system components',
    'Transportation & unloading at site',
    'Installation, testing and commissioning of the PV system',
    'Walkways (where applicable for serviceability)',
    'AC cable is considered maximum 25 meters; any additional length required will be charged extra at actuals',
    'BESCOM liaisoning — registration, PPA, bi-directional meter & synchronization',
    'System earthing, lightning arrester and SPD installation',
  ];
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
  const afterSales = [
    '3 free preventative maintenance visits by Solispark to check on system performance',
    'Free call-out in the event of any issues / troubleshooting',
    'An app to help you monitor the performance of your solar solution',
  ];

  return [
    h1('Scope of Work'),
    h3("Solispark's Responsibilities"),
    ...ourResp.map(bulletP),
    h3("Customer's Responsibilities"),
    ...custResp.map(bulletP),
    h3('Installation and Timelines'),
    body(
      `The entire capacity of ${formatKw(s.systemSizeKw)} for ${c.fullName || 'the customer'} will be installed, commissioned and put into operation within a period of maximum 4-6 weeks from the date of your order, receipt of advance payments and all necessary drawing approvals in place.`,
    ),
    h3('After-Sales Service'),
    body('Solispark provides 1 year of free after-sales service. This entails:'),
    ...afterSales.map(bulletP),
    body(
      `You can also choose an Annual Maintenance Contract (AMC) for preventative maintenance services of your system from the second year onward by contacting our customer care number ${co.phone_1 || co.phone || ''}.`,
    ),
    pageBreak(),
  ];
}

function termsOfOffer({ config }) {
  const gst = config.pricing_defaults.tax.gst_rate_percent;
  const term = (title, text) => [
    p([run(title, { bold: true, color: GOLD_DARK, size: 22 })], { spacing: { before: 140, after: 80 } }),
    body(text),
  ];
  const warranties = [
    'Solar PV modules are warranted for performance output. The standard terms are 90% of PV module output is guaranteed for a period of 10 years and 80% of the PV module output is guaranteed for a total period of 25 years by module manufacturers. Any shortfall in PV module output beyond what is defined above is compensated with additional modules for the drop in output as per manufacturer policy. We shall assign the module warranty in favour of end user. We do not provide any separate or additional warranty.',
    'Solar Inverter is warranted for 10 years against any manufacturing defects. The warranty / guarantee of manufacturer shall be assigned in favour of end user. We do not provide any separate or additional warranty.',
    'Balance of system components: We provide five-year warranty against any manufacturing defects and workmanship from the date of completion of work.',
    'System is covered under the comprehensive service for 1 year.',
  ];

  return [
    h1('Terms of Offer'),
    ...term('1. DELIVERY:', 'Supply & Installation will be completed within 4-6 weeks from the date of confirmation / PO from you with payment.'),
    ...term('2. BASIS OF OFFER:', `Quoted Price is basic, GST extra @ ${gst}%. Basis of offer is for Supply, Installation and Commissioning of the systems at site.`),
    ...term('3. VALIDITY OF THE OFFER:', '10 days from this offer date. Extension is only against our written confirmation.'),
    ...term('4. PAYMENT TERMS:', '30% Advance Payment along with Confirmation/PO, 65% On readiness of Material against PI before supply & Balance 5% on completion of work.'),
    ...term('5. Interest on Overdue Payment:', 'In case Purchaser fails to make the due payment within the agreed stipulated timeframe, the Contractor/supplier shall be eligible to charge an interest @ 18% per annum on all overdue payments until the duration the payments are received.'),
    ...term('6. Force Majeure clause:', 'This quotation as well as the resulting contract are subject to the standard force majeure condition.'),
    p([run('7. Guarantees and Warranties:', { bold: true, color: GOLD_DARK, size: 22 })], { spacing: { before: 140, after: 80 } }),
    ...warranties.map(bulletP),
    ...term('8. Annual Maintenance Contract:', 'We can provide a separate annual maintenance contract if desired, which will be excluding the original warranties of inverter and module. We can also train your personnel for handling routine maintenance on their own while commissioning the system.'),
    emptyLine(),
    body('You are requested to review our offer and come back to us for any further clarification. We look forward to have further communication from You to close the Purchase Order in Our Favour.'),
    body('Solispark Energy assures You our best after-sales services in ensuring the system performs exceeding the expectations.'),
    emptyLine(),
    body('Thanking You,'),
    txt('For Solispark Energy Pvt Ltd', { bold: true, color: NAVY, size: 22 }),
    emptyLine(),
    emptyLine(),
    txt('Ranveer Dorai / Pruthvik Hariprasad', { bold: true, color: NAVY, size: 22 }),
    muted('Director'),
    pageBreak(),
  ];
}

function nextSteps({ co }) {
  const steps = [
    'Sign this proposal and pay 30% advance',
    'We schedule your installation within 7 days',
    'Installation completed in 4–6 weeks',
    'Net metering application filed',
    'System commissioned — you start saving!',
  ];
  return [
    txt('Ready to Go Solar?', { bold: true, color: NAVY, size: 50, alignment: AlignmentType.CENTER }),
    txt("Here's what happens next:", { color: GOLD_DARK, size: 24, alignment: AlignmentType.CENTER }),
    emptyLine(),
    ...steps.map((step, i) => p([
      run(`${i + 1}. `, { bold: true, color: GOLD_DARK, size: 24 }),
      run(step, { color: NAVY, size: 22 }),
    ])),
    emptyLine(),
    emptyLine(),
    txt('Contact Us', { bold: true, color: GOLD_DARK, size: 28, alignment: AlignmentType.CENTER }),
    txt(`${co.phone_1}  |  ${co.phone_2}`, { color: NAVY, size: 22, alignment: AlignmentType.CENTER }),
    txt(co.email, { color: NAVY, size: 22, alignment: AlignmentType.CENTER }),
    txt(co.website, { bold: true, color: GOLD_DARK, size: 22, alignment: AlignmentType.CENTER }),
    emptyLine(),
    txt(co.tagline, { bold: true, color: GOLD, size: 26, alignment: AlignmentType.CENTER }),
  ];
}

// ─── Main generator ─────────────────────────────────────────────────────────
export const generateDocx = async ({ quotation: q, computed, config }) => {
  const co = config.company;
  const c = q.client;
  const s = q.system;
  const e = q.energy;
  const panel = config.pricing_defaults.panels[s.panelKey] || {};
  const inverter = config.pricing_defaults.inverters[s.inverterKey] || {};
  const refNum = q.referenceNumber || 'SP-2026-XXXX';
  const dateStr = formatDate(q.createdAt || new Date().toISOString());

  const doc = new Document({
    creator: 'Solispark Energy',
    title: `Solar Proposal — ${c.fullName}`,
    description: `Solar energy proposal for ${c.fullName}`,
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 22 } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.8),
              right: convertInchesToTwip(0.8),
              bottom: convertInchesToTwip(0.8),
              left: convertInchesToTwip(0.8),
            },
          },
        },
        children: [
          ...coverPage({ co, c, refNum, dateStr }),
          ...coverLetter({ c, s, e, panel, inverter, refNum, dateStr }),
          ...aboutSolispark({ co }),
          ...energyAssessment({ e, s, config }),
          ...systemSpecs({ s, panel, inverter, computed }),
          ...commercialOffer({ s, panel, computed, config }),
          ...roiSection({ computed }),
          ...whySolispark(),
          ...scopeOfWork({ s, c, co }),
          ...termsOfOffer({ config }),
          ...nextSteps({ co }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Solispark_Proposal_${(c.fullName || 'Client').replace(/[^a-zA-Z0-9]/g, '_')}_${refNum}.docx`;
  link.click();
  URL.revokeObjectURL(url);
  return link.download;
};
