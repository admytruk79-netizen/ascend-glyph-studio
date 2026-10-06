/**
 * ASCEND book → embroidery: translates each of the 108 ASCEND cards into its own band.
 *
 *   npx tsx scripts/originals/book-bands.mts <ascend_cards.json> <out-dir> [card numbers, e.g. 1,22,45]
 *
 * The card text is Oleksandr's and stays private (it is read from his Drive export, never committed).
 * Only the design rules below and the resulting designs are kept.
 *
 *   breathing count → rhythm.  "6-2-6": six inhale beats, a two-beat held centre event, six exhale beats.
 *                     "8-0-8": no hold, so the halves meet at an axis. "4-4-4-4": in, hold, out, hold.
 *                     The whole band is one breath cycle around a cuff or hem (250 mm).
 *   phase           → architecture and palette.
 *                     1 Relief & Stabilization: enclosure (double border, seeded rhombs, orbits), cool palette.
 *                     2 Activation & Alignment: vertical growth (rising sprigs, root-axis, tree of life).
 *                     3 Integration of Forces: mirrored pairs (paired leaves, eye-seed, roses).
 *                     4 Cosmic Expansion: radial (stars, star clusters), night ground.
 *                     5 Mastery & Completion: the full vocabulary (buds, kalyna, rose crown, horns).
 *   title           → the held event: flame → lily, tree → tree of life, spiral/serpent → ram's horns,
 *                     water/stream/shore → vine wave, crown → rose crown, seed/egg → seeded field,
 *                     gateway/temple/citadel/bridge → enclosure, eye → eye-seed, lotus → lotus, heart → heart.
 *   signature       → the ASCEND star from Oleksandr's own sheet sits at the heart of every band.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { Kit, type Pt } from "../../packages/blend-engine/src/folk-rich.ts";
import { ASCEND_EVENTS, ASCEND_UNITS } from "../../packages/blend-engine/src/ascend.ts";
import { estimateMinutes, plan, previewSvg, recipes, runGate, writeDst, type DesignObject } from "../../packages/stitch-engine/src/index.ts";

type Card = { num: number; title: string; phase: number; breathing: string };
const [cardsPath, out, only] = process.argv.slice(2) as [string, string, string?];
const cards: Card[] = JSON.parse(readFileSync(cardsPath, "utf8")).cards;
const pick = only ? new Set(only.split(",").map(Number)) : null;

const L = 250, H = 60, CY = H / 2, FIELD = 16.5; // field half-height inside the frame

const PHASE: Record<number, { ground: string; a: string; b: string; c: string; d: string; e: string; frame: "double" | "rhomb" | "seed" | "zigzag" }> = {
  1: { ground: "#efe9dc", a: "#0e0e4b", b: "#3d4088", c: "#a393c5", d: "#b89569", e: "#cc662b", frame: "double" },
  2: { ground: "#efe9dc", a: "#4f6b3a", b: "#b89569", c: "#cc662b", d: "#3d4088", e: "#b3332b", frame: "rhomb" },
  3: { ground: "#efe6d2", a: "#b3332b", b: "#2b8796", c: "#d39b35", d: "#1f2c4c", e: "#4f6b3a", frame: "rhomb" },
  4: { ground: "#13131e", a: "#a393c5", b: "#e0b18e", c: "#dcd7eb", d: "#cc662b", e: "#b89569", frame: "seed" },
  5: { ground: "#efe6d2", a: "#b3332b", b: "#d39b35", c: "#1f2c4c", d: "#2b8796", e: "#4f6b3a", frame: "zigzag" },
};

function breath(s: string): number[] { const m = s.match(/\d+(?:\s*[-–]\s*\d+)+/); return m ? m[0].split(/[-–]/).map((x) => +x.trim()) : [4, 4]; }

/** Segments of the breath: beats ("in"/"out") and holds ("hold", with a count; 0 = axis). */
type Seg = { kind: "in" | "out" | "hold"; count: number };
function segments(counts: number[]): Seg[] {
  if (counts.length === 2) return [{ kind: "in", count: counts[0]! }, { kind: "hold", count: -1 }, { kind: "out", count: counts[1]! }];
  if (counts.length === 3) return [{ kind: "in", count: counts[0]! }, { kind: "hold", count: counts[1]! }, { kind: "out", count: counts[2]! }];
  return counts.map((c, i) => ({ kind: i % 2 ? "hold" : i % 4 === 0 ? "in" : "out", count: c }) as Seg);
}

