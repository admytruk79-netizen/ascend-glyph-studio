/**
 * Ornament message: a short text hidden in a band of ornament, repeated along its length, read offline by
 * a phone that sweeps the band and collects the motifs.
 *
 * The ornament is a row of sprigs «ялинки»: each sprig is a stem with a bud on top and three leaf levels.
 * At each level a leaf grows on the left, the right, both or neither: 6 bits per sprig. To the eye, a band
 * of little trees growing naturally unevenly; to the reader, presence or absence of a leaf at a known spot,
 * which survives blur, wear and low light. An ASCEND star with kalyna, without a stem, opens each repeat.
 * A photo taken upside down reverses the bit order exactly (top↔bottom, left↔right), so it is read too.
 *
 * Text uses a 6-bit alphabet (Ukrainian letters, digits, punctuation, space; case-insensitive) so a Ukrainian
 * phrase stays short; other text falls back to UTF-8. Each repeat is Reed–Solomon protected, and the reader
 * votes across repeats (and across separate scans) before correcting, so seams, folds and wear are tolerated.
 */
import { rsDecode, rsEncode } from "./rs.js";
import { Kit, type Pt } from "../../blend-engine/src/folk-rich.ts";
import type { DesignObject } from "../../stitch-engine/src/index.ts";

export const UA6 = "абвгґдеєжзиіїйклмнопрстуфхцчшщьюя 0123456789.,!?—-'’:;()«»/+\"";
if (UA6.length > 64) throw new Error("UA6 alphabet exceeds 64");
export const PARITY = 8; // parity bytes per repeat: corrects 4 wrong bytes, or 8 unreadable ones

export type Column = { kind: "sync" } | { kind: "data"; bits: number }; // bits: L1 R1 L2 R2 L3 R3 (MSB first)

/** Text → bytes: header (mode bit + 7-bit length) then the packed characters, then Reed–Solomon parity. */
export function encodeText(text: string): Uint8Array {
  const lower = text.toLowerCase(), ua = [...lower].every((ch) => UA6.includes(ch));
  let body: Uint8Array;
  if (ua) {
    const chars = [...lower].map((ch) => UA6.indexOf(ch));
    body = new Uint8Array(Math.ceil((chars.length * 6) / 8));
    chars.forEach((v, i) => { for (let b = 0; b < 6; b++) if (v & (32 >> b)) { const bit = i * 6 + b; body[bit >> 3]! |= 128 >> (bit & 7); } });
    if (chars.length > 127) throw new Error("message too long");
    return rsEncode(Uint8Array.from([0x80 | chars.length, ...body]), PARITY);
  }
  body = new TextEncoder().encode(text);
  if (body.length > 127) throw new Error("message too long");
  return rsEncode(Uint8Array.from([body.length, ...body]), PARITY);
}

export function decodeText(code: Uint8Array, erasures: number[] = []): { text: string; corrected: number } {
  const { message, corrected } = rsDecode(code, PARITY, erasures);
  const h = message[0]!, n = h & 0x7f;
  if (h & 0x80) {
    const chars: string[] = [];
    for (let i = 0; i < n; i++) { let v = 0; for (let b = 0; b < 6; b++) { const bit = i * 6 + b; v = (v << 1) | ((message[1 + (bit >> 3)]! >> (7 - (bit & 7))) & 1); } chars.push(UA6[v] ?? "?"); }
    return { text: chars.join(""), corrected };
  }
  return { text: new TextDecoder().decode(message.slice(1, 1 + n)), corrected };
}

/** Bytes → one repeat of columns: a sync, then 6 bits per sprig. */
export function toColumns(code: Uint8Array): Column[] {
  const bits: number[] = [];
  for (const b of code) for (let k = 7; k >= 0; k--) bits.push((b >> k) & 1);
  while (bits.length % 6) bits.push(0);
  const cols: Column[] = [{ kind: "sync" }];
  for (let i = 0; i < bits.length; i += 6) cols.push({ kind: "data", bits: bits.slice(i, i + 6).reduce((a, b) => (a << 1) | b, 0) });
  return cols;
}

/** Columns of one repeat (sync first; unreadable columns as null) → bytes and erasures. */
export function fromColumns(cols: (Column | null)[], codeLength: number): { bytes: Uint8Array; erasures: number[] } {
  const bytes = new Uint8Array(codeLength), lost = new Set<number>();
  for (let bit = 0; bit < codeLength * 8; bit++) {
    const c = cols[1 + Math.floor(bit / 6)];
    if (!c || c.kind !== "data") { lost.add(bit >> 3); continue; }
    if ((c.bits >> (5 - (bit % 6))) & 1) bytes[bit >> 3]! |= 128 >> (bit & 7);
  }
  return { bytes, erasures: [...lost] };
}

export const columnsPerRepeat = (codeLength: number) => 1 + Math.ceil((codeLength * 8) / 6);
export const codeLengthFor = (header: number) => (header & 0x80 ? 1 + Math.ceil(((header & 0x7f) * 6) / 8) : 1 + (header & 0x7f)) + PARITY;

