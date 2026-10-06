/**
 * The six named bands from Oleksandr's design board (6 Oct 2026), built from the rich folk vocabulary
 * (packages/blend-engine/src/folk-rich.ts) so they are real, stitchable embroidery.
 *
 *   npx tsx scripts/originals/rich-bands.mts <out-dir> [board|night]
 *
 * Each band is 250 × 60 mm and repeats a whole number of times, so it closes into a ring (hem, cuff, sleeve)
 * with the seam on a unit boundary. Writes <band>.svg, <band>.dst, <band>-stitches.svg, bands.json (lineage + gate).
 */
import { writeFileSync } from "node:fs";
import { Kit, MOTIF_IDS, type Pt } from "../../packages/blend-engine/src/folk-rich.ts";
import { estimateMinutes, plan, previewSvg, recipes, runGate, writeDst, type DesignObject } from "../../packages/stitch-engine/src/index.ts";

const out = process.argv[2]!;
const variant = (process.argv[3] ?? "board") as "board" | "night";
const L = 250, H = 60, CY = H / 2;

// board: the colours of the design board on a linen ground; night: the ASCEND palette on the night ground
const PALETTES = {
  board: { ground: "#efe6d2", red: "#b3332b", deep: "#7d1f1c", teal: "#2b8796", ochre: "#d39b35", navy: "#1f2c4c", green: "#4f6b3a" },
  night: { ground: "#13131e", red: "#cc662b", deep: "#75615e", teal: "#a393c5", ochre: "#e0b18e", navy: "#dcd7eb", green: "#b89569" },
};
const C = PALETTES[variant];

/** Frame: a border line top and bottom with a row of small rhombs inside it; `zigzag` swaps the rhombs for mountains. */
function frame(k: Kit, zigzag = false) {
  for (const y of [1.8, H - 1.8]) k.satin("border", C.navy, [{ x: 0, y }, { x: L, y }], 1.2);
  for (const [y, s] of [[zigzag ? 5.6 : 4.9, 1], [H - (zigzag ? 5.6 : 4.9), -1]] as const) {
    if (zigzag) {
      // mountains: one satin per slope (a single column folds at the peaks)
      for (let x = 0; x < L; x += 10) { k.satin("zig", C.red, [{ x, y: y + s * 1.6 }, { x: x + 5, y: y - s * 1.6 }], 1.2); k.satin("zig", C.red, [{ x: x + 5, y: y - s * 1.6 }, { x: x + 10, y: y + s * 1.6 }], 1.2); }
    } else for (let i = 0; i < L / 5; i++) k.rhomb(i % 2 ? C.red : C.navy, 2.5 + i * 5, y, 1.4, 1.4, "frame");
  }
}

const rose = { petal: C.red, inner: C.ochre, centre: C.navy, seed: C.ochre };
type Band = { id: string; name: string; meanings: string[]; motifs: string[]; build: (k: Kit) => void };

