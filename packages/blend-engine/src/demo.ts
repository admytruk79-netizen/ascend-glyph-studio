/**
 * Demo: candidates for one request → SVG previews, lineage, feasibility, and a DST for the best.
 * Usage: tsx src/demo.ts <outDir> [seed]
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { generate, toSvg, type Request } from "./generate.js";
import { feasibility, readBackGroup } from "./check.js";
import { previewSvg, writeDst } from "../../stitch-engine/src/index.ts";

const out = process.argv[2] ?? "out";
const seed = Number(process.argv[3] ?? 11);
const focus = JSON.parse(readFileSync(new URL("../../../data/training/focus.json", import.meta.url), "utf8"));
const profilesPath = process.env.PROFILES_IN;
const req: Request = {
  weights: { Ukrainian: 50, "Western / cowboy material culture": 25, "Native American (structure only)": 15 },
  meanings: ["protection", "family", "ascent"],
  zone: { name: "linen shirt cuff band", finishedLength: 250, height: 30, seamAllowance: 10, closureOverlap: 18 },
  profiles: profilesPath && existsSync(profilesPath) ? JSON.parse(readFileSync(profilesPath, "utf8")).profiles : undefined,
  seed,
};
mkdirSync(out, { recursive: true });
const rows: unknown[] = [];
let best = "";
const cands = generate(req, 8);
for (const c of cands) {
  const back = readBackGroup(c, req.zone.height);
  const f = feasibility(c);
  const failed = f.gate.checks.filter((x) => !x.pass && x.id !== "recipe-validated").map((x) => x.id);
  writeFileSync(join(out, `${c.id}.svg`), toSvg(c, req.zone.height));
  rows.push({ id: c.id, group: c.group, readBack: back.group, motif: c.motif.id, event: c.event?.id ?? null, repeats: c.repeats, period: +c.period.toFixed(1), stitches: f.stitches, minutes: +f.minutes.toFixed(1), gateFailures: failed });
  if (!best && !failed.length && back.group === c.group) {
    best = c.id;
    writeFileSync(join(out, `${c.id}.dst`), writeDst(f.commands, { label: c.id.slice(0, 16) }));
    writeFileSync(join(out, `${c.id}.stitches.svg`), previewSvg(f.commands, f.colors));
  }
  writeFileSync(join(out, `${c.id}.lineage.json`), JSON.stringify(c.lineage, null, 2));
}
console.log(JSON.stringify({ best, focusWeights: focus.weights, request: { weights: req.weights, meanings: req.meanings }, candidates: rows }, null, 1));
