/**
 * Band layout: symbols → motif shapes in millimetres, ready for the stitch engine (fill objects) or print.
 * Provisional motif: a rhomb with its top-right quarter open; its four orientations are the four symbols
 * (0 normal, 1 mirrored left–right, 2 rotated 180°, 3 mirrored top–bottom). It will be replaced by a
 * motif traced from Oleksandr's drawings; the codec does not change.
 * Start marker: a full rhomb with a seed; end marker: two half-size rhombs — an asymmetric pair, so the
 * reader knows the direction.
 */
import type { BandSymbol } from "./codec.js";

export interface Pt { x: number; y: number }
export interface BandObject { kind: "fill"; id: string; color: string; polygon: Pt[]; angle?: number }

// A rhomb with one quarter left open (cf. the folk "віконця", a rhomb split in four). Which quarter is
// open is the symbol: broad shapes, so every variant survives embroidery at a 10 mm pitch.
const HOOK: Pt[] = [{ x: 0.5, y: 0.05 }, { x: 0.5, y: 0.5 }, { x: 0.95, y: 0.5 }, { x: 0.5, y: 0.95 }, { x: 0.05, y: 0.5 }];
const variant = (p: Pt, s: number): Pt => (s === 1 ? { x: 1 - p.x, y: p.y } : s === 2 ? { x: 1 - p.x, y: 1 - p.y } : s === 3 ? { x: p.x, y: 1 - p.y } : p);

/**
 * `rows` > 1 stacks the symbols in rows read left to right, top to bottom (a compact block for a cuff:
 * 122 symbols as 4 rows × 31 at 8 mm ≈ 25 × 3.4 cm). `rowGap` separates rows (mm).
 */
export function layoutBand(symbols: BandSymbol[], o: { pitch?: number; height?: number; rows?: number; rowGap?: number; color?: string; markerColor?: string } = {}): BandObject[] {
  const P = o.pitch ?? 10, H = o.height ?? 10;
  const rows = Math.max(1, o.rows ?? 1), perRow = Math.ceil(symbols.length / rows), rowGap = o.rowGap ?? 1.5;
  const color = o.color ?? "#1d2a4d", mc = o.markerColor ?? "#8b1a1a";
  const out: BandObject[] = [];
  const at = (cx: number, pts: Pt[], w: number, h: number, y0: number) => pts.map((p) => ({ x: cx + (p.x - 0.5) * w, y: y0 + p.y * h }));
  const rhomb: Pt[] = [{ x: 0.5, y: 0 }, { x: 1, y: 0.5 }, { x: 0.5, y: 1 }, { x: 0, y: 0.5 }];
  symbols.forEach((s, i) => {
    const col = i % perRow, row = Math.floor(i / perRow);
    const cx = col * P + P / 2, y0 = row * (H + rowGap);
    const m = 0.85;
    if (s === "start") {
      out.push({ kind: "fill", id: `m${i}-start`, color: mc, polygon: at(cx, rhomb, P * m, H * m, y0 + H * (1 - m) / 2), angle: 0 });
    } else if (s === "end") {
      out.push({ kind: "fill", id: `m${i}-end-a`, color: mc, polygon: at(cx - P * 0.25, rhomb, P * 0.38, H * 0.4, y0 + H * 0.3), angle: 0 });
      out.push({ kind: "fill", id: `m${i}-end-b`, color: mc, polygon: at(cx + P * 0.25, rhomb, P * 0.38, H * 0.4, y0 + H * 0.3), angle: 0 });
    } else {
      out.push({ kind: "fill", id: `m${i}-s${s}`, color, polygon: at(cx, HOOK.map((p) => variant(p, s)), P * m, H * m, y0 + H * (1 - m) / 2), angle: i % 2 ? 45 : -45 });
    }
  });
  return out;
}
