/**
 * Shape-grammar generator. Counted embroidery is built from a small vocabulary of 45° primitives — rhombs, eight-point
 * stars, stepped diagonals, ram's horns, sprouting branches, outlined fills — composed in rings around a centre under
 * exact symmetry (the approach of procedural sampler generators and the blackwork shape grammars, rather than
 * cell-by-cell sampling, which gives ragged blobs). Each motif is a small program: a core, optional rings, arms and
 * satellites, each scaled to the motif radius and painted in a colour role (fill, outline, accent).
 *
 * The learned model does not draw: it supplies the palette (thread use by ring layer) and ranks many grammar
 * candidates by how well their local construction matches the tradition (patch log-likelihood). The near-copy gate
 * against training references still applies.
 */
import { at, blank, density, type Grid } from "./grid.ts";
import { logLikelihood, type SubModel } from "./model.ts";
import { nearestReference, rng, type Candidate, type Rejection } from "./generate.ts";
import type { Group } from "./symmetry.ts";

type Mask = (x: number, y: number) => boolean;
/** Colour roles: 1 fill, 2 outline / line work, 3 accent, 4 leaf. */
interface Element { mask: Mask; fill: Role; outline?: Role; halo?: boolean }
type Role = 0 | 1 | 2 | 3 | 4;

const OPS: Record<Group, ((x: number, y: number) => [number, number])[]> = {
  d4: [(x, y) => [x, y], (x, y) => [-x, y], (x, y) => [x, -y], (x, y) => [-x, -y], (x, y) => [y, x], (x, y) => [-y, x], (x, y) => [y, -x], (x, y) => [-y, -x]],
  c4: [(x, y) => [x, y], (x, y) => [-y, x], (x, y) => [-x, -y], (x, y) => [y, -x]],
  d2: [(x, y) => [x, y], (x, y) => [-x, y], (x, y) => [x, -y], (x, y) => [-x, -y]],
  c2: [(x, y) => [x, y], (x, y) => [-x, -y]],
  "mirror-v": [(x, y) => [x, y], (x, y) => [-x, y]],
  "mirror-h": [(x, y) => [x, y], (x, y) => [x, -y]],
  none: [(x, y) => [x, y]],
};

// ── primitives (signed coordinates, centre at 0,0) ──────────────────────────────────────────────────────────────
const A = Math.abs;
const rhomb = (cx: number, cy: number, r: number): Mask => (x, y) => A(x - cx) + A(y - cy) <= r;
const rhombRing = (r: number, t = 1): Mask => (x, y) => { const d = A(x) + A(y); return d <= r && d > r - t; };
/** A rhomb outline with teeth on its outer edge (the stepped "зубці" border). */
const toothedRing = (r: number, period: number): Mask => (x, y) => { const d = A(x) + A(y); return d === r || (d === r + 1 && (A(x) - A(y)) % period === 0); };
const square = (r: number): Mask => (x, y) => Math.max(A(x), A(y)) <= r;
const squareRing = (r: number, t = 1): Mask => (x, y) => { const d = Math.max(A(x), A(y)); return d <= r && d > r - t; };
/** Eight-point star: a square and a rhomb over each other. */
const octagram = (s: number, k = Math.round(s * 1.5)): Mask => (x, y) => Math.max(A(x), A(y)) <= s || A(x) + A(y) <= k;
/** Eight-point star split into petals by its axes and diagonals, centre kept. */
const rosette = (s: number): Mask => { const o = octagram(s); return (x, y) => o(x, y) && (Math.max(A(x), A(y)) <= 1 || (x !== 0 && y !== 0 && A(x) !== A(y))); };
const cross = (r: number, w: number): Mask => (x, y) => (A(x) <= w && A(y) <= r) || (A(y) <= w && A(x) <= r);
/** Diagonal arm into the first quadrant, with paired sprouts every `period` cells. */
const diagArm = (r1: number, r2: number, sprout: number, period: number): Mask => (x, y) => {
  if (x < 0 || y < 0) return false;
  const along = x + y, across = x - y;
  if (across === 0 && x >= r1 && x <= r2) return true;
  if (!sprout || along % (2 * period) !== 0) return false;
  const m = along / 2;
  return m >= r1 + 1 && m <= r2 - 1 && A(across) <= 2 * sprout && A(across) % 2 === 0;
};
/** Ram's horns: a fork at (p, p) running out along both axes, each tip curling back towards the centre. */
const horns = (p: number, len: number, curl: number): Mask => (x, y) =>
  (y === p && x >= p && x <= p + len) || (x === p && y >= p && y <= p + len) ||
  (x === p + len && y < p && y >= p - curl) || (y === p + len && x < p && x >= p - curl);
