import type { BrotherQLPrintOptions, MediaDescriptor, RawImageData } from '@thermal-label/brother-ql-core';

import type { QueuedLabel } from '../models/label.model';

const DOTS_PER_MM = 300 / 25.4;

/**
 * The QL-700 (and every other QL model this app targets) is monochrome — no red ribbon,
 * no ink. The on-screen/browser-print path has its own per-type accent colours (see
 * labels.css), but feeding those same light/mid-tone hex colours through this canvas would
 * get dithered by the printer driver into a sparse dot pattern that reads as nearly blank,
 * and the white text drawn on top becomes illegible against it. Solid black dithers to
 * solid black with no such loss, so the thermal render always uses it regardless of type.
 */
const THERMAL_ACCENT = '#000000';

export function isBrotherQlUsbSupported(): boolean {
  return typeof navigator !== 'undefined' && 'usb' in navigator;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function formatIsoDate(value: string): string {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Draws wrapped lines justified (even left/right edges) for readability, like a printed
 * paragraph — every line stretches to `maxWidth` by spacing its words out, except the last
 * (and any single-word line, which has nothing to stretch), which stays centered.
 */
export function drawJustifiedLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  centerX: number,
  startY: number,
  lineHeight: number,
  maxWidth: number,
): void {
  const originalAlign = ctx.textAlign;

  lines.forEach((line, i) => {
    const y = startY + i * lineHeight;
    const words = line.split(/\s+/).filter(Boolean);
    const isLast = i === lines.length - 1;

    if (isLast || words.length < 2) {
      ctx.textAlign = 'center';
      ctx.fillText(line, centerX, y);
      return;
    }

    const wordWidths = words.map((word) => ctx.measureText(word).width);
    const totalWordWidth = wordWidths.reduce((sum, w) => sum + w, 0);
    const gap = (maxWidth - totalWordWidth) / (words.length - 1);

    ctx.textAlign = 'left';
    let x = centerX - maxWidth / 2;
    words.forEach((word, wi) => {
      ctx.fillText(word, x, y);
      x += wordWidths[wi] + gap;
    });
  });

  ctx.textAlign = originalAlign;
}

/**
 * Die-cut labels tagged `defaultOrientation: 'horizontal'` expect content authored landscape
 * (long axis horizontal) — the driver auto-rotates it 90° to feed correctly. Everything else
 * ('vertical', or `undefined`) passes through as authored, so the canvas must already match
 * the media's physical axes: width = the fixed across-web dot count (`printableDots`),
 * height = the feed-direction length.
 *
 * `printableDots` (the fixed across-web axis, set by the tape width) is usually the
 * *shorter* side of a 'horizontal' die-cut — DK-11201 (29mm tape, 90mm cut) is the typical
 * shape. The DK-11209 this app prints on inverts that: its tape is wider than the label is
 * long (62mm tape, 29mm cut), so `printableDots` (696) is actually bigger than the
 * feed-length axis (271). The canvas must still be authored genuinely landscape
 * (width > height) for the content layout to read correctly either way — only the rotation
 * needed to map that onto the print head's fixed-width raster differs: rotate only when the
 * feed-length axis is the longer one (the "normal" case); when the across-web axis is
 * already the longer one, as here, the authored canvas already matches the raster's axis
 * order, so no rotation.
 */
function canvasSizeFor(
  media: MediaDescriptor & { printableDots: number; dieCutMaskedAreaDots?: number },
): { width: number; height: number; landscape: boolean; rotate: 0 | 90 } {
  const acrossWebDots = media.printableDots;
  const feedDots = media.dieCutMaskedAreaDots ?? Math.round((media.heightMm ?? 0) * DOTS_PER_MM);

  if (media.defaultOrientation !== 'horizontal') {
    return { width: acrossWebDots, height: feedDots, landscape: false, rotate: 0 };
  }

  return acrossWebDots >= feedDots
    ? { width: acrossWebDots, height: feedDots, landscape: true, rotate: 0 }
    : { width: feedDots, height: acrossWebDots, landscape: true, rotate: 90 };
}

function drawLandscapeLabel(ctx: CanvasRenderingContext2D, item: QueuedLabel, width: number, height: number): void {
  const pad = Math.round(Math.min(width, height) * 0.05);
  const nameColWidth = width * 0.36;
  const blockX = pad * 2 + nameColWidth;
  const blockWidth = width - blockX - pad;
  const blockY = pad;
  const blockHeight = height - pad * 2;

  ctx.fillStyle = THERMAL_ACCENT;
  ctx.beginPath();
  ctx.roundRect(blockX, blockY, blockWidth, blockHeight, Math.min(18, blockHeight * 0.15));
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const nameFontSize = Math.round(height * 0.16);
  ctx.fillStyle = '#14171a';
  ctx.font = `700 ${nameFontSize}px Arial, sans-serif`;
  const nameLines = wrapText(ctx, item.productName, nameColWidth - pad);
  const lineHeight = nameFontSize * 1.15;
  const startY = height / 2 - ((nameLines.length - 1) * lineHeight) / 2;
  drawJustifiedLines(ctx, nameLines, pad + nameColWidth / 2, startY, lineHeight, nameColWidth - pad);

  ctx.fillStyle = '#ffffff';
  const typeFontSize = Math.round(height * 0.11);
  const dateFontSize = Math.round(height * 0.22);
  const centerX = blockX + blockWidth / 2;

  if (item.useByDate) {
    // Two equal pairs (caption + date) — the DLC reads with the same weight as the main date.
    ctx.font = `600 ${typeFontSize}px "Courier New", monospace`;
    ctx.fillText(item.type.title.toUpperCase(), centerX, blockY + blockHeight * 0.16);
    ctx.font = `700 ${dateFontSize}px "Courier New", monospace`;
    ctx.fillText(formatIsoDate(item.date), centerX, blockY + blockHeight * 0.38);

    ctx.font = `600 ${typeFontSize}px "Courier New", monospace`;
    ctx.fillText('DLC', centerX, blockY + blockHeight * 0.62);
    ctx.font = `700 ${dateFontSize}px "Courier New", monospace`;
    ctx.fillText(formatIsoDate(item.useByDate), centerX, blockY + blockHeight * 0.84);
  } else {
    ctx.font = `600 ${typeFontSize}px "Courier New", monospace`;
    ctx.fillText(item.type.title.toUpperCase(), centerX, blockY + blockHeight * 0.3);
    ctx.font = `700 ${dateFontSize}px "Courier New", monospace`;
    ctx.fillText(formatIsoDate(item.date), centerX, blockY + blockHeight * 0.62);
  }
}

function drawPortraitLabel(ctx: CanvasRenderingContext2D, item: QueuedLabel, width: number, height: number): void {
  const pad = Math.round(width * 0.08);
  const nameRowHeight = height * 0.32;
  const blockX = pad;
  const blockWidth = width - pad * 2;
  const blockY = nameRowHeight + pad / 2;
  const blockHeight = height - blockY - pad;

  ctx.fillStyle = THERMAL_ACCENT;
  ctx.beginPath();
  ctx.roundRect(blockX, blockY, blockWidth, blockHeight, Math.min(14, blockWidth * 0.1));
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const nameFontSize = Math.round(width * 0.14);
  ctx.fillStyle = '#14171a';
  ctx.font = `700 ${nameFontSize}px Arial, sans-serif`;
  const nameLines = wrapText(ctx, item.productName, width - pad * 2);
  const lineHeight = nameFontSize * 1.15;
  const startY = nameRowHeight / 2 + pad / 2 - ((nameLines.length - 1) * lineHeight) / 2;
  drawJustifiedLines(ctx, nameLines, width / 2, startY, lineHeight, width - pad * 2);

  ctx.fillStyle = '#ffffff';
  const typeFontSize = Math.round(width * 0.1);
  const dateFontSize = Math.round(width * 0.17);
  const centerX = blockX + blockWidth / 2;

  if (item.useByDate) {
    // Two equal pairs (caption + date) — the DLC reads with the same weight as the main date.
    ctx.font = `600 ${typeFontSize}px "Courier New", monospace`;
    ctx.fillText(item.type.title.toUpperCase(), centerX, blockY + blockHeight * 0.14);
    ctx.font = `700 ${dateFontSize}px "Courier New", monospace`;
    ctx.fillText(formatIsoDate(item.date), centerX, blockY + blockHeight * 0.34);

    ctx.font = `600 ${typeFontSize}px "Courier New", monospace`;
    ctx.fillText('DLC', centerX, blockY + blockHeight * 0.58);
    ctx.font = `700 ${dateFontSize}px "Courier New", monospace`;
    ctx.fillText(formatIsoDate(item.useByDate), centerX, blockY + blockHeight * 0.8);
  } else {
    ctx.font = `600 ${typeFontSize}px "Courier New", monospace`;
    ctx.fillText(item.type.title.toUpperCase(), centerX, blockY + blockHeight * 0.25);
    ctx.font = `700 ${dateFontSize}px "Courier New", monospace`;
    ctx.fillText(formatIsoDate(item.date), centerX, blockY + blockHeight * 0.56);
  }
}

function renderLabelImageData(item: QueuedLabel, media: MediaDescriptor): { image: RawImageData; rotate: 0 | 90 } {
  const { width, height, landscape, rotate } = canvasSizeFor(
    media as MediaDescriptor & { printableDots: number; dieCutMaskedAreaDots?: number },
  );

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Impossible de préparer l'étiquette (canvas 2D indisponible).");

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  if (landscape) {
    drawLandscapeLabel(ctx, item, width, height);
  } else {
    drawPortraitLabel(ctx, item, width, height);
  }

  const imageData = ctx.getImageData(0, 0, width, height);
  // RawImageData wants a Uint8Array; ImageData.data is a Uint8ClampedArray — same bytes, different view.
  return {
    image: {
      width: imageData.width,
      height: imageData.height,
      data: new Uint8Array(imageData.data.buffer, imageData.data.byteOffset, imageData.data.byteLength),
    },
    rotate,
  };
}

/** Registry id (in `@thermal-label/brother-ql-core`'s media list) for the DK-11209 — the
 *  only label stock this app prints on. */
const BROTHER_QL_LABEL_FORMAT_ID = 274;

/**
 * Prints every queued label directly on a Brother QL label printer over WebUSB, one at a time.
 * Works with any QL model in the driver's registry (QL-500 through QL-820NWBc) — the browser's
 * device picker only lists the ones actually plugged in. Requires a Chromium-based browser and
 * must be called from a user gesture (the device picker won't open otherwise).
 */
export async function printLabelsOnBrotherQl(labels: QueuedLabel[]): Promise<void> {
  if (!isBrotherQlUsbSupported()) {
    throw new Error("L'impression directe nécessite Chrome ou Edge (WebUSB non disponible dans ce navigateur).");
  }
  if (labels.length === 0) return;

  const { requestPrinters } = await import('@thermal-label/brother-ql-web');
  const { findMedia } = await import('@thermal-label/brother-ql-core');

  const media = findMedia(BROTHER_QL_LABEL_FORMAT_ID);
  if (!media) throw new Error("Ce format d'étiquette est introuvable dans le pilote.");

  const printers = await requestPrinters({ transport: 'usb' });
  const printer = Object.values(printers)[0];
  if (!printer) throw new Error('Aucune imprimante sélectionnée.');

  try {
    for (const label of labels) {
      // Explicit rotate, not 'auto': the library's heuristic only rotates when the
      // authored canvas already looks landscape (width > height). That's true for most
      // 'horizontal' die-cuts (e.g. DK-11201: 29mm tape, 90mm cut) but false for "wide but
      // short" ones like the DK-11209 (62mm tape, 29mm cut — shorter than the tape is
      // wide), where `canvasSizeFor` already decided no rotation is needed. Trusting its
      // decision here instead of re-deriving from `media.defaultOrientation` keeps both
      // cases correct.
      const { image, rotate } = renderLabelImageData(label, media);
      const printOptions: BrotherQLPrintOptions = { rotate };
      await printer.print(image, media, printOptions);
    }
  } finally {
    await printer.close();
  }
}
