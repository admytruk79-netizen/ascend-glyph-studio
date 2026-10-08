/**
 * Build new bands from Lego pieces and a learned grammar (scripts/train/lego.ts grammarOf).
 *
 * One repeat unit is a hero piece with its companions (chosen from the pieces the corpus places next to it, at the
 * learned offset and relative size, mirrored when the corpus mirrors) and fillers between units. The unit repeats a
 * whole number of times so the band closes into a ring. With `explore` > 0 some companions are pieces the corpus
 * never paired with the hero: new combinations of known pieces, which is where new designs come from.
 */
import { Kit } from "./folk-rich.ts";
import { BRICKS, outlineBrick, widthOf, type BrickId, type Roles } from "./lego.ts";
import { densify } from "./densify.ts";

export type LegoGrammar = {
  images: number;
  bricks: Record<string, { share: number; perImage: number; extent: number; colors?: string[] }>;
  pairs: Record<string, { n: number; dx: number; dy: number; ratio: number }>;
  mirrorV: number;
  /** bricks learned from the corpus (clusters of pieces no catalogue brick matched), drawn from their outline */
  learned?: { id: string; outline: [number, number][]; share: number; aspect: number }[];
};
export type BandPlan = { hero: BrickId; companions: string[]; filler: BrickId | null; units: number; mirrored: boolean; novelPairs: string[] };

/** Draw a catalogue brick or a learned one (a solid fill from its averaged outline). */
function drawPiece(k: Kit, g: LegoGrammar, id: string, x: number, y: number, size: number, c: Roles, flip: 1 | -1 = 1) {
  if (id in BRICKS) return BRICKS[id as BrickId].draw(k, x, y, size, c, undefined, flip);
  const l = g.learned?.find((b) => b.id === id);
  if (l) outlineBrick(k, flip < 0 ? l.outline.map(([u, v]) => [-u, v] as [number, number]) : l.outline, x, y, size, c.accent);
}
const pieceWidth = (g: LegoGrammar, id: string, size: number) => (id in BRICKS ? widthOf(id as BrickId, size) : size * Math.min(1.4, Math.max(0.4, g.learned?.find((b) => b.id === id)?.aspect ?? 1)));