/** A hook at the end of a diagonal: one-sided, so it turns a d4 motif into a c4 one. */
const hook = (p: number, len: number, curl: number): Mask => (x, y) => (y === p && x >= p && x <= p + len) || (x === p + len && y < p && y >= p - curl) || (y === p - curl && x < p + len && x >= p + len - curl);
/** Arm along +x with fir chevrons pointing outwards. */
const firArm = (r1: number, r2: number, w: number, period: number): Mask => (x, y) => {
  if (x < r1 || x > r2) return false;
  if (A(y) <= 0) return true;
  return A(y) <= w && (x + A(y) - r1) % period === 0 && x + A(y) <= r2;
};
const shift = (m: Mask, cx: number, cy: number): Mask => (x, y) => m(x - cx, y - cy);
/** Stepped version of a shape: drawn on a grid of 2×2 blocks (the blocky "низь" look). Symmetric about the centre. */
const half = (v: number) => Math.sign(v) * Math.floor((A(v) + 1) / 2);
const stepped = (m: Mask): Mask => (x, y) => m(half(x), half(y));
/** Eight-point star built from rhomb petals: four on the axes, four on the diagonals. */
const petalStar = (c: number, q: number): Mask => (x, y) =>
  rhomb(c, 0, q)(A(x), A(y)) || rhomb(0, c, q)(A(x), A(y)) || rhomb(Math.round(c * 0.7), Math.round(c * 0.7), Math.max(1, q - 1))(A(x), A(y)) || A(x) + A(y) <= 1;
/** Nested rhombs: concentric bands of `band` cells; the band index picks the colour role (0 leaves it bare). */
const nestedRoles = (r: number, band: number, roles: number[]) => (x: number, y: number) => { const d = A(x) + A(y); return d > r ? -1 : roles[Math.floor(d / band) % roles.length]!; };

export type Palette = [number, number, number, number];
/** Thread roles from the model: the most used thread fills, the next outlines, the third accents; green, when used, leaves. */
export function paletteOf(sub: SubModel, structureThread = 1): Palette {
  if (!sub.colour) return [structureThread, structureThread, structureThread, structureThread];
  const totals = [1, 2, 3, 4, 5].map((c) => [c, sub.colour!.layers.reduce((s, l) => s + (l[c] ?? 0), 0)] as const).sort((a, b) => b[1] - a[1]);
  const used = totals.filter(([, n]) => n > 0).map(([c]) => c);
  const p = used[0] ?? structureThread, line = used[1] ?? p, accent = used[2] ?? line;
  const leaf = used.includes(5) && p !== 5 && line !== 5 ? 5 : accent;
  return [p, line, accent === leaf && used[3] ? used[3] : accent, leaf];
}

/**
 * A style's grammar profile: how often it draws figurative (tree, vase, flower) motifs rather than geometric ones and
 * which primitives it favours. The Ukrainian and English profiles are written from the pattern literature (geometric
 * rhombs, stars and ram's horns; samplers' mirrored trees, carnations and pots); they are priors, not learned. Blends
 * mix their parents' profiles by weight, and an invented style draws its own.
 */