const bands: Band[] = [
  {
    id: "01-ascend-roots", name: "Ascend Roots", meanings: ["growth", "family", "protection"], motifs: [MOTIF_IDS.tree, MOTIF_IDS.bird, MOTIF_IDS.kalyna, MOTIF_IDS.rose, MOTIF_IDS.star8],
    build: (k) => {
      frame(k);
      for (let u = 0; u < 4; u++) {
        const cx = 31.25 + u * 62.5;
        k.tree(cx, 53, 45, { trunk: C.green, leaf: C.green, bud: C.red, sepal: C.teal, rose, berry: C.red, mound: C.teal, seed: C.ochre });
        for (const s of [-1, 1] as const) k.bird(cx + s * 21, 41, 11, (-s) as 1 | -1, { body: C.teal, wing: C.navy, tail: C.ochre, beak: C.red });
        k.star8(cx + 31.25, 15, 5.2, C.ochre, C.red, C.navy);
      }
    },
  },
  {
    id: "02-mountain-path", name: "Mountain Path", meanings: ["road", "protection", "strength"], motifs: [MOTIF_IDS.zigzag, MOTIF_IDS.horns, MOTIF_IDS.rhomb, MOTIF_IDS.star8],
    build: (k) => {
      frame(k, true);
      for (let u = 0; u < 4; u++) {
        const rx = 15.625 + u * 62.5, hx = rx + 31.25;
        k.rhombOutline(C.navy, rx, CY, 19, 1.6);
        k.star8(rx, CY, 11, C.red, C.teal, C.ochre);
        for (let q = 0; q < 4; q++) { const a = (q * Math.PI) / 2; k.rhomb(C.ochre, rx + Math.cos(a) * 14, CY + Math.sin(a) * 14, 1.3, 1.3, "grain"); }
        k.horns(hx, 51, 31, 5.6, { horn: C.red, bud: C.ochre, sepal: C.teal, leaf: C.teal });
      }
    },
  },
  {
    id: "03-river-lineage", name: "River Lineage", meanings: ["continuity", "family", "fertility"], motifs: [MOTIF_IDS.hops, MOTIF_IDS.grapes, MOTIF_IDS.star8],
    build: (k) => {
      frame(k);
      // the vine: one wave per 62.5 mm, crest at x = 15.6 + 62.5u, trough half a period later
      const wy = (x: number) => CY - 1 - 8 * Math.cos((2 * Math.PI * (x - 15.625)) / 62.5);
      const vine: Pt[] = Array.from({ length: 251 }, (_, i) => ({ x: i, y: wy(i) }));
      for (let s = 0; s < 4; s++) k.satin("vine", C.teal, vine.slice(s * 62.5 | 0, Math.min(250, ((s + 1) * 62.5 | 0) + 1)), 1.8);
      for (let u = 0; u < 4; u++) {
        const crest = 15.625 + u * 62.5, trough = crest + 31.25;
        k.bud({ x: crest, y: wy(crest) - 0.8 }, -Math.PI / 2, 10, C.red, C.green);
        for (const s of [-1, 1]) k.leaf(C.green, { x: crest + s * 5, y: wy(crest + s * 5) }, -Math.PI / 2 + s * 1.1, 8.5, 2, -s * 0.3);
        k.grapes(trough, wy(trough) + 3.2, 1.45, C.navy);
        for (const s of [-1, 1]) k.leaf(C.green, { x: trough + s * 6.5, y: wy(trough + s * 6.5) }, Math.PI / 2 - s * 1.0, 8, 2, s * 0.3);
        k.star8(trough, 15.5, 6.2, C.red, C.ochre, C.teal);
        k.star4(crest, 50, 3.4, C.ochre);
      }
    },
  },
  {
    id: "04-sky-horizon", name: "Sky Horizon", meanings: ["light", "sun", "expansion"], motifs: [MOTIF_IDS.rose, MOTIF_IDS.constellation, MOTIF_IDS.cross],
    build: (k) => {
      frame(k);
      for (let u = 0; u < 5; u++) {
        const rx = 12.5 + u * 50, sx = rx + 25;
        k.rose(rx, CY, 12, rose);
        k.constellation(sx, CY, 11, { a: C.teal, b: C.ochre, seed: C.red, small: C.navy }, u + 1);
        for (const y of [12.5, H - 12.5]) k.cross(rx + 12.5 + (y < CY ? 0 : 0), y, 3.6, C.navy, C.red);
      }
    },
  },
  {
    id: "05-fire-within", name: "Fire Within", meanings: ["light", "renewal", "courage"], motifs: [MOTIF_IDS.lily, MOTIF_IDS.cross],
    build: (k) => {
      frame(k);
      for (let u = 0; u < 5; u++) {
        const lx = 12.5 + u * 50, cx = lx + 25;
        k.lily(lx, 53, 44, { stalk: C.deep, petal: C.red, side: C.ochre, cup: C.deep, leaf: C.green, bud: C.red, sepal: C.ochre });
        k.cross(cx, CY, 8, C.red, C.ochre);
        for (const y of [13, H - 13]) k.star4(cx, y, 3.2, C.teal);
      }
    },
  },
  {
    id: "06-earth-anchor", name: "Earth Anchor", meanings: ["fertility", "protection", "family"], motifs: [MOTIF_IDS.rhomb, MOTIF_IDS.star8, MOTIF_IDS.kalyna, MOTIF_IDS.oak],
    build: (k) => {
      frame(k);
      for (let u = 0; u < 4; u++) {
        const rx = 15.625 + u * 62.5, sx = rx + 31.25;
        // seeded field «засіяне поле»: a rhomb divided in four, a seed in each part, a star at the centre
        k.rhombOutline(C.navy, rx, CY, 20, 1.8);
        k.satin("divide", C.navy, [{ x: rx - 10, y: CY - 10 }, { x: rx + 10, y: CY + 10 }], 1.2);
        k.satin("divide", C.navy, [{ x: rx + 10, y: CY - 10 }, { x: rx - 10, y: CY + 10 }], 1.2);
        for (let q = 0; q < 4; q++) { const a = (q * Math.PI) / 2; k.rhomb(C.ochre, rx + Math.cos(a) * 9.5, CY + Math.sin(a) * 9.5, 2.6, 2.6, "seed"); }
        k.star8(rx, CY, 5.5, C.red, C.red, C.ochre);
        // kalyna spray: a stalk with oak-like leaves and two berry clusters
        k.satin("stalk", C.green, [{ x: sx, y: 53 }, { x: sx, y: 13 }], 1.5);
        for (const [y, s] of [[45, -1], [37, 1], [29, -1], [21, 1]] as const) k.leaf(C.green, { x: sx, y }, -Math.PI / 2 + s * 1.0, 10, 2.3, -s * 0.25);
        for (const s of [-1, 1]) k.kalyna(sx + s * 8.5, s < 0 ? 26 : 42, 1.35, C.red);
        k.bud({ x: sx, y: 13.5 }, -Math.PI / 2, 6.5, C.red, C.ochre);
      }
    },
  },
];

