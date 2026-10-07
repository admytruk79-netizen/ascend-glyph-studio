import { writeFileSync } from "node:fs";
import { UNIT_MOTIFS, EVENT_MOTIFS } from "../../packages/blend-engine/src/motifs.ts";
import { friezeCell } from "../../packages/blend-engine/src/symmetry.ts";
import { ASCEND_PALETTE as C } from "../../packages/blend-engine/src/ascend.ts";
import { plan, recipes, runGate, estimateMinutes, writeDst, previewSvg, fitWrap, type DesignObject } from "../../packages/stitch-engine/src/index.ts";
const out = process.argv[2]!;
const L = 212; // cuff usable length
const objs: DesignObject[] = [];
let y = 0;
const row = (color: string) => { objs.push({ kind: "run", id: `row-${y}`, color, path: [{ x: 0, y }, { x: L, y }], triple: true, length: 2.5 }); y += 2.2; };
// band: frieze of a unit motif, fitted to L by the wrap rule, optional central event
function band(id: string, motif: string, group: any, h: number, period: number, color: string, event?: { m: string; color: string }) {
  const evLen = event ? h * 1.15 : 0;
  const fit = fitWrap({ finishedLength: L - evLen, period });
  const cell = friezeCell(UNIT_MOTIFS[motif]!.polys, group);
  const half = Math.floor(fit.repeats / 2);
  let x = 0;
  for (let i = 0; i < fit.repeats; i++) {
    if (event && i === half) { for (const p of EVENT_MOTIFS[event.m]!.polys) objs.push({ kind: "fill", id: `${id}-ev`, color: event.color, polygon: p.map((q) => ({ x: x + (evLen - h) / 2 + q.x * h, y: y + q.y * h })), angle: 0 }); x += evLen; }
    for (const [k, p] of cell.entries()) objs.push({ kind: "fill", id: `${id}-${i}-${k}`, color, polygon: p.map((q) => ({ x: x + q.x * fit.fittedPeriod, y: y + q.y * h })), angle: k % 2 ? 45 : -45 });
    x += fit.fittedPeriod;
  }
  y += h + 1.6;
}
row(C.sand);                                                    // boot-stitch frame
band("yalynky-top", "branch", "p1m1", 9, 9, C.royal);           // «в ялинки» — fir chevrons, ascent
row(C.ember);
band("vikontsia", "seedRhomb", "p2mm", 20, 20, C.indigo, { m: "star8", color: C.ember }); // «віконця» lattice, «ружа/звізда» at the centre
row(C.ember);
band("kryvulka", "wave", "p2mg", 10, 22, C.royal);               // «кривулька» — the road, stepped diagonal beat
row(C.sand);
const ground = C.linen;
const body = objs.map((o) => o.kind === "fill" ? `<polygon points="${o.polygon.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ")}" fill="${o.color}"/>` : `<polyline points="${o.path.map((p) => `${p.x},${p.y}`).join(" ")}" stroke="${o.color}" stroke-width="0.9" stroke-dasharray="2.2 0.6" fill="none"/>`).join("");
writeFileSync(`${out}/choice.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="${L}mm" height="${y}mm" viewBox="-2 -2 ${L + 4} ${y + 4}"><rect x="-2" y="-2" width="${L + 4}" height="${y + 4}" fill="${ground}"/>${body}</svg>`);
const r = recipes["linen-180-prewashed"]!;
const p = plan(objs, r);
const g = runGate(objs, p.commands, r, { hoop: { name: "border frame 360x100", width: 360, height: 100 } }, estimateMinutes(p, r.speedSpm));
writeFileSync(`${out}/choice.dst`, writeDst(p.commands, { label: "ASCEND-CHOICE" }));
console.log(JSON.stringify({ heightMm: +y.toFixed(1), stitches: p.commands.filter((c) => c.cmd === "stitch").length, minutes: +estimateMinutes(p, r.speedSpm).toFixed(1), failed: g.checks.filter((c) => !c.pass).map((c) => `${c.id}: ${c.detail}`) }));