export interface GrammarStyle { figurative: number; groups: Partial<Record<Group, number>>; cores: Record<string, number>; arms: Record<string, number>; flowers: Record<string, number>; density: number }
export const GRAMMAR_STYLES: Record<string, GrammarStyle> = {
  Ukrainian: { figurative: 0.25, groups: { d4: 6, c4: 1, d2: 2 }, cores: { octagram: 2, rosette: 1, nested: 3, petals: 3, stepped: 2, cross: 1 }, arms: { diag: 4, fir: 2, none: 2 }, flowers: { petals: 2, tulip: 3, rhomb: 2, carnation: 1 }, density: 0.42 },
  English: { figurative: 0.7, groups: { d4: 3, d2: 2, c4: 1 }, cores: { octagram: 3, rosette: 2, nested: 1, petals: 2, stepped: 1, cross: 2 }, arms: { diag: 2, fir: 1, none: 3 }, flowers: { carnation: 3, tulip: 2, petals: 2, rhomb: 1 }, density: 0.32 },
};
const pickW = <K extends string>(r: () => number, w: Partial<Record<K, number>>): K => {
  const e = Object.entries(w) as [K, number][];
  let u = r() * e.reduce((a, [, v]) => a + v, 0);
  for (const [k, v] of e) if ((u -= v) <= 0) return k;
  return e[e.length - 1]![0];
};
export function styleOf(sub: SubModel): GrammarStyle {
  const base = sub.key.split("/")[0]!;
  if (GRAMMAR_STYLES[base]) return GRAMMAR_STYLES[base]!;
  if (sub.parents?.length) {
    const parts = sub.parents.map((p) => ({ s: GRAMMAR_STYLES[p.key.split("/")[0]!] ?? GRAMMAR_STYLES.Ukrainian!, w: p.weight }));
    const tot = parts.reduce((a, p) => a + p.w, 0);
    const mixRec = (f: (s: GrammarStyle) => Record<string, number>) => { const o: Record<string, number> = {}; for (const p of parts) for (const [k, v] of Object.entries(f(p.s))) o[k] = (o[k] ?? 0) + (v * p.w) / tot; return o; };
    return { figurative: parts.reduce((a, p) => a + (p.s.figurative * p.w) / tot, 0), groups: mixRec((s) => s.groups as Record<string, number>), cores: mixRec((s) => s.cores), arms: mixRec((s) => s.arms), flowers: mixRec((s) => s.flowers), density: parts.reduce((a, p) => a + (p.s.density * p.w) / tot, 0) };
  }
  // invented: a profile of its own, seeded by the style's key
  let h = 2166136261;
  for (const ch of sub.key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const r = rng(h >>> 0), w = (keys: string[]) => Object.fromEntries(keys.map((k) => [k, Math.pow(r(), 2) * 4 + 0.05]));
  return { figurative: r() * 0.6, groups: w(["d4", "c4", "d2"]), cores: w(["octagram", "rosette", "nested", "petals", "stepped", "cross"]), arms: w(["diag", "fir", "none"]), flowers: w(["petals", "tulip", "rhomb", "carnation"]), density: 0.28 + r() * 0.2 };
}

export interface GrammarOptions { seed: number; size?: number; group?: Group; palette?: Palette; style?: GrammarStyle }

/** One motif program, drawn and symmetrised. */
export function grammarMotif(o: GrammarOptions): { grid: Grid; group: Group; program: string[] } {
  const r = rng(o.seed), R = Math.max(5, ((o.size ?? 25) - 1) >> 1), N = 2 * R + 1, st = o.style ?? GRAMMAR_STYLES.Ukrainian!;
  const chance = (p: number) => r() < p, int = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
  const figurative = o.group ? o.group === "mirror-v" : chance(st.figurative);
  const group: Group = o.group ?? (figurative ? "mirror-v" : pickW(r, st.groups));
  const els: Element[] = [], program: string[] = [];
  const add = (name: string, e: Element) => { els.push(e); if (name) program.push(name); };
  if (figurative) figure(R, r, st, add); else {
    // core
    const s = Math.max(2, Math.round(R * (0.28 + r() * 0.2)));
    const coreKind = pickW(r, st.cores);
    let reach = Math.round(s * 1.5);
    if (coreKind === "nested") {
      const band = int(1, 2), roles = [[3, 1, 0, 2], [1, 0, 2, 1], [3, 0, 1, 2, 0], [1, 2, 0]][int(0, 3)]!, rr = Math.round(s * 1.6), f = nestedRoles(rr, band, roles);
      for (const role of [1, 2, 3] as const) add(role === 1 ? `core:nested(${rr},${band})` : "", { mask: (x, y) => f(x, y) === role, fill: role });
      add("", { mask: (x, y) => f(x, y) === 0, fill: 0 });
      reach = rr;
    } else if (coreKind === "petals") {
      const c = Math.max(2, Math.round(s * 1.1)), q = Math.max(1, Math.round(s * 0.55));
      add(`core:petals(${c},${q})`, { mask: petalStar(c, q), fill: 1, outline: q >= 2 && chance(0.6) ? 2 : undefined });
      reach = c + q;
    } else if (coreKind === "stepped") {
      const k = Math.max(2, Math.round(s * 0.8));
      add(`core:stepped(${k})`, { mask: stepped(chance(0.5) ? octagram(Math.max(1, k >> 1), k) : rhomb(0, 0, k)), fill: 1, outline: 2 });
      reach = 2 * k + 1;
    } else {
      const core: Mask = coreKind === "octagram" ? octagram(s) : coreKind === "rosette" ? rosette(s) : cross(Math.round(s * 1.4), Math.max(1, s >> 1));
      add(`core:${coreKind}(${s})`, { mask: core, fill: 1, outline: coreKind !== "rosette" && s >= 3 && chance(0.75) ? 2 : undefined });
    }
    if (coreKind !== "nested" && chance(0.5)) add("eye", { mask: chance(0.5) ? rhomb(0, 0, Math.max(1, s >> 1)) : cross(Math.max(1, s >> 1), 0), fill: chance(0.6) ? 3 : 0 });

    // rings around the core: one, or two on a large motif
    for (let n = R >= 15 ? 2 : 1; n > 0; n--) {
      if (!(chance(0.6) && reach + 4 < R)) continue;
      const rr = reach + int(2, 3), kind = int(0, 2);
      add(`ring:${["toothed", "rhomb", "stepped"][kind]}(${rr})`, { mask: kind === 0 ? toothedRing(rr, 2) : rhombRing(rr, kind === 2 ? 2 : int(1, 2)), fill: chance(0.7) ? 2 : 1, halo: true });
      reach = rr + 1;
    }

    // arms: diagonal with sprouts and horn or hook tips, or fir arms on the axes
    const armKind = pickW(r, st.arms);
    if (armKind === "diag" && reach < R - 3) {
      const p = Math.max(reach >> 1, Math.min(R - 4, Math.round(R * (0.5 + r() * 0.15))));
      const tip = int(2, Math.max(2, R - p - 1)), curl = int(1, Math.max(1, tip - 1)), thick = chance(0.4);
      add(`diag-arm(${reach >> 1}..${p})`, { mask: thick ? (x, y) => x >= 0 && y >= 0 && A(x - y) <= 1 && x + y >= reach && x + y <= 2 * p : diagArm(Math.max(1, reach >> 1), p, chance(0.4) ? 1 : 0, 2), fill: 2 });
      const tipMask = group === "c4" ? hook(p, tip, curl) : horns(p, tip, curl);
      add(`${group === "c4" ? "hook" : "horns"}(${p},${tip},${curl})`, { mask: tipMask, fill: thick ? 1 : 2, halo: false });
    } else if (armKind === "fir") {
      const r1 = reach + 1, r2 = R - int(1, 3);
      if (r2 - r1 >= 3) {
        add(`fir-arm(${r1}..${r2})`, { mask: firArm(r1, r2, int(1, 3), int(2, 3)), fill: 2, halo: true });
        add("arm-tip", { mask: rhomb(r2, 0, int(1, 2)), fill: 1 });
      }
    }

    // satellites in the open space: small stars or rhombs on the axes and/or diagonals (both on a large motif)
    const sides = R >= 12 ? [true, false] : [chance(0.5)];
    for (const onAxis of sides) {
      if (!chance(0.75)) continue;
      const q = int(1, Math.max(2, Math.round(R * 0.2)));
      const d = onAxis ? Math.min(R - q - 1, Math.max(reach + q + 2, Math.round(R * 0.7))) : Math.min(R - q - 1, Math.max(Math.ceil((reach + q + 2) / 2), Math.round(R * 0.6)));
      const kind = q >= 2 && chance(0.6) ? "octagram" : "rhomb";
      const m: Mask = kind === "octagram" ? shift(octagram(Math.max(1, Math.round(q * 0.7)), q), d, onAxis ? 0 : d) : rhomb(d, onAxis ? 0 : d, q);
      add(`satellite:${kind}(${q})@${onAxis ? "axis" : "diag"}${d}`, { mask: m, fill: chance(0.5) ? 1 : 3, outline: q >= 2 && chance(0.6) ? 2 : undefined, halo: true });
    }
    // corner fill so the motif reads as a square tile
    if (chance(0.3)) add("corner-rhombs", { mask: rhomb(R - 1, R - 1, int(1, 2)), fill: 3, halo: true });
    if (chance(0.1)) add(`frame(${R})`, { mask: squareRing(R, 1), fill: 2 });

  }

  // paint
  const ops = OPS[group], role = new Uint8Array(N * N), idx = (x: number, y: number) => (y + R) * N + (x + R);
  for (const e of els) {
    const inside = new Uint8Array(N * N);
    for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) if (ops.some((op) => { const [u, v] = op(x, y); return e.mask(u, v); })) inside[idx(x, y)] = 1;
    const isIn = (x: number, y: number) => x >= -R && y >= -R && x <= R && y <= R && inside[idx(x, y)] === 1;
    if (e.halo) for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
      if (isIn(x, y)) continue;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && isIn(x + dx, y + dy)) role[idx(x, y)] = 0;
    }
    for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
      if (!isIn(x, y)) continue;
      const edge = e.outline && (!isIn(x + 1, y) || !isIn(x - 1, y) || !isIn(x, y + 1) || !isIn(x, y - 1));
      role[idx(x, y)] = edge ? e.outline! : e.fill;
    }
  }
  const pal = o.palette ?? [1, 2, 4, 5];
  const g = blank(N, N);
  for (let i = 0; i < role.length; i++) g.cells[i] = role[i] ? pal[role[i]! - 1]! : 0;
  return { grid: g, group, program };
}