const isBrick = (id: string): id is BrickId => id in BRICKS;
function rng(seed: string) {
  let h = 2166136261; for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
function pick<T>(items: T[], weight: (t: T) => number, r: () => number): T | undefined {
  const ws = items.map(weight), total = ws.reduce((a, b) => a + b, 0); if (!total) return undefined;
  let x = r() * total; for (let i = 0; i < items.length; i++) { x -= ws[i]!; if (x <= 0) return items[i]; } return items[items.length - 1];
}

/** Choose the pieces for one band from the grammar. */
export function planBand(g: LegoGrammar, seed: string, explore = 0.3): Omit<BandPlan, "units"> {
  const r = rng(seed), known = Object.keys(g.bricks).filter(isBrick);
  const w = (b: BrickId) => (g.bricks[b]?.share ?? 0) * (1 + Math.pow(g.bricks[b]?.perImage ?? 0, 0.3));
  // the hero is a large piece (tree, rose, lily, horns, rhomb field…); companions only lead when the corpus has no hero
  const heroes = known.filter((b) => BRICKS[b].scale === "hero");
  const hero = pick(heroes.length ? heroes : known.filter((b) => BRICKS[b].scale !== "filler"), w, r) ?? "rose";
  const partners = Object.entries(g.pairs).filter(([k]) => k.startsWith(`${hero}|`)).map(([k, v]) => ({ b: k.split("|")[1]!, n: v.n }))
    .filter((p): p is { b: BrickId; n: number } => isBrick(p.b) && p.b !== hero && BRICKS[p.b].scale !== "filler");
  const companions: string[] = [], novelPairs: string[] = [];
  // exploring: a companion the corpus never paired with the hero, sometimes a brick learned from the corpus itself
  const learned = (g.learned ?? []).map((b) => b.id);
  const first: string | undefined = r() < explore || !partners.length
    ? (learned.length && r() < 0.4 ? pick(learned, (id) => g.learned!.find((b) => b.id === id)!.share + 0.01, r) : pick(known.filter((b) => b !== hero && BRICKS[b].scale === "companion"), w, r))
    : pick(partners, (p) => p.n, r)?.b;
  if (first) { companions.push(first); if (!partners.some((p) => p.b === first)) novelPairs.push(`${hero}+${first}`); }
  const filler = pick(known.filter((b) => BRICKS[b].scale === "filler" && b !== "grapes"), w, r) ?? null;
  return { hero, companions, filler, mirrored: r() < Math.max(0.35, g.mirrorV), novelPairs };
}

/** Lay the plan out as a band `length` × `height` mm. */
/** `fill`: fill motifs grown into the ground after layout (true = every clearing, a number = at most that many, 0 = none). */
export function composeBand(g: LegoGrammar, o: { seed: string; length?: number; height?: number; roles: Roles; explore?: number; fill?: boolean | number }): { kit: Kit; plan: BandPlan } {
  const L = o.length ?? 250, H = o.height ?? 60, CY = H / 2, c = o.roles;
  const p = planBand(g, o.seed, o.explore);
  const k = new Kit();
  // frame: border lines and a row of small rhombs, as the corpus bands carry them
  for (const y of [1.8, H - 1.8]) k.satin("border", c.dark, [{ x: 0, y }, { x: L, y }], 1.2);
  for (const y of [4.9, H - 4.9]) for (let i = 0; i < L / 5; i++) k.rhomb(i % 2 ? c.main : c.dark, 2.5 + i * 5, y, 1.4, 1.4, "frame");
  const inner = H - 16, S = inner * 0.9, GAP = 3;
  const comp = p.companions[0];
  const pair = comp ? g.pairs[`${p.hero}|${comp}`] : undefined;
  const Sc = comp ? S * Math.max(0.38, Math.min(0.62, pair?.ratio ?? 0.5)) : 0;
  const Sf = Math.min(12, inner * 0.3);
  // slots: [companion] hero [companion] side by side with GAP between, the filler in what is left at the unit edge
  const wH = widthOf(p.hero, S), wC = comp ? pieceWidth(g, comp, Sc) : 0, wF = p.filler ? widthOf(p.filler, Sf) : 0;
  const group = wH + (comp ? (p.mirrored ? 2 : 1) * (wC + GAP) : 0);
  const units = Math.max(2, Math.floor(L / (group + (p.filler ? wF + 2 * GAP : GAP)))), U = L / units;
  const filler = p.filler && U - group >= wF + 2 * GAP ? p.filler : null;
  const lift = (dy: number | undefined, size: number) => Math.max(-(inner - size) / 2, Math.min((inner - size) / 2, (dy ?? 0) * S * 0.5));
  for (let u = 0; u < units; u++) {
    const left = u * U + (U - group) / 2;
    const hx = left + (comp && p.mirrored ? wC + GAP : 0) + wH / 2;
    BRICKS[p.hero].draw(k, hx, CY, S, c);
    if (comp) {
      const off = wH / 2 + GAP + wC / 2, y = CY + lift(pair?.dy, Sc);
      if (p.mirrored) for (const s of [-1, 1] as const) drawPiece(k, g, comp, hx + s * off, y, Sc, c, (-s) as 1 | -1);
      else drawPiece(k, g, comp, hx + off, y, Sc, c);
    }
    if (filler) BRICKS[filler].draw(k, u * U, CY, Sf, c);
  }
  k.resolveGaps();
  if (o.fill) {
    // grow fill motifs into the ground inside the frame rows, mirrored when the band mirrors
    densify(k, { width: L, height: H, colors: c, margin: 7, variant: Math.floor(rng(o.seed + "/fill")() * 3), ...(p.mirrored ? { mirrorX: L / 2 } : {}), ...(typeof o.fill === "number" ? { maxMotifs: o.fill } : {}) });
    k.resolveGaps();
  }
  return { kit: k, plan: { ...p, filler, units } };
}

/**
 * Oleksandr's signature, written as a grammar: medallions lead, star-lilies and stars accompany them, snowflakes and
 * fans fill, mirrored. Blend it into a learned grammar to put his signature into designs built from the corpus.
 */
export const SIGNATURE_GRAMMAR: LegoGrammar = {
  images: 1,
  bricks: {
    medallion: { share: 1, perImage: 9, extent: 0.12 }, "star-lily": { share: 1, perImage: 4, extent: 0.08 },
    star5: { share: 1, perImage: 6, extent: 0.02 }, snowflake: { share: 1, perImage: 6, extent: 0.02 }, fan: { share: 0.8, perImage: 4, extent: 0.03 },
  },
  pairs: {
    "medallion|star-lily": { n: 6, dx: 1.1, dy: 0, ratio: 0.55 }, "medallion|star8": { n: 3, dx: 1.2, dy: 0, ratio: 0.45 },
    "star-lily|medallion": { n: 6, dx: -1.1, dy: 0, ratio: 1.8 },
  },
  mirrorV: 0.8,
};

/** Mix two grammars: `w` is the weight of `b` (0 = only a, 1 = only b). Shares and pair counts are blended. */
export function blendGrammars(a: LegoGrammar, b: LegoGrammar, w: number): LegoGrammar {
  const bricks: LegoGrammar["bricks"] = {}, pairs: LegoGrammar["pairs"] = {};
  for (const id of new Set([...Object.keys(a.bricks), ...Object.keys(b.bricks)])) {
    const x = a.bricks[id], y = b.bricks[id];
    bricks[id] = { share: (x?.share ?? 0) * (1 - w) + (y?.share ?? 0) * w, perImage: (x?.perImage ?? 0) * (1 - w) + (y?.perImage ?? 0) * w, extent: y?.extent ?? x?.extent ?? 0.05 };
  }
  const na = Math.max(1, ...Object.values(a.pairs).map((p) => p.n)), nb = Math.max(1, ...Object.values(b.pairs).map((p) => p.n));
  for (const key of new Set([...Object.keys(a.pairs), ...Object.keys(b.pairs)])) {
    const x = a.pairs[key], y = b.pairs[key], src = (w >= 0.5 ? y ?? x : x ?? y)!;
    pairs[key] = { ...src, n: ((x?.n ?? 0) / na) * (1 - w) * 100 + ((y?.n ?? 0) / nb) * w * 100 };
  }
  return { images: a.images + b.images, bricks, pairs, mirrorV: a.mirrorV * (1 - w) + b.mirrorV * w };
}
