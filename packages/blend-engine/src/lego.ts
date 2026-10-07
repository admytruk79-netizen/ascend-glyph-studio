/**
 * Lego pieces: the folk motifs as interchangeable bricks with one calling convention, so analysis can name what it
 * sees in a museum image and the generator can put the same pieces back together in new arrangements.
 *
 * Every brick draws into a Kit, centred on (x, y), `size` mm tall (width = size × aspect), turned by `angle` where that
 * makes sense, in the colours of a five-role palette. All bricks are stitchable (fills, satins, runs only).
 * Pieces learned from the corpus that match no brick are drawn from their averaged outline (`outlineBrick`).
 */
import { Kit, MOTIF_IDS, type Pt } from "./folk-rich.ts";

/** Colour roles: main (red), dark (navy/black), leaf (green), light (ochre/gold), accent (teal/blue). */
export type Roles = { main: string; dark: string; leaf: string; light: string; accent: string };
export type BrickId =
  | "leaf" | "bud" | "rose" | "star8" | "star4" | "rhomb" | "rhomb-frame" | "cross" | "dot" | "kalyna" | "grapes"
  | "horns" | "bird" | "tree" | "lily" | "ascend-star" | "constellation";

export type Brick = { id: BrickId; motif?: string; scale: "hero" | "companion" | "filler"; aspect?: number; draw: (k: Kit, x: number, y: number, size: number, c: Roles, angle?: number, flip?: 1 | -1) => void };

const P = (x: number, y: number): Pt => ({ x, y });
const up = -Math.PI / 2;

export const BRICKS: Record<BrickId, Brick> = {
  leaf: { id: "leaf", aspect: 0.5, scale: "filler", draw: (k, x, y, s, c, a = up) => k.leaf(c.leaf, P(x - Math.cos(a) * s / 2, y - Math.sin(a) * s / 2), a, s, s * 0.22, 0.15) },
  bud: { id: "bud", aspect: 0.55, scale: "companion", draw: (k, x, y, s, c, a = up) => k.bud(P(x - Math.cos(a) * s * 0.45, y - Math.sin(a) * s * 0.45), a, s * 0.85, c.main, c.leaf) },
  rose: { id: "rose", motif: MOTIF_IDS.rose, scale: "hero", draw: (k, x, y, s, c, a = 0) => k.rose(x, y, s / 2, { petal: c.main, inner: c.light, centre: c.dark, seed: c.light }, a) },
  star8: { id: "star8", motif: MOTIF_IDS.star8, scale: "companion", draw: (k, x, y, s, c) => k.star8(x, y, s / 2, c.main, c.accent, c.light) },
  star4: { id: "star4", scale: "filler", draw: (k, x, y, s, c, a = 0) => k.star4(x, y, s / 2, c.light, a) },
  rhomb: { id: "rhomb", motif: MOTIF_IDS.rhomb, scale: "filler", draw: (k, x, y, s, c) => k.rhomb(c.dark, x, y, s / 2, s / 2) },
  "rhomb-frame": { id: "rhomb-frame", motif: MOTIF_IDS.rhomb, scale: "hero", draw: (k, x, y, s, c) => { k.rhombOutline(c.dark, x, y, s / 2, Math.max(1.2, s * 0.05)); k.star8(x, y, s * 0.24, c.main, c.accent, c.light); } },
  cross: { id: "cross", motif: MOTIF_IDS.cross, scale: "companion", draw: (k, x, y, s, c) => k.cross(x, y, s / 2, c.main, c.light) },
  dot: { id: "dot", scale: "filler", draw: (k, x, y, s, c) => k.disc(c.main, x, y, Math.max(0.9, s / 2)) },
  kalyna: { id: "kalyna", motif: MOTIF_IDS.kalyna, scale: "filler", draw: (k, x, y, s, c) => k.kalyna(x, y, Math.max(1, s / 5.5), c.main) },
  grapes: { id: "grapes", aspect: 0.8, motif: MOTIF_IDS.grapes, scale: "companion", draw: (k, x, y, s, c) => k.grapes(x, y - s / 2, Math.max(1.1, s / 8), c.dark) },
  horns: { id: "horns", aspect: 0.9, motif: MOTIF_IDS.horns, scale: "hero", draw: (k, x, y, s, c) => k.horns(x, y + s / 2, y - s * 0.22, s * 0.18, { horn: c.main, bud: c.light, sepal: c.accent, leaf: c.leaf }) },
  bird: { id: "bird", aspect: 1.35, motif: MOTIF_IDS.bird, scale: "companion", draw: (k, x, y, s, c, _a, f = 1) => k.bird(x, y, s, f, { body: c.accent, wing: c.dark, tail: c.light, beak: c.main }) },
  tree: { id: "tree", aspect: 0.85, motif: MOTIF_IDS.tree, scale: "hero", draw: (k, x, y, s, c) => k.tree(x, y + s / 2, s, { trunk: c.leaf, leaf: c.leaf, bud: c.main, sepal: c.accent, rose: { petal: c.main, inner: c.light, centre: c.dark, seed: c.light }, berry: c.main, mound: c.accent, seed: c.light }) },
  lily: { id: "lily", aspect: 0.75, motif: MOTIF_IDS.lily, scale: "hero", draw: (k, x, y, s, c) => k.lily(x, y + s / 2, s, { stalk: c.dark, petal: c.main, side: c.light, cup: c.dark, leaf: c.leaf, bud: c.main, sepal: c.light }) },
  "ascend-star": { id: "ascend-star", scale: "companion", draw: (k, x, y, s, c, a = Math.PI / 4) => k.ascendStar(x, y, s * 0.32, c.dark, c.light, a) },
  constellation: { id: "constellation", aspect: 1.1, motif: MOTIF_IDS.constellation, scale: "hero", draw: (k, x, y, s, c, _a, f = 1) => k.constellation(x, y, s / 2, { a: c.accent, b: c.light, seed: c.main, small: c.dark }, f > 0 ? 1 : 2) },
};
export const BRICK_IDS = Object.keys(BRICKS) as BrickId[];
/** Width of a brick drawn `size` mm tall. */
export const widthOf = (id: BrickId, size: number) => size * (BRICKS[id].aspect ?? 1);

/** A piece learned from the corpus that matches no brick: its averaged outline (unit box, centred) drawn as one fill. */
export function outlineBrick(k: Kit, outline: [number, number][], x: number, y: number, size: number, color: string, angle = 0) {
  const ca = Math.cos(angle), sa = Math.sin(angle);
  k.fill("learned", color, outline.map(([u, v]) => P(x + (u * ca - v * sa) * size, y + (u * sa + v * ca) * size)));
}
