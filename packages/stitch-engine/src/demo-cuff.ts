/**
 * Demo: a cuff band for the linen hero shirt. Rhomb chain between two satin rails, fitted to the cuff by
 * the wrap-around rule, pre-scaled for take-up, stitched, gated and written as DST + preview + run sheet.
 * Usage: tsx src/demo-cuff.ts <outDir> [finishedLengthMm=250] [periodMm=24]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { compensationScale, estimateMinutes, fitWrap, plan, previewSvg, recipes, runGate, runSheet, writeDst, type DesignObject, type Pt } from "./index.js";

const out = process.argv[2] ?? "out";
const finishedLength = Number(process.argv[3] ?? 250);
const period = Number(process.argv[4] ?? 24);
const r = recipes["linen-180-prewashed"]!;
const RED = "#8b1a1a", INDIGO = "#1d2a4d";

const fit = fitWrap({ finishedLength, seamAllowance: 10, closureOverlap: 18, period });
const sx = compensationScale(r.takeup, r.shrinkageX);
const X = (x: number) => x * sx;
const H = 30; // band height between rail centres, mm
const objs: DesignObject[] = [];
const L = fit.usableLength;

let x = fit.usesEvent ? fit.eventLength / 2 : 0; // seam sits in the middle of the event segment
for (let i = 0; i < fit.repeats; i++, x += fit.fittedPeriod) {
  const cx = x + fit.fittedPeriod / 2, hw = fit.fittedPeriod * 0.36, hh = H * 0.36;
  const rh: Pt[] = [{ x: X(cx), y: H / 2 - hh }, { x: X(cx + hw), y: H / 2 }, { x: X(cx), y: H / 2 + hh }, { x: X(cx - hw), y: H / 2 }];
  objs.push({ kind: "fill", id: `rhomb-${i}`, color: RED, polygon: rh, angle: i % 2 ? 45 : -45 });
  // seed between rhombs (at the repeat boundary)
  objs.push({ kind: "satin", id: `seed-${i}`, color: INDIGO, path: [{ x: X(x), y: H / 2 - 2 }, { x: X(x), y: H / 2 + 2 }], width: 1.6 });
}
if (fit.usesEvent) {
  // event segment straddles the seam: split into two half-voids at each band end, marked by a short vertical bar
  objs.push({ kind: "run", id: "event-mark", color: INDIGO, path: [{ x: X(L - 0.5), y: H / 2 - 4 }, { x: X(L - 0.5), y: H / 2 + 4 }], triple: true });
}
objs.push({ kind: "satin", id: "rail-top", color: INDIGO, path: [{ x: 0, y: 0 }, { x: X(L), y: 0 }], width: 2.2 });
objs.push({ kind: "satin", id: "rail-bottom", color: INDIGO, path: [{ x: X(L), y: H }, { x: 0, y: H }], width: 2.2 });

const p = plan(objs, r);
const minutes = estimateMinutes(p, r.speedSpm);
const gate = runGate(objs, p.commands, r, { hoop: { name: "border frame 360x100", width: 360, height: 100 }, maxStitches: 60000, maxMinutes: 60 }, minutes);
mkdirSync(out, { recursive: true });
const file = `ascend-cuff-${finishedLength}.dst`;
writeFileSync(join(out, file), writeDst(p.commands, { label: `CUFF${finishedLength}` }));
writeFileSync(join(out, `ascend-cuff-${finishedLength}.svg`), previewSvg(p.commands, p.colors));
const sheet = runSheet({ designId: "ASCEND-CUFF-RHOMB-DEMO", revision: "0.1", zone: "cuff band", file, wrap: fit, compensation: { scaleX: sx, scaleY: 1 }, gate, plan: p, r });
writeFileSync(join(out, `ascend-cuff-${finishedLength}.runsheet.json`), JSON.stringify(sheet, null, 2));
console.log(JSON.stringify({ wrap: fit, stitches: sheet.stitches, minutes: sheet.estMinutes, extent: sheet.extentMm, trims: sheet.trims, release: gate.release, failed: gate.checks.filter((c) => !c.pass) }, null, 1));
