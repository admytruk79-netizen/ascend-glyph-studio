/**
 * Lego analysis: read an ornament image as pieces, not pixels or curves.
 *
 *   1. bricks: every Lego brick (packages/blend-engine/src/lego.ts) is drawn alone and measured with the same
 *      element description the trainer uses, which gives each brick a shape signature.
 *   2. pieces: each ink element of an image is named after its nearest brick, or kept as "novel" when it matches
 *      none (novel pieces are clustered over the corpus into new, learned bricks).
 *   3. assembly: how the pieces sit together: which piece neighbours which, at what offset and relative size, how
 *      far the image mirrors left↔right and top↔bottom, and how regularly pieces repeat along the band.
 *   4. grammar: assemblies summed over a tradition or region, the rules the generator builds new designs from.
 */
import sharp from "sharp";
import { Kit } from "../../packages/blend-engine/src/folk-rich.ts";
import { BRICKS, BRICK_IDS, type BrickId } from "../../packages/blend-engine/src/lego.ts";
import { featureOf, hex, kmeans, learnImage, prototypeShape, type Element, type ImageLearning, type Raster } from "./learn.ts";

export type Signature = { brick: BrickId; f: number[] };
export type Piece = { brick: BrickId | "border" | "novel"; d: number; x: number; y: number; extent: number; angle: number; color: string; f?: number[]; profile?: number[] };
export type Assembly = {
  pieces: Piece[];
  pairs: [string, string, number, number, number][]; // [a, b, dx, dy, size ratio], offsets in units of a's extent
  mirrorV: number; mirrorH: number;                  // share of pieces with a same-brick partner across the axis
  repeats: { brick: string; gap: number; regularity: number; count: number }[];
};
/** A brick learned from the corpus: a cluster of novel pieces, drawn from their averaged outline. */
export type LearnedBrick = { id: string; outline: [number, number][]; n: number; share: number; extent: number; color: string; aspect: number };
export type Grammar = {
  learned?: LearnedBrick[];
  images: number;
  bricks: Record<string, { share: number; perImage: number; extent: number; colors: string[] }>;
  pairs: Record<string, { n: number; dx: number; dy: number; ratio: number }>;
  mirrorV: number; mirrorH: number;
  repeats: Record<string, { gap: number; regularity: number }>;
  novelShare: number;
};

const GROUND = "#efe6d2", PX = 6, CANVAS = 150;
const ROLES = { main: "#b3332b", dark: "#1f2c4c", leaf: "#4f6b3a", light: "#d39b35", accent: "#2b8796" };
const objSvg = (k: Kit) => k.objs.map((o) => o.kind === "fill" ? `<polygon points="${o.polygon.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ")}" fill="${o.color}"/>`
  : `<polyline points="${o.path.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ")}" fill="none" stroke="${o.color}" stroke-width="${o.kind === "satin" ? o.width : 0.9}" stroke-linecap="round"/>`).join("");

export async function rasterOf(svgBody: string, w: number, h: number, pxPerMm = PX): Promise<Raster> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * pxPerMm}" height="${h * pxPerMm}"><rect width="100%" height="100%" fill="${GROUND}"/>${svgBody}</svg>`;
  const r = await sharp(Buffer.from(svg)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: r.data, width: r.info.width, height: r.info.height };
}

/** Each brick drawn alone (a few sizes, turns and mirror images): its largest element's shape vector. */
export async function brickSignatures(): Promise<Signature[]> {
  const out: Signature[] = [];
  for (const id of BRICK_IDS) for (const size of [24, 40]) for (const angle of [undefined, 0, Math.PI / 4]) for (const flip of [1, -1] as const) {
    if (angle !== undefined && !["leaf", "bud", "star4"].includes(id)) continue;
    if (flip < 0 && id !== "bird") continue;
    const k = new Kit(); BRICKS[id].draw(k, CANVAS / 2, CANVAS / 2, size, ROLES, angle, flip);
    const L = learnImage(await rasterOf(objSvg(k), CANVAS, CANVAS), 60);
    const big = [...L.elements].sort((a, b) => b.area - a.area)[0];
    if (big) out.push({ brick: id, f: shapeOf(big) });
  }
  return out;
}

/** Per-dimension spread of the signatures, so no single measure dominates the distance. */
export function scalesOf(sigs: Signature[]): number[] {
  const n = sigs[0]!.f.length;
  return Array.from({ length: n }, (_, i) => { const v = sigs.map((s) => s.f[i]!), m = v.reduce((a, b) => a + b, 0) / v.length; return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length) || 1; });
}
/** Shape vector for matching: the trainer's element vector without its last term (size relative to the other
 *  elements of the same image depends on the company a piece keeps, not on the piece). */
