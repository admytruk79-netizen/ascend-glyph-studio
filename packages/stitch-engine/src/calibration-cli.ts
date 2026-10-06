/**
 * Writes the sew-out calibration strip: DST, SVG preview, run sheet and a measurement sheet (CSV) to fill in.
 * Usage: tsx src/calibration-cli.ts <outDir> [recipeId=linen-180-prewashed]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { calibrationStrip, estimateMinutes, plan, previewSvg, recipes, runGate, runSheet, writeDst } from "./index.js";

const out = process.argv[2] ?? "out";
const recipeId = process.argv[3] ?? "linen-180-prewashed";
const r = recipes[recipeId];
if (!r) throw new Error(`unknown recipe ${recipeId}; known: ${Object.keys(recipes).join(", ")}`);
const { objects, items } = calibrationStrip();
const p = plan(objects, r);
const gate = runGate(objects, p.commands, r, { hoop: { name: "200x200", width: 200, height: 200 } }, estimateMinutes(p, r.speedSpm));
mkdirSync(out, { recursive: true });
const base = `ascend-calibration-${recipeId}`;
writeFileSync(join(out, `${base}.dst`), writeDst(p.commands, { label: "CALIB" }));
writeFileSync(join(out, `${base}.svg`), previewSvg(p.commands, p.colors));
const sheet = runSheet({ designId: "ASCEND-CALIBRATION", revision: "0.1", zone: "flat test panel", file: `${base}.dst`, compensation: { scaleX: 1, scaleY: 1 }, gate, plan: p, r });
sheet.qc.unshift("This is a test strip: the limit tests (0.8 mm satin, 0.35/0.38 mm fills, 0.5 mm gap) are expected to fail the gate and are there to be measured.");
writeFileSync(join(out, `${base}.runsheet.json`), JSON.stringify(sheet, null, 2));
const csv = ["id,row,parameter,design value,unit,what to measure,after stitching,after wash,notes",
  ...items.map((i) => [i.id, i.row, i.parameter, i.value, i.unit, i.measure, "", "", ""].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))];
writeFileSync(join(out, `${base}.measurements.csv`), csv.join("\n") + "\n");
console.log(JSON.stringify({ stitches: sheet.stitches, minutes: sheet.estMinutes, extent: sheet.extentMm, colors: sheet.threads, items: items.length }));