const r = recipes["linen-180-prewashed"]!;
const toSvg = (objs: DesignObject[]) => objs.map((o) => o.kind === "fill" ? `<polygon points="${o.polygon.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ")}" fill="${o.color}"/>`
  : `<polyline points="${o.path.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ")}" fill="none" stroke="${o.color}" stroke-width="${o.kind === "satin" ? o.width : 0.9}" stroke-linecap="round" stroke-linejoin="round"/>`).join("");
const report: unknown[] = [];
for (const b of bands) {
  const k = new Kit(); b.build(k); const fixedGaps = k.resolveGaps();
  writeFileSync(`${out}/${b.id}-${variant}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="${L}mm" height="${H}mm" viewBox="0 0 ${L} ${H}"><rect width="100%" height="100%" fill="${C.ground}"/>${toSvg(k.objs)}</svg>`);
  const p = plan(k.objs, r), min = estimateMinutes(p, r.speedSpm);
  const g = runGate(k.objs, p.commands, r, { hoop: { name: "border frame 360x100", width: 360, height: 100 } }, min);
  if (variant === "board") { writeFileSync(`${out}/${b.id}.dst`, writeDst(p.commands, { label: b.id.toUpperCase().slice(0, 16) })); writeFileSync(`${out}/${b.id}-stitches.svg`, previewSvg(p.commands, p.colors)); }
  const failed = g.checks.filter((c) => !c.pass).map((c) => `${c.id}: ${c.detail}`);
  report.push({ id: b.id, name: b.name, meanings: b.meanings, motifs: b.motifs, sizeMm: [L, H], objects: k.objs.length, stitches: p.commands.filter((c) => c.cmd === "stitch").length, colors: p.colors.length, minutes: +min.toFixed(1), failed });
  console.log(b.id, k.objs.length, "obj", fixedGaps, "gaps fixed", p.commands.filter((c) => c.cmd === "stitch").length, "st", min.toFixed(1), "min", failed.join(" | "));
}
writeFileSync(`${out}/bands-${variant}.json`, JSON.stringify(report, null, 2));