// ── figurative grammar (mirror-v): a pot or root, a trunk, paired branches ending in flowers, a crowning flower ──────
/** Flower heads, centred on (cx, cy) and at most q cells from it in every direction. */
const flowerMask = (kind: string, cx: number, cy: number, q: number): { mask: Mask; outline: boolean } => {
  if (kind === "petals") return { mask: shift(petalStar(Math.max(1, q - 1), Math.max(1, q >> 1)), cx, cy), outline: false };
  if (kind === "rhomb") return { mask: rhomb(cx, cy, q), outline: q >= 2 };
  if (kind === "tulip") // a cup with three points on top
    return { mask: (x, y) => { const dx = A(x - cx), row = y - (cy - q); if (row < 0 || row > 2 * q || dx > q) return false; if (row === 0) return dx === 0 || dx === q; if (row === 2 * q) return dx <= 1; return dx <= q - Math.max(0, row - q); }, outline: q >= 3 };
  // carnation: a calyx with a fan opening upwards, fringed on top
  return { mask: (x, y) => { const dx = A(x - cx), up = cy + q - y; if (up < 0 || up > 2 * q) return false; if (up <= 1) return dx <= 1; const w = Math.min(q, up - 1); return dx <= w && !(up === 2 * q && dx % 2 === 1); }, outline: false };
};
function figure(R: number, r: () => number, st: GrammarStyle, add: (name: string, e: Element) => void) {
  const chance = (p: number) => r() < p, int = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
  const bottom = R - 1, potH = chance(0.65) ? int(2, Math.max(2, Math.round(R * 0.3))) : 0;
  if (potH) { // a stepped pot, wider at the top
    const top = bottom - potH, w = int(Math.round(R * 0.3), Math.round(R * 0.5));
    add(`pot(${potH},${w})`, { mask: (x, y) => y >= top && y <= bottom && A(x) <= w - Math.floor((y - top) / 2), fill: 1, outline: potH >= 3 ? 2 : undefined });
    if (chance(0.5)) add("pot-band", { mask: (x, y) => y === top + 1 && A(x) <= w - 1 && A(x) % 2 === 0, fill: 3 });
  } else add("roots", { mask: (x, y) => y <= bottom && y >= bottom - 2 && A(x) === bottom - y + 1, fill: 2 });
  const trunkBottom = bottom - potH - (potH ? 1 : 0), crownQ = int(2, Math.max(2, Math.round(R * 0.25))), top = -R + 1 + 2 * crownQ;
  const thick = chance(0.4);
  add(`trunk${thick ? "-thick" : ""}`, { mask: (x, y) => A(x) <= (thick ? 1 : 0) && y <= trunkBottom && y >= top, fill: thick ? 4 : 2 });
  // paired branches: diagonal up and out, each ending in a flower, with leaves along them
  const levels = int(1, 3), span = trunkBottom - top, kind = pickW(r, st.flowers);
  for (let i = 0; i < levels; i++) {
    const q = int(1, R >= 13 ? 3 : 2), y0 = Math.round(trunkBottom - ((i + 0.7) * span) / (levels + 0.6));
    const len = Math.max(2, Math.min(R - 1 - 2 * q, y0 + R - 1 - 2 * q, Math.round(R * (0.35 + r() * 0.3)) - i));
    add(`branch(${y0},${len})`, { mask: (x, y) => x > 0 && x <= len && y0 - y === x, fill: 2 });
    if (chance(0.6)) add("leaves", { mask: (x, y) => x > 0 && x < len && (x % 2 === 0) && (y0 - y === x + 1 || y0 - y === x - 1) && y0 - y !== x, fill: 4 });
    const f = flowerMask(i === levels - 1 && chance(0.5) ? kind : pickW(r, st.flowers), len + q, y0 - len - q, q);
    add(`flower(${q})`, { mask: f.mask, fill: chance(0.6) ? 1 : 3, outline: f.outline ? 2 : undefined, halo: true });
  }
  const q = crownQ, crown = flowerMask(kind, 0, top - q, q);
  add(`crown:${kind}(${q})`, { mask: crown.mask, fill: 1, outline: crown.outline ? 2 : undefined, halo: true });
  if (chance(0.5)) add("corner-stars", { mask: (x, y) => A(A(x) - (R - 2)) + A(y + R - 2) <= 1, fill: 3, halo: true });
}

