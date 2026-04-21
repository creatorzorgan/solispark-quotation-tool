// RoofImageUpload — manual fallback to the interactive map.
//
// Accepts a file drop or a file picker click, normalises the image (max
// 1600 px wide JPEG @ 85 %) so the JSON payload stays small, and calls
// onCapture with the same shape the map capture uses. That way the PDF
// cover-letter renderer treats map captures and manual uploads identically.

import React, { useRef, useState, useCallback } from 'react';
import { Upload, Image as ImageIcon, AlertTriangle, Loader2 } from 'lucide-react';

const MAX_WIDTH = 1600;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

// Read a File into an HTMLImageElement so we can redraw it on a sized canvas.
const fileToImage = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// Normalise: if wider than MAX_WIDTH, downscale; always re-encode as JPEG @ 85%.
const normaliseImage = (img) => {
  const scale = img.width > MAX_WIDTH ? MAX_WIDTH / img.width : 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85);
};

const RoofImageUpload = ({ onCapture }) => {
  const fileInputRef = useRef(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    async (file) => {
      if (!file) return;
      if (!ACCEPTED.includes(file.type)) {
        setError('Please pick a JPEG, PNG, or WEBP image.');
        return;
      }
      setProcessing(true);
      setError(null);
      try {
        const img = await fileToImage(file);
        const dataUrl = normaliseImage(img);
        onCapture({
          snapshot: dataUrl,
          location: {
            lat: null,
            lng: null,
            zoom: null,
            formattedAddress: null,
            capturedAt: new Date().toISOString(),
            source: 'upload',
          },
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[RoofImageUpload] failed:', err);
        setError('Could not read that file. Please try a different image.');
      } finally {
        setProcessing(false);
      }
    },
    [onCapture]
  );

  const onInputChange = (e) => {
    const file = e.target.files?.[0];
    handleFile(file);
    // Reset the input so choosing the same file twice still fires change.
    e.target.value = '';
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };
  const onDragLeave = () => setDragOver(false);

  return (
    <div className="space-y-3">
      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
        }}
        className={`cursor-pointer rounded-md border-2 border-dashed px-6 py-10 text-center transition ${
          dragOver
            ? 'border-gold-primary bg-gold-light/20'
            : 'border-cream-200 bg-cream-50 hover:border-gold-primary/60 hover:bg-gold-light/10'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={onInputChange}
        />
        {processing ? (
          <div className="flex flex-col items-center gap-2 text-cream-600">
            <Loader2 className="w-6 h-6 animate-spin" />
            <div className="text-sm font-medium">Processing image…</div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-md bg-navy-dark flex items-center justify-center">
              <Upload className="w-6 h-6 text-gold-primary" />
            </div>
            <div className="font-heading font-bold text-navy-dark">
              Click to upload or drag & drop
            </div>
            <div className="text-xs text-cream-600 max-w-md">
              JPEG, PNG or WEBP. Take a screenshot of the roof on Google Maps
              (satellite view), save it, then drop it here.
            </div>
          </div>
        )}
      </div>

      <div className="flex items-start gap-2 text-xs text-cream-500">
        <ImageIcon className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          Tip: on Windows press <kbd className="px-1 py-0.5 rounded bg-cream-100 font-mono">Win</kbd>+
          <kbd className="px-1 py-0.5 rounded bg-cream-100 font-mono">Shift</kbd>+
          <kbd className="px-1 py-0.5 rounded bg-cream-100 font-mono">S</kbd> to snip the roof
          area, then paste-save or drag the file here. Large images are auto-resized to 1600 px wide
          so the quotation stays lightweight.
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-md text-rose-700 text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
        </div>
      )}
    </div>
  );
};

export default RoofImageUpload;
