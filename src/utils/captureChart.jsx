// captureChart — render a React chart component off-screen and snapshot it as
// a high-resolution PNG dataURL, suitable for dropping into a jsPDF page.
//
// Why off-screen: generatePdf() needs a deterministic chart image regardless
// of which page the user is on when they click "Download PDF". Relying on the
// chart already being mounted in the DOM is fragile (QuotationDetail doesn't
// render Step 5 at all). So we spin up a transient container, render via
// react-dom, wait for recharts to paint, capture, unmount, and discard.

import React from 'react';
import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import SavingsChart from '../components/SavingsChart.jsx';

// Wait n animation frames — gives recharts time to mount, measure, and paint.
const raf = () => new Promise((resolve) => requestAnimationFrame(resolve));
const waitFrames = async (n) => {
  for (let i = 0; i < n; i++) await raf();
};

/**
 * Capture the 25-year savings chart as a PNG dataURL.
 * @param {object} params  Same shape SavingsChart accepts (monthlyBill, netCost, systemSizeKw, perUnitRate).
 * @param {object} [opts]
 * @param {number} [opts.width=1100]   Pixel width of the off-screen canvas.
 * @param {number} [opts.height=420]   Pixel height.
 * @param {number} [opts.scale=2]      html2canvas pixel-ratio (2 = retina-quality).
 * @returns {Promise<{ dataUrl: string, width: number, height: number } | null>}
 */
export async function captureSavingsChart(params, opts = {}) {
  const { width = 1100, height = 420, scale = 2 } = opts;

  // Create a hidden but *rendered* host. display:none would prevent recharts
  // from computing layout (no bounding client rect). Park it off-screen via
  // absolute positioning so it never flashes on screen.
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-10000px';
  host.style.top = '0';
  host.style.width = `${width}px`;
  host.style.height = `${height}px`;
  host.style.pointerEvents = 'none';
  host.style.zIndex = '-1';
  host.setAttribute('aria-hidden', 'true');
  document.body.appendChild(host);

  const root = createRoot(host);

  try {
    root.render(
      <SavingsChart {...params} forCapture width={width} height={height} />
    );

    // recharts paints across a few frames — wait long enough for the final
    // layout + stroke animations to settle (we've disabled animations via
    // forCapture, but initial measurement still takes a couple frames).
    await waitFrames(6);

    const canvas = await html2canvas(host, {
      backgroundColor: '#FFFFFF',
      scale,
      useCORS: true,
      logging: false,
      width,
      height,
    });

    return {
      dataUrl: canvas.toDataURL('image/png'),
      width: canvas.width,
      height: canvas.height,
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[captureSavingsChart] failed:', err);
    return null;
  } finally {
    try { root.unmount(); } catch (_) { /* already unmounted */ }
    if (host.parentNode) host.parentNode.removeChild(host);
  }
}