/** Looks: density near the style's, built from several parts, no big solid blocks, few stray stitches. 0–1. */
function looks(g: Grid, target: number, parts: number): number {
  const d = density(g);
  let lone = 0, n = 0, edge = 0, solid = 0;
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    const c = at(g, x, y);
    if (!c) continue;
    n++;
    let k = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && at(g, x + dx, y + dy)) k++;
    if (k <= 1) lone++;
    let same = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (at(g, x + dx, y + dy) === c) same++;
    if (same === 9) solid++;
    if (at(g, x + 1, y) !== c || at(g, x - 1, y) !== c || at(g, x, y + 1) !== c || at(g, x, y - 1) !== c) edge++;
  }
  const dScore = Math.exp(-Math.pow((d - target) / 0.12, 2));
  // share of stitches on a colour or shape edge: low for big solid blocks
  const detail = Math.min(1, (edge / Math.max(1, n)) / 0.6);
  const block = Math.max(0, solid / Math.max(1, n) - 0.15);
  return dScore * detail * Math.min(1, parts / 5) * (1 - Math.min(1, block * 2)) * (1 - Math.min(1, (lone / Math.max(1, n)) * 4));
}

/** Seed for draw j of motif k: hashed, so runs started from nearby seeds never share draws. */
const mix = (seed: number, k: number, j: number) => {
  let h = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(k + 1, 0xc2b2ae35) ^ Math.imul(j + 1, 0x27d4eb2f);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  return (h ^ (h >>> 13)) >>> 0;
};