// ---------------------------------------------------------------------------------------------------------
// Ornament layout

export const ORNAMENT_PALETTE = { ground: "#efe9dc", stem: "#4f6b3a", leaf: "#4f6b3a", buds: ["#cc662b", "#b3332b"], star: "#3d4088", seed: "#b89569", berry: "#b3332b", frame: "#3d4088" };
const LEVELS = [0.31, 0.5, 0.69]; // leaf levels (fraction of band height), symmetric about the middle so an upside-down photo reads the same places

/**
 * Lay the message out as a band of `length` mm; the repeat runs round a hem or cuff as many times as fits.
 * pitch: sprig spacing (mm); height: band height (mm).
 */
export function layoutOrnamentMessage(text: string, o: { length?: number; pitch?: number; height?: number; palette?: typeof ORNAMENT_PALETTE } = {}): { objects: DesignObject[]; columns: Column[]; repeats: number; width: number; height: number } {
  const P = o.pitch ?? 10, H = o.height ?? 34, pal = o.palette ?? ORNAMENT_PALETTE;
  const unit = toColumns(encodeText(text));
  const n = Math.max(unit.length, Math.floor((o.length ?? unit.length * P) / P));
  const k = new Kit("om-");
  for (const y of [1, H - 1]) k.satin("frame", pal.frame, [{ x: 0, y }, { x: n * P, y }], 1.2);
  const columns: Column[] = [];
  const leafLen = Math.min(P * 0.62, H * 0.17), leafHalf = Math.max(0.95, leafLen * 0.2), up = -Math.PI / 2, spread = 0.95;
  for (let i = 0; i < n; i++) {
    const c = unit[i % unit.length]!, cx = i * P + P / 2;
    columns.push(c);
    if (c.kind === "sync") {
      k.ascendStar(cx, H * 0.5, H * 0.15, pal.star, pal.seed, Math.PI / 4);
      for (const d of [-1, 1]) k.kalyna(cx, H * 0.5 + d * H * 0.31, 0.95, pal.berry);
      continue;
    }
    const top = H * 0.2, bottom = H * 0.86;
    k.satin("stem", pal.stem, [{ x: cx, y: bottom }, { x: cx, y: top + 1 }], 1.1);
    k.bud({ x: cx, y: top + 1.4 }, up, H * 0.1, pal.buds[i % 2]!, pal.leaf);
    LEVELS.forEach((f, lv) => {
      for (const [side, bit] of [[-1, 5 - lv * 2], [1, 4 - lv * 2]] as const)
        if ((c.bits >> bit) & 1) k.leaf(pal.leaf, { x: cx, y: H * f + leafLen * 0.25 }, up + side * spread, leafLen, leafHalf, -side * 0.18, 0.42, "leaf");
    });
  }
  k.resolveGaps(0.9, 8);
  return { objects: k.objs, columns, repeats: n / unit.length, width: n * P, height: H };
}

export function ornamentMessageSvg(objs: DesignObject[], width: number, height: number, ground = ORNAMENT_PALETTE.ground): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${ground}"/>` + objs.map((x) => x.kind === "fill" ? `<polygon points="${x.polygon.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ")}" fill="${x.color}"/>`
    : `<polyline points="${x.path.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ")}" fill="none" stroke="${x.color}" stroke-width="${x.kind === "satin" ? x.width : 0.9}" stroke-linecap="round"/>`).join("") + "</svg>";
}

// ---------------------------------------------------------------------------------------------------------
// Reader (pure: works on any RGB raster, so the same code runs in the offline phone page)