function eventFor(title: string, phase: number): string {
  const t = title.toLowerCase();
  const rules: [RegExp, string][] = [
    [/flame|fire|spark/, "lily"], [/tree|emanation|verdant/, "tree"], [/spiral|serpent|twist|tangled/, "horns"],
    [/water|stream|shore|flow|fountain|river/, "vine"], [/crown/, "crown"], [/seed|egg/, "field"],
    [/gate|temple|citadel|bridge|covenant|order|pillar/, "enclosure"], [/eye|watcher/, "eye"], [/lotus/, "lotus"],
    [/heart|devotion|unity|duality|polarity/, "heart"], [/sun|solar|dawn|radian|light|illumin/, "sun"],
    [/star|cosmic|celestial|stellar|expan/, "constellation"],
  ];
  for (const [re, ev] of rules) if (re.test(t)) return ev;
  return ({ 1: "enclosure", 2: "tree", 3: "heart", 4: "constellation", 5: "crown" } as Record<number, string>)[phase]!;
}

function build(card: Card) {
  const C = PHASE[card.phase] ?? PHASE[5]!, k = new Kit(), dark = /shadow|storm|fog|trial|phantom|maya|mirage/i.test(card.title);
  const rose = { petal: C.a, inner: C.b, centre: C.c, seed: C.b };

  // frame
  const frameKind = dark ? "zigzag" : C.frame;
  for (const y of [1.8, H - 1.8]) k.satin("border", C.c, [{ x: 0, y }, { x: L, y }], 1.2);
  for (const [y, s] of [[5.4, 1], [H - 5.4, -1]] as const) {
    if (frameKind === "double") k.satin("border", C.b, [{ x: 0, y }, { x: L, y }], 1.0);
    else if (frameKind === "zigzag") for (let x = 0; x < L; x += 10) { k.satin("zig", C.a, [{ x, y: y + s * 1.4 }, { x: x + 5, y: y - s * 1.4 }], 1.1); k.satin("zig", C.a, [{ x: x + 5, y: y - s * 1.4 }, { x: x + 10, y: y + s * 1.4 }], 1.1); }
    else for (let i = 0; i < L / 5; i++) frameKind === "seed" ? k.disc(i % 2 ? C.b : C.d, 2.5 + i * 5, y, 1.0, "frame") : k.rhomb(i % 2 ? C.a : C.d, 2.5 + i * 5, y, 1.3, 1.3, "frame");
  }

  // inner micro-border: a row of small chevrons «ялинка» pointing along the band (or seeds on dark cards)
  for (const y of [10.2, H - 10.2]) for (let xx = 2; xx < L - 1; xx += 4.2) {
    if (dark) { k.rhomb(C.b, xx + 1, y, 0.95, 0.95, "micro"); continue; }
    k.leaf(C.d, { x: xx, y }, -0.55, 3.1, 0.75, 0, 0.45, "micro"); k.leaf(C.d, { x: xx, y }, 0.55, 3.1, 0.75, 0, 0.45, "micro");
  }

  // rhythm: lay the breath out along the band
  const segs = segments(breath(card.breathing));
  const beats = segs.filter((s) => s.kind !== "hold").reduce((a, s) => a + s.count, 0);
  const holdW = (s: Seg, wb: number) => s.count === 0 ? 16 : s.count < 0 ? 36 : Math.max(32, s.count * wb);
  let wb = L / segs.reduce((a, s) => a + s.count, 0);
  for (let i = 0; i < 4; i++) wb = (L - segs.filter((s) => s.kind === "hold").reduce((a, s) => a + holdW(s, wb), 0)) / Math.max(1, beats);
  const ev = eventFor(card.title, card.phase);
  let x = 0;
  for (const seg of segs) {
    if (seg.kind === "hold") { const w = holdW(seg, wb); event(k, seg.count === 0 ? "axis" : ev, x + w / 2, w, C, rose); x += w; continue; }
    for (let i = 0; i < seg.count; i++) {
      beat(k, card.phase, seg.kind, x + wb / 2, wb, C, i);
      // density: grains above and below each beat, a small star at every second boundary
      for (const d of [-1, 1]) k.rhomb(i % 2 ? C.e : C.b, x + wb / 2, CY + d * (FIELD - 1.2), 1.1, 1.1, "grain");
      if (i > 0 && i % 2 === 0 && wb > 9) k.star4(x, CY + (i % 4 ? -1 : 1) * (FIELD - 3.5), 2.3, C.c, 0.2);
      x += wb;
    }
  }
  return { k, C, ev };
}

