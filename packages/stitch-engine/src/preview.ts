/** SVG preview of stitch commands (thread paths, jumps dashed) for review before a sew-out. */
import type { Command } from "./dst.js";
import { bounds } from "./geometry.js";

/** `thread` is the drawn stitch width in mm (0.3 default for inspection; ~0.45 approximates 40 wt thread as sewn). */
export function previewSvg(commands: Command[], colors: string[], o: { margin?: number; showJumps?: boolean; thread?: number } = {}): string {
  const m = o.margin ?? 3;
  const pts = commands.filter((c) => c.cmd === "stitch" || c.cmd === "jump");
  const b = bounds(pts);
  const w = b.maxX - b.minX + 2 * m, h = b.maxY - b.minY + 2 * m;
  const paths: string[] = [];
  let ci = 0, d = "", prev: Command | undefined;
  const flush = () => { if (d) paths.push(`<path d="${d}" fill="none" stroke="${colors[ci] ?? "#000"}" stroke-width="${o.thread ?? 0.3}" stroke-linejoin="round"/>`); d = ""; };
  for (const c of commands) {
    const X = (c.x - b.minX + m).toFixed(2), Y = (c.y - b.minY + m).toFixed(2);
    if (c.cmd === "color") { flush(); ci++; prev = undefined; continue; }
    if (c.cmd === "stitch") d += prev?.cmd === "stitch" || prev?.cmd === "jump" ? `L${X} ${Y}` : `M${X} ${Y}`;
    if (c.cmd === "jump") {
      if (o.showJumps && prev) paths.push(`<path d="M${(prev.x - b.minX + m).toFixed(2)} ${(prev.y - b.minY + m).toFixed(2)}L${X} ${Y}" stroke="#999" stroke-width="0.15" stroke-dasharray="0.6 0.6"/>`);
      d += `M${X} ${Y}`;
    }
    if (c.cmd === "trim") { prev = undefined; continue; }
    prev = c;
  }
  flush();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w.toFixed(1)}mm" height="${h.toFixed(1)}mm" viewBox="0 0 ${w.toFixed(2)} ${h.toFixed(2)}"><rect width="100%" height="100%" fill="#efe9dc"/>${paths.join("")}</svg>`;
}