/** Read the columns from a photo of the band (RGB raster, band horizontal), left to right. */
export function readColumns(rgb: ArrayLike<number>, w: number, h: number, ground: string = ORNAMENT_PALETTE.ground): (Column | null)[] {
  const g = parseInt(ground.slice(1), 16), G = [(g >> 16) & 255, (g >> 8) & 255, g & 255];
  const ink = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) ink[i] = (rgb[i * 3]! - G[0]!) ** 2 + (rgb[i * 3 + 1]! - G[1]!) ** 2 + (rgb[i * 3 + 2]! - G[2]!) ** 2 > 60 * 60 ? 1 : 0;
  // frame lines: rows inked across most of the width; the band lies between them
  const rowInk = Array.from({ length: h }, (_, y) => { let s = 0; for (let x = 0; x < w; x++) s += ink[y * w + x]!; return s / w; });
  const frameRows = rowInk.map((v, y) => (v > 0.6 ? y : -1)).filter((y) => y >= 0);
  const top = frameRows.filter((y) => y < h / 2).pop() ?? 0, bot = frameRows.find((y) => y > h / 2) ?? h - 1;
  const H = bot - top, Y = (f: number) => top + f * H;
  // sprigs and syncs: runs of inked columns between the frame lines
  const colInk = Array.from({ length: w }, (_, x) => { let s = 0; for (let y = top + 2; y < bot - 1; y++) s += ink[y * w + x]!; return s; });
  const spans: [number, number][] = []; let s0 = -1;
  for (let x = 0; x <= w; x++) { const on = x < w && colInk[x]! > 0; if (on && s0 < 0) s0 = x; if (!on && s0 >= 0) { spans.push([s0, x - 1]); s0 = -1; } }
  const sw = spans.map(([a, b]) => b - a + 1).sort((a, b) => a - b), med = sw[Math.floor(sw.length / 2)] ?? 1;
  const out: (Column | null)[] = [], slots: number[][] = [];
  for (const [a, b] of spans) {
    if (b - a + 1 < med * 0.3) continue;
    // the stem: the column with the longest vertical run of ink
    let sx = a, best = -1;
    for (let x = a; x <= b; x++) if (colInk[x]! > best) { best = colInk[x]!; sx = x; }
    let run = 0, maxRun = 0; for (let y = top + 2; y < bot - 1; y++) { run = ink[y * w + sx] ? run + 1 : 0; maxRun = Math.max(maxRun, run); }
    if (maxRun < H * 0.5) { out.push({ kind: "sync" }); slots.push([]); continue; }
    // leaf slots: ink beside the stem at each level, left and right
    const half = Math.max(sx - a, b - sx, 2), lvH = H * 0.09, gapPx = Math.max(2, Math.round(H * 0.035));
    const v: number[] = [];
    for (const f of LEVELS) for (const side of [-1, 1]) {
      let s = 0;
      for (let y = Math.round(Y(f) - lvH); y <= Math.round(Y(f) + lvH); y++) for (let d = gapPx; d <= half; d++) { const x = sx + side * d; if (x >= 0 && x < w && ink[y * w + x]) s++; }
      v.push(s);
    }
    out.push({ kind: "data", bits: 0 }); slots.push(v);
  }
  // threshold leaves against the typical full leaf in this photo (adaptive to scale and blur)
  const all = slots.flat().filter((x) => x > 0).sort((a, b) => a - b), full = all[Math.floor(all.length * 0.75)] ?? 1;
  out.forEach((c, i) => { if (c?.kind === "data") c.bits = slots[i]!.reduce((acc, x) => (acc << 1) | (x > full * 0.35 ? 1 : 0), 0); });
  return out;
}

/**
 * Collect pieces from one or more scans, vote per position, and decode.
 * A scan may start anywhere: the columns after a sync are the start of a repeat, and the columns before the
 * first sync are the end of the previous one, so every piece a photo sees is used once the repeat length R
 * is known (tried from the header, then from every plausible length).
 */
export function decodeOrnamentScans(scans: (Column | null)[][]): { text: string; corrected: number; repeatsUsed: number } | null {
  const syncs = scans.map((cols) => cols.map((c, i) => (c?.kind === "sync" ? i : -1)).filter((i) => i >= 0));
  if (!syncs.some((s) => s.length)) return null;
  const pieces = (R: number) => {
    const reps: (Column | null)[][] = [];
    scans.forEach((cols, k) => {
      const ss = syncs[k]!; if (!ss.length) return;
      // the tail before the first sync ends a repeat
      const first = ss[0]!; if (first > 0) { const tail = cols.slice(Math.max(0, first - (R - 1)), first); reps.push([...Array<Column | null>(R - tail.length).fill(null), ...tail]); }
      for (const i of ss) reps.push(cols.slice(i, Math.min(cols.length, i + R)));
    });
    return reps;
  };
  const vote = (reps: (Column | null)[][], R: number) => {
    const voted: (Column | null)[] = [{ kind: "sync" }];
    for (let p = 1; p < R; p++) {
      const tally = new Map<number, number>();
      for (const r of reps) { const c = r[p]; if (c?.kind === "data") tally.set(c.bits, (tally.get(c.bits) ?? 0) + 1); }
      const best = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
      voted.push(best ? { kind: "data", bits: best[0] } : null);
    }
    return voted;
  };
  // the header (first data column) suggests the length; then try all plausible lengths
  const firstReps = pieces(columnsPerRepeat(PARITY + 2));
  const header = fromColumns(vote(firstReps, columnsPerRepeat(PARITY + 2)), 1).bytes[0]!;
  const tried = new Set<number>();
  for (const len of [codeLengthFor(header), ...Array.from({ length: 140 }, (_, i) => i + PARITY + 2)]) {
    if (tried.has(len)) continue;
    tried.add(len);
    const R = columnsPerRepeat(len), reps = pieces(R);
    try {
      const { bytes, erasures } = fromColumns(vote(reps, R), len);
      if (erasures.length > PARITY) continue;
      const r = decodeText(bytes, erasures);
      if (codeLengthFor(encodeText(r.text)[0]!) === len) return { ...r, repeatsUsed: reps.length };
    } catch { /* next length */ }
  }
  return null;
}

/** A photo taken upside down: reverse the order and the bits of every sprig (top↔bottom, left↔right). */
export function reverseScan(cols: (Column | null)[]): (Column | null)[] {
  const rev6 = (b: number) => { let r = 0; for (let k = 0; k < 6; k++) r = (r << 1) | ((b >> k) & 1); return r; };
  return [...cols].reverse().map((c) => (c && c.kind === "data" ? { kind: "data", bits: rev6(c.bits) } : c));
}
