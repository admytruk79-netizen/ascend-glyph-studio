/**
 * Counted-thread grids: the native form of Ukrainian cross-stitch (хрестик), набирування and низь, where every
 * motif is counted on the fabric's threads. One cell is one stitch; 0 is bare ground, 1.. are thread colours.
 */

export const THREADS = [".", "R", "K", "B", "Y", "G"] as const;
export type Thread = (typeof THREADS)[number];
/** Display colours for previews only; production colours come from the stitch recipe. */
export const THREAD_HEX: Record<Thread, string> = { ".": "#f4efe4", R: "#b3202a", K: "#1c1a1a", B: "#22356b", Y: "#d4a531", G: "#3e6b35" };

export interface Grid { w: number; h: number; cells: number[] }

export const at = (g: Grid, x: number, y: number) => (x < 0 || y < 0 || x >= g.w || y >= g.h ? 0 : g.cells[y * g.w + x]!);
export const blank = (w: number, h: number): Grid => ({ w, h, cells: new Array(w * h).fill(0) });

export function parseChart(rows: string[]): Grid {
  const w = rows[0]?.length ?? 0;
  if (!w || rows.some((r) => r.length !== w)) throw new Error("chart-rows-unequal");
  const cells = rows.flatMap((r) => [...r].map((c) => { const i = THREADS.indexOf(c as Thread); if (i < 0) throw new Error(`chart-unknown-thread:${c}`); return i; }));
  return { w, h: rows.length, cells };
}
export const toChart = (g: Grid) => Array.from({ length: g.h }, (_, y) => Array.from({ length: g.w }, (_, x) => THREADS[at(g, x, y)]).join(""));

export const map = (g: Grid, w: number, h: number, src: (x: number, y: number) => [number, number]): Grid => {
  const out = blank(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [sx, sy] = src(x, y); out.cells[y * w + x] = at(g, sx, sy); }
  return out;
};
export const flipH = (g: Grid) => map(g, g.w, g.h, (x, y) => [g.w - 1 - x, y]);
export const flipV = (g: Grid) => map(g, g.w, g.h, (x, y) => [x, g.h - 1 - y]);
export const transpose = (g: Grid) => map(g, g.h, g.w, (x, y) => [y, x]);
export const rot90 = (g: Grid) => flipH(transpose(g));
export const same = (a: Grid, b: Grid) => a.w === b.w && a.h === b.h && a.cells.every((c, i) => c === b.cells[i]);
/** The eight dihedral images of a grid (identity first). */
export function dihedral(g: Grid): Grid[] {
  const r1 = rot90(g), r2 = rot90(r1), r3 = rot90(r2);
  return [g, r1, r2, r3, flipH(g), flipH(r1), flipH(r2), flipH(r3)];
}

/** Crop to the bounding box of stitched cells (an empty grid stays 0×0). */
export function crop(g: Grid): Grid {
  let x0 = g.w, y0 = g.h, x1 = -1, y1 = -1;
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (at(g, x, y)) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return x1 < 0 ? blank(0, 0) : map(g, x1 - x0 + 1, y1 - y0 + 1, (x, y) => [x + x0, y + y0]);
}

export const density = (g: Grid) => g.cells.filter(Boolean).length / Math.max(1, g.cells.length);

/** Number of 8-connected stitched islands (counted work joins diagonally: a cross touches its corner neighbours). */
export function components(g: Grid): number {
  const seen = new Uint8Array(g.cells.length);
  let n = 0;
  for (let i = 0; i < g.cells.length; i++) {
    if (!g.cells[i] || seen[i]) continue;
    n++; const stack = [i]; seen[i] = 1;
    while (stack.length) {
      const j = stack.pop()!, x = j % g.w, y = (j - x) / g.w;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy, k = ny * g.w + nx;
        if (nx >= 0 && ny >= 0 && nx < g.w && ny < g.h && g.cells[k] && !seen[k]) { seen[k] = 1; stack.push(k); }
      }
    }
  }
  return n;
}

export function toSvg(g: Grid, cell = 8, label?: string): string {
  const pad = label ? 14 : 0, out = [`<svg xmlns="http://www.w3.org/2000/svg" width="${g.w * cell}" height="${g.h * cell + pad}" viewBox="0 0 ${g.w * cell} ${g.h * cell + pad}">`, `<rect width="100%" height="100%" fill="${THREAD_HEX["."]}"/>`];
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    const c = at(g, x, y); if (!c) continue;
    const x0 = x * cell + 1, y0 = y * cell + 1, s = cell - 2, col = THREAD_HEX[THREADS[c]!];
    out.push(`<path d="M${x0} ${y0 + s}L${x0 + s} ${y0}M${x0} ${y0}L${x0 + s} ${y0 + s}" stroke="${col}" stroke-width="${(cell / 4).toFixed(1)}" stroke-linecap="round"/>`);
  }
  if (label) out.push(`<text x="2" y="${g.h * cell + 11}" font-family="sans-serif" font-size="10" fill="#333">${label.replace(/[<&>]/g, "")}</text>`);
  out.push("</svg>");
  return out.join("");
}
