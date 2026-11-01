/**
 * Bands: motifs placed along a strip by a grammar string, e.g. "A A A | B | A A A" (continuity broken by an event),
 * "A B A B" (duality) or "A B C B A" (return). Letters index the motif list; "|" is a wider void; rails optional.
 */
import { at, blank, type Grid } from "./grid.ts";

export function composeBand(motifs: Grid[], grammar: string, o: { gap?: number; voidGap?: number; rail?: number; railThread?: number } = {}): Grid {
  const { gap = 1, voidGap = 3, rail = 1, railThread = 2 } = o;
  const tokens = grammar.trim().split(/\s+/);
  const items = tokens.map((t) => (t === "|" ? null : motifs[t.charCodeAt(0) - 65] ?? (() => { throw new Error(`band-unknown-motif:${t}`); })()));
  const h = Math.max(...items.map((m) => m?.h ?? 0)), pad = rail ? rail + 1 : 0;
  const w = items.reduce((s, m, i) => s + (m ? m.w : voidGap) + (i < items.length - 1 ? gap : 0), 0) + 2 * gap;
  const out = blank(w, h + 2 * pad);
  let x = gap;
  for (const m of items) {
    if (m) { const oy = pad + ((h - m.h) >> 1); for (let y = 0; y < m.h; y++) for (let i = 0; i < m.w; i++) { const c = at(m, i, y); if (c) out.cells[(oy + y) * w + x + i] = c; } x += m.w + gap; }
    else x += voidGap + gap;
  }
  for (let r = 0; r < rail; r++) for (let i = 0; i < w; i++) { out.cells[r * w + i] = railThread; out.cells[(out.h - 1 - r) * w + i] = railThread; }
  return out;
}