/** One breath beat: inhale beats rise, exhale beats settle. */
function beat(k: Kit, phase: number, kind: "in" | "out", cx: number, w: number, C: typeof PHASE[1], i: number) {
  const s = Math.min(w * 0.9, 2 * FIELD - 9), up = kind === "in";
  switch (phase) {
    case 1: up ? (k.rhomb(C.b, cx, CY, s * 0.32, s * 0.5, "rhomb"), k.rhomb(C.e, cx, CY, s * 0.1, s * 0.14, "seed"))
              : k.place(ASCEND_UNITS.orbit!.polys, cx - s * 0.45, CY - s * 0.45, s * 0.9, [C.a, C.d], i % 2 === 1); break;
    case 2: if (up) {
              k.satin("stem", C.a, [{ x: cx, y: CY + s * 0.7 }, { x: cx, y: CY - s * 0.55 }], 1.2);
              for (const [f, l] of [[0.4, 0.45], [0, 0.4], [-0.35, 0.32]] as const) for (const d of [-1, 1]) k.leaf(C.a, { x: cx, y: CY + f * s }, -Math.PI / 2 + d * 0.8, s * l, Math.max(0.8, s * 0.06));
              k.bud({ x: cx, y: CY - s * 0.55 }, -Math.PI / 2, s * 0.3, C.c, C.b);
            } else k.place(ASCEND_UNITS.rootAxis!.polys, cx - s * 0.5, CY - s * 0.5, s, [C.b, C.c], i % 2 === 1); break;
    case 3: if (up) for (const d of [-1, 1]) k.leaf(d < 0 ? C.a : C.b, { x: cx, y: CY + s * 0.45 }, -Math.PI / 2 + d * 0.38, s * 0.95, Math.max(0.9, s * 0.13), -d * 0.35);
            else k.place(ASCEND_UNITS.eyeSeed!.polys, cx - s * 0.45, CY - s * 0.45, s * 0.9, [C.d, C.c], i % 2 === 1); break;
    case 4: up ? k.star4(cx, CY + (i % 2 ? -1 : 1) * s * 0.25, s * 0.42, C.a, (i % 3) * 0.2)
              : k.star8(cx, CY - (i % 2 ? -1 : 1) * s * 0.2, s * 0.38, C.b, C.d, C.c); break;
    default: up ? k.bud({ x: cx, y: CY + s * 0.55 }, -Math.PI / 2, s * 0.9, C.a, C.e)
                : k.kalyna(cx, CY, Math.max(1.05, s * 0.09), C.a);
  }
}