const shapeOf = (e: Element) => featureOf(e).slice(0, -1);
const dist = (a: number[], b: number[], sc: number[]) => Math.sqrt(a.reduce((s, v, i) => s + ((v - b[i]!) / sc[i]!) ** 2, 0) / a.length);

/** Name one element after its nearest brick; farther than `novelAt` it is a new piece. */
export function classify(e: Element, sigs: Signature[], sc: number[], novelAt = 1.3): { brick: BrickId | "border" | "novel"; d: number; f: number[] } {
  const f = shapeOf(e);
  // a long thin line across the image is a border or frame, not a motif
  if (e.elong > 12 && (e.extent ?? 0) > 0.5) return { brick: "border", d: 0, f };
  let best = { brick: "novel" as BrickId | "border" | "novel", d: Infinity };
  for (const s of sigs) { const d = dist(f, s.f, sc); if (d < best.d) best = { brick: s.brick, d }; }
  return { ...best, d: +best.d.toFixed(3), brick: best.d > novelAt ? "novel" : best.brick, f };
}

/** Read one image as an assembly of pieces. */
export function assemble(img: Raster, sigs: Signature[], sc: number[], maxPieces = 60, learned?: ImageLearning): Assembly {
  const L = learned ?? learnImage(img, maxPieces);
  const pieces: Piece[] = L.elements.filter((e) => e.x !== undefined).map((e) => {
    const c = classify(e, sigs, sc);
    return { brick: c.brick, d: c.d, x: +e.x!.toFixed(4), y: +e.y!.toFixed(4), extent: +e.extent!.toFixed(4), angle: +e.angle!.toFixed(3), color: hex(e.color), ...(c.brick === "novel" ? { f: c.f.map((v) => +v.toFixed(3)), profile: e.profile.map((v) => +v.toFixed(2)) } : {}) };
  });
  // only the three largest novel pieces keep their outline (enough to learn new bricks, small enough to ship)
  const novel = pieces.filter((p) => p.brick === "novel").sort((a, b) => b.extent - a.extent);
  for (const p of novel.slice(3)) delete p.profile;
  // neighbours: the three nearest pieces of each, offsets in units of its own size
  const pairs: Assembly["pairs"] = [];
  const ar = img.width / img.height;
  for (const a of pieces) {
    const near = pieces.filter((b) => b !== a).map((b) => ({ b, d: Math.hypot((b.x - a.x) * ar, b.y - a.y) })).sort((p, q) => p.d - q.d).slice(0, 3);
    for (const { b } of near) pairs.push([a.brick, b.brick, +(((b.x - a.x) * ar) / (a.extent * ar || 1)).toFixed(2), +((b.y - a.y) / (a.extent * ar || 1)).toFixed(2), +(b.extent / (a.extent || 1)).toFixed(2)]);
  }
  // mirror symmetry: the share of pieces with a partner of the same brick across the best axis
  const mirror = (pos: (p: Piece) => number, other: (p: Piece) => number) => {
    let best = 0;
    for (const axis of [0.5, ...pieces.map(pos)]) {
      const hit = pieces.filter((p) => pieces.some((q) => q !== p && q.brick === p.brick && Math.abs(pos(q) - (2 * axis - pos(p))) < 0.03 && Math.abs(other(q) - other(p)) < 0.03)).length;
      best = Math.max(best, pieces.length ? hit / pieces.length : 0);
    }
    return +best.toFixed(3);
  };
  // repeats: pieces of one brick on one line, regularly spaced
  const repeats: Assembly["repeats"] = [];
  for (const id of new Set(pieces.map((p) => p.brick))) {
    const row = pieces.filter((p) => p.brick === id).sort((a, b) => a.x - b.x);
    if (row.length < 3) continue;
    const gaps = row.slice(1).map((p, i) => p.x - row[i]!.x).filter((g) => g > 0.005).sort((a, b) => a - b);
    if (gaps.length < 2) continue;
    const med = gaps[Math.floor(gaps.length / 2)]!, mad = gaps.map((g) => Math.abs(g - med)).sort((a, b) => a - b)[Math.floor(gaps.length / 2)]!;
    repeats.push({ brick: id, gap: +(med * ar).toFixed(3), regularity: +Math.max(0, 1 - mad / med).toFixed(3), count: row.length });
  }
  return { pieces, pairs, mirrorV: mirror((p) => p.x, (p) => p.y), mirrorH: mirror((p) => p.y, (p) => p.x), repeats };
}

/**
 * New bricks from the pieces no brick matched: cluster their shape vectors, and give every cluster with enough members
 * (and in enough images) a brick drawn from its averaged outline.
 */
