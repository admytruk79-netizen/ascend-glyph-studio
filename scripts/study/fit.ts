/**
 * Fit a design to a corpus complexity profile: build it at several fill levels, measure each the way the museum
 * pieces were measured, keep the closest. The same measure is the critic's score.
 */
import sharp from "sharp";
import type { Kit } from "../../packages/blend-engine/src/folk-rich.ts";
import { complexityOf, distanceToProfile, type Complexity, type Profile } from "./complexity.ts";

export async function measureKit(k: Kit, width: number, height: number, ground: string): Promise<Complexity> {
  const body = k.objs.map((o) => o.kind === "fill" ? `<polygon points="${o.polygon.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ")}" fill="${o.color}"/>`
    : `<polyline points="${o.path.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ")}" fill="none" stroke="${o.color}" stroke-width="${o.kind === "satin" ? o.width : 0.9}" stroke-linecap="round"/>`).join("");
  const scale = 384 / Math.max(width, height);
  const r = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${Math.round(width * scale)}" height="${Math.round(height * scale)}"><rect width="100%" height="100%" fill="${ground}"/>${body}</svg>`)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return complexityOf({ data: r.data, width: r.info.width, height: r.info.height });
}

export async function fitToProfile(build: (fill: number) => Kit, width: number, height: number, ground: string, profile: Profile, levels = [0, 10, 20, 30, 45, 60, 80]) {
  const tried: { fill: number; complexity: Complexity; score: number; low: string[]; high: string[] }[] = [];
  let best: { kit: Kit; fill: number; score: number } | null = null;
  for (const fill of levels) {
    const kit = build(fill), complexity = await measureKit(kit, width, height, ground), d = distanceToProfile(complexity, profile);
    tried.push({ fill, complexity, ...d });
    if (!best || d.score < best.score) best = { kit, fill, score: d.score };
  }
  return { ...best!, tried };
}