/** The held event (centre of the breath), always carrying the ASCEND star. */
function event(k: Kit, ev: string, cx: number, w: number, C: typeof PHASE[1], rose: { petal: string; inner: string; centre: string; seed: string }) {
  const R = Math.min(w * 0.42, FIELD - 1);
  switch (ev) {
    case "axis": // no hold: the halves meet at an axis with the star on it
      k.satin("axis", C.c, [{ x: cx, y: CY - FIELD + 1 }, { x: cx, y: CY + FIELD - 1 }], 1.4);
      k.ascendStar(cx, CY, 5.2, C.a, C.e); return;
    case "lily": k.lily(cx, CY + FIELD - 0.5, FIELD * 1.6, { stalk: C.d, petal: C.a, side: C.b, cup: C.d, leaf: C.e, bud: C.a, sepal: C.b }); break;
    case "tree": k.tree(cx, CY + FIELD - 0.5, FIELD * 1.85, { trunk: C.e, leaf: C.e, bud: C.a, sepal: C.b, rose, berry: C.a, mound: C.d, seed: C.b }); break;
    case "horns": k.horns(cx, CY + FIELD - 1, CY + 1, Math.min(6.5, R * 0.45), { horn: C.a, bud: C.b, sepal: C.d, leaf: C.e }); break;
    case "vine": {
      const p: Pt[] = Array.from({ length: 41 }, (_, i) => ({ x: cx - w / 2 + 1 + (i / 40) * (w - 2), y: CY + 7 * Math.sin((i / 40) * 2 * Math.PI) }));
      k.satin("vine", C.d, p, 1.6); k.grapes(cx - w * 0.25, CY + 9, 1.3, C.c, [3, 2, 1]); k.bud({ x: cx + w * 0.25, y: CY - 8 }, -Math.PI / 2, 8, C.a, C.e); break;
    }
    case "crown": k.rose(cx, CY - 2, Math.min(R, 13), rose); for (const d of [-1, 1]) k.bud({ x: cx + d * Math.min(R, 13) * 0.9, y: CY + Math.min(R, 13) * 0.7 }, -Math.PI / 2 + d * 0.9, 8, C.b, C.e); return;
    case "field":
      k.rhombOutline(C.c, cx, CY, R, 1.6);
      for (let q = 0; q < 4; q++) { const a = (q * Math.PI) / 2; k.rhomb(C.b, cx + Math.cos(a) * R * 0.55, CY + Math.sin(a) * R * 0.55, R * 0.1, R * 0.1, "seed"); }
      break;
    case "enclosure": k.rhombOutline(C.c, cx, CY, R, 1.6); k.rhombOutline(C.b, cx, CY, R * 0.68, 1.2); break;
    case "eye": k.place(ASCEND_UNITS.eyeSeed!.polys, cx - R, CY - R, 2 * R, [C.c, C.a]); return;
    case "lotus": k.place(ASCEND_EVENTS.lotus!.polys, cx - R, CY - R * 1.15, 2 * R, [C.a, C.b, C.b, C.c, C.c, C.d]); return;
    case "heart": k.place(ASCEND_EVENTS.heartStar!.polys, cx - R, CY - R * 0.9, 2 * R, [C.a]); k.ascendStar(cx, CY - R * 0.1, R * 0.32, C.c, C.b); return;
    case "sun": k.place(ASCEND_EVENTS.sunHorizon!.polys, cx - R, CY - R, 2 * R, [C.b, C.c, C.c]); k.ascendStar(cx, CY - R * 0.2, R * 0.3, C.a, C.a); return;
    default: k.constellation(cx, CY, R, { a: C.a, b: C.b, seed: C.d, small: C.c }, Math.round(cx)); return;
  }
  // events that do not already hold it get the ASCEND star at their centre or crown
  if (ev === "field" || ev === "enclosure") k.ascendStar(cx, CY, R * 0.3, C.a, C.e);
  else k.ascendStar(cx, CY - FIELD + 4.5, 3.4, C.c, C.b);
}

const r = recipes["linen-180-prewashed"]!;
const svgOf = (objs: DesignObject[], ground: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="${L}mm" height="${H}mm" viewBox="0 0 ${L} ${H}"><rect width="100%" height="100%" fill="${ground}"/>` + objs.map((o) => o.kind === "fill" ? `<polygon points="${o.polygon.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ")}" fill="${o.color}"/>`
  : `<polyline points="${o.path.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ")}" fill="none" stroke="${o.color}" stroke-width="${o.kind === "satin" ? o.width : 0.9}" stroke-linecap="round" stroke-linejoin="round"/>`).join("") + "</svg>";
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const report: unknown[] = [];
for (const card of cards) {
  if (pick && !pick.has(card.num)) continue;
  const { k, C, ev } = build(card);
  k.resolveGaps();
  const name = `${String(card.num).padStart(3, "0")}-${slug(card.title)}`;
  writeFileSync(`${out}/${name}.svg`, svgOf(k.objs, C.ground));
  const p = plan(k.objs, r), min = estimateMinutes(p, r.speedSpm);
  const g = runGate(k.objs, p.commands, r, { hoop: { name: "border frame 360x100", width: 360, height: 100 } }, min);
  writeFileSync(`${out}/${name}.dst`, writeDst(p.commands, { label: name.toUpperCase().slice(0, 16) }));
  const failed = g.checks.filter((c) => !c.pass && c.id !== "recipe-validated").map((c) => `${c.id}: ${c.detail}`);
  report.push({ card: card.num, name, phase: card.phase, rhythm: breath(card.breathing).join("-"), event: ev, stitches: p.commands.filter((c) => c.cmd === "stitch").length, minutes: +min.toFixed(1), colors: p.colors.length, failed });
  console.log(name.padEnd(36), `p${card.phase}`, breath(card.breathing).join("-").padEnd(9), ev.padEnd(13), failed.join(" | ") || "ok");
}
writeFileSync(`${out}/book-bands.json`, JSON.stringify(report, null, 2));