export function learnedBricks(as: Assembly[], k = 10, minMembers = 25): LearnedBrick[] {
  const nov: { p: Piece; img: number }[] = [];
  as.forEach((a, i) => { for (const p of a.pieces) if (p.brick === "novel" && p.f && p.profile) nov.push({ p, img: i }); });
  if (nov.length < minMembers * 2) return [];
  const sample = nov.length > 6000 ? nov.filter((_, i) => i % Math.ceil(nov.length / 6000) === 0) : nov;
  // at most one cluster per two minimum memberships, so a lone shape is not split below the minimum
  const kk = Math.max(1, Math.min(k, Math.floor(sample.length / (minMembers * 2))));
  const { assign } = kmeans(sample.map((x) => x.p.f!), kk);
  const out: LearnedBrick[] = [];
  for (let j = 0; j < kk; j++) {
    const members = sample.filter((_, i) => assign[i] === j);
    const images = new Set(members.map((m) => m.img)).size;
    if (members.length < minMembers || images < minMembers / 2) continue;
    const outline = prototypeShape(members.map((m) => ({ profile: m.p.profile! } as Element)));
    const xs = outline.map((q) => q[0]), ys = outline.map((q) => q[1]);
    const colors = new Map<string, number>(); for (const m of members) colors.set(m.p.color, (colors.get(m.p.color) ?? 0) + 1);
    out.push({ id: `learned-${out.length + 1}`, outline: outline.map(([x, y]) => [+x.toFixed(3), +y.toFixed(3)] as [number, number]), n: members.length, share: +(images / as.length).toFixed(3),
      extent: +(members.reduce((s, m) => s + m.p.extent, 0) / members.length).toFixed(4), color: [...colors.entries()].sort((a, b) => b[1] - a[1])[0]![0],
      aspect: +((Math.max(...xs) - Math.min(...xs)) / Math.max(1e-6, Math.max(...ys) - Math.min(...ys))).toFixed(2) });
  }
  return out;
}

/** Sum assemblies into the rules the generator uses. */
export function grammarOf(as: Assembly[]): Grammar {
  const n = as.length || 1, bricks: Grammar["bricks"] = {}, pairAcc: Record<string, number[][]> = {}, rep: Record<string, number[][]> = {};
  let novel = 0, total = 0;
  for (const a of as) {
    const seen = new Set<string>();
    for (const p of a.pieces) {
      total++; if (p.brick === "novel") { novel++; continue; }
      const b = (bricks[p.brick] ??= { share: 0, perImage: 0, extent: 0, colors: [] });
      if (!seen.has(p.brick)) { b.share++; seen.add(p.brick); }
      b.perImage++; b.extent += p.extent; b.colors.push(p.color);
    }
    for (const [x, y, dx, dy, r] of a.pairs) if (x !== "novel" && y !== "novel") (pairAcc[`${x}|${y}`] ??= []).push([dx, dy, r]);
    for (const r of a.repeats) if (r.brick !== "novel") (rep[r.brick] ??= []).push([r.gap, r.regularity]);
  }
  const median = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] ?? 0; };
  for (const [id, b] of Object.entries(bricks)) {
    const count = new Map<string, number>(); for (const c of b.colors) count.set(c, (count.get(c) ?? 0) + 1);
    bricks[id] = { share: +(b.share / n).toFixed(3), perImage: +(b.perImage / n).toFixed(2), extent: +(b.extent / b.perImage).toFixed(4), colors: [...count.entries()].sort((p, q) => q[1] - p[1]).slice(0, 3).map(([c]) => c) };
  }
  const pairs: Grammar["pairs"] = {};
  // offsets: a neighbour sits on either side, so the signed median is ~0; keep the distance to the side (|dx|) and the
  // signed height (dy) of neighbours that are to the side rather than above or below
  for (const [k, v] of Object.entries(pairAcc)) if (v.length >= 2) {
    const side = v.filter((x) => Math.abs(x[0]!) >= Math.abs(x[1]!));
    pairs[k] = { n: v.length, dx: +median(v.map((x) => Math.abs(x[0]!))).toFixed(2), dy: +median((side.length ? side : v).map((x) => x[1]!)).toFixed(2), ratio: +median(v.map((x) => x[2]!)).toFixed(2) };
  }
  const repeats: Grammar["repeats"] = {};
  for (const [k, v] of Object.entries(rep)) repeats[k] = { gap: +median(v.map((x) => x[0]!)).toFixed(3), regularity: +median(v.map((x) => x[1]!)).toFixed(3) };
  return { images: as.length, bricks, pairs, learned: learnedBricks(as), mirrorV: +(as.reduce((s, a) => s + a.mirrorV, 0) / n).toFixed(3), mirrorH: +(as.reduce((s, a) => s + a.mirrorH, 0) / n).toFixed(3), repeats, novelShare: +(novel / (total || 1)).toFixed(3) };
}