/**
 * Grammar candidates ranked by the learned model. For each motif returned, `pool` programs are drawn from the style's
 * grammar profile and the one that looks best, nudged by local-construction likelihood under the model, is kept
 * (a style with no training data ranks by looks alone).
 */
export function generateGrammar(sub: SubModel, dataset: string, opts: { count: number; seed: number; size?: number; group?: Group; pool?: number; maxIoU?: number; palette?: Palette; style?: GrammarStyle }) {
  const { count, seed, pool = 10, maxIoU = 0.8 } = opts, palette = opts.palette ?? paletteOf(sub), style = opts.style ?? styleOf(sub);
  const learned = sub.examples > 0;
  const accepted: Candidate[] = [], rejected: Rejection[] = [], phase = rng(seed ^ 0x9e3779b9)();
  for (let k = 0; accepted.length < count && k < count * 4; k++) {
    // the family (figurative or geometric, and its symmetry) is drawn first so the ranking cannot favour one family
    // stratified: over any run the share of figurative motifs matches the style's rate
    const fr = rng(mix(seed, k, 0x2545f491)), f = style.figurative, step = (k + phase) * f;
    const group = opts.group ?? (Math.floor(step + f) > Math.floor(step) ? "mirror-v" : pickW(fr, style.groups));
    const drawn: { grid: Grid; group: Group; ll: number; look: number; seed: number }[] = [];
    for (let j = 0; j < pool; j++) {
      const s = mix(seed, k, j), m = grammarMotif({ seed: s, size: opts.size, group, palette, style });
      drawn.push({ grid: m.grid, group: m.group, ll: learned ? logLikelihood(m.grid, sub) : 0, look: looks(m.grid, m.group === "mirror-v" ? style.density * 0.6 : style.density, m.program.length), seed: s });
    }
    const lo = Math.min(...drawn.map((c) => c.ll)), hi = Math.max(...drawn.map((c) => c.ll));
    const best = drawn.map((c) => ({ ...c, score: c.look + (hi > lo ? (0.25 * (c.ll - lo)) / (hi - lo) : 0) })).sort((a, b) => b.score - a.score)[0]!;
    const nearest = nearestReference(best.grid, sub.references);
    if (nearest.iou >= maxIoU) { rejected.push({ seed: best.seed, reason: "near-copy", detail: nearest.iou }); continue; }
    accepted.push({ grid: best.grid, seed: best.seed, group: best.group, logLikelihood: best.ll, nearest, density: density(best.grid), lineage: { model: sub.key, dataset, references: sub.references.map((x) => x.id) } });
  }
  return { accepted, rejected };
}
