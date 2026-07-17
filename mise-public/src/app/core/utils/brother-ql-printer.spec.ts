import { drawJustifiedLines } from './brother-ql-printer';

/** Deterministic stand-in for CanvasRenderingContext2D: 10px per character, tracks fillText calls. */
function createMockCtx() {
  const calls: { text: string; x: number; y: number; align: CanvasTextAlign }[] = [];
  const ctx = {
    textAlign: 'center' as CanvasTextAlign,
    measureText: (text: string) => ({ width: text.length * 10 }) as TextMetrics,
    fillText(text: string, x: number, y: number) {
      calls.push({ text, x, y, align: ctx.textAlign });
    },
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

describe('drawJustifiedLines', () => {
  it('centers a single-line, single-word text (nothing to justify)', () => {
    const { ctx, calls } = createMockCtx();
    drawJustifiedLines(ctx, ['Beurre'], 100, 50, 20, 200);

    expect(calls).toEqual([{ text: 'Beurre', x: 100, y: 50, align: 'center' }]);
  });

  it('centers the last line even when it has multiple words', () => {
    const { ctx, calls } = createMockCtx();
    drawJustifiedLines(ctx, ['Fond de veau'], 100, 50, 20, 200);

    expect(calls).toEqual([{ text: 'Fond de veau', x: 100, y: 50, align: 'center' }]);
  });

  it('justifies a non-last multi-word line by spreading its words to fill maxWidth', () => {
    const { ctx, calls } = createMockCtx();
    // "Fond" (40px) + "de" (20px) + "veau" (40px) = 100px of text, maxWidth 200 → 100px of gap
    // split over 2 gaps (3 words) = 50px each.
    drawJustifiedLines(ctx, ['Fond de veau', 'Reste'], 100, 0, 20, 200);

    const firstLineCalls = calls.filter((c) => c.y === 0);
    expect(firstLineCalls.map((c) => c.text)).toEqual(['Fond', 'de', 'veau']);
    expect(firstLineCalls.every((c) => c.align === 'left')).toBe(true);
    expect(firstLineCalls.map((c) => c.x)).toEqual([0, 90, 160]);

    // last line ("Reste") stays centered.
    const lastLineCall = calls.find((c) => c.text === 'Reste');
    expect(lastLineCall).toEqual({ text: 'Reste', x: 100, y: 20, align: 'center' });
  });

  it('restores the context textAlign it started with', () => {
    const { ctx } = createMockCtx();
    ctx.textAlign = 'right';
    drawJustifiedLines(ctx, ['Fond de veau', 'Reste'], 100, 0, 20, 200);
    expect(ctx.textAlign).toBe('right');
  });
});
