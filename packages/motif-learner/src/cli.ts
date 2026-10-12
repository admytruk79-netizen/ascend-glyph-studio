/**
 *   tsx src/cli.ts train [records.json …]           fit + held-out evaluation → out/motif-learner/{model,evaluation}.json
 *   tsx src/cli.ts generate [--tradition Ukrainian] [--region R] [--count 12] [--seed 1] [--group d4] [--size 15]
 *                                                    → out/motif-learner/{candidates.json,sheet.svg}
 *   tsx src/cli.ts extract <image> --id ID --tradition T --group G
 *                                                    → a record to review; its licence stays "unreviewed" (excluded) until a person sets it
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { composeBand } from "./band.ts";
import { leaveOneGroupOut } from "./evaluate.ts";
import { extractGrid } from "./extract.ts";
import { generate } from "./generate.ts";
import { toChart, toSvg } from "./grid.ts";
import { fit, select, type Model, type MotifRecord } from "./model.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const outDir = join(root, "out/motif-learner");
const [cmd, ...rest] = process.argv.slice(2);
const flag = (name: string, dflt?: string) => { const i = rest.indexOf(`--${name}`); return i >= 0 ? rest[i + 1] : dflt; };
const positional = rest.filter((a, i) => !a.startsWith("--") && !rest[i - 1]?.startsWith("--"));

function loadRecords(files: string[]): MotifRecord[] {
  const dir = join(root, "data/motifs");
  const paths = files.length ? files.map((f) => resolve(f)) : readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => join(dir, f));
  return paths.flatMap((p) => (JSON.parse(readFileSync(p, "utf8")) as { records: MotifRecord[] }).records);
}

if (cmd === "train") {
  const records = loadRecords(positional);
  const { model, excluded } = fit(records);
  const evaluation = leaveOneGroupOut(records);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "model.json"), JSON.stringify(model));
  writeFileSync(join(outDir, "evaluation.json"), JSON.stringify({ excluded, ...evaluation }, null, 1));
  console.log(JSON.stringify({
    dataset: model.dataset, excluded: excluded.length,
    traditions: Object.fromEntries(Object.values(model.traditions).map((s) => [s.key, { examples: s.examples, sourceGroups: s.sourceGroups, independentSources: s.independentSources, symmetry: s.symmetry }])),
    regions: Object.keys(model.regions),
    heldOut: { folds: evaluation.folds, meanGainNatsPerWindow: +evaluation.meanGain.toFixed(3), beatsBaseline: `${evaluation.wins}/${evaluation.heldOut.length}`, caveat: evaluation.caveat },
  }, null, 1));
} else if (cmd === "generate") {
  const model = JSON.parse(readFileSync(join(outDir, "model.json"), "utf8")) as Model;
  const sub = select(model, flag("tradition", "Ukrainian")!, flag("region") ?? null);
  const size = flag("size"), group = flag("group");
  const { accepted, rejected } = generate(sub, model.dataset, { count: +flag("count", "12")!, seed: +flag("seed", "1")!, ...(size ? { size: +size } : {}), ...(group ? { group: group as never } : {}) });
  const cell = 7, cols = 4, tile = 24 * cell, tiles = accepted.map((c, i) => `<g transform="translate(${(i % cols) * tile + (tile - c.grid.w * cell) / 2},${Math.floor(i / cols) * (tile + 16)})">${toSvg(c.grid, cell, `${c.group} ${c.logLikelihood.toFixed(2)} ≈${(c.nearest.iou * 100).toFixed(0)}%`)}</g>`);
  const band = accepted.length >= 2 ? composeBand([accepted[0]!.grid, accepted[1]!.grid], "A A A | B | A A A") : null;
  const bandY = Math.ceil(accepted.length / cols) * (tile + 16) + 10, W = Math.max(cols * tile, (band?.w ?? 0) * 5);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${bandY + (band ? band.h * 5 + 20 : 0)}"><rect width="100%" height="100%" fill="#fff"/>${tiles.join("")}${band ? `<g transform="translate(0,${bandY})">${toSvg(band, 5, "band: A A A | B | A A A")}</g>` : ""}</svg>`;
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "sheet.svg"), svg);
  writeFileSync(join(outDir, "candidates.json"), JSON.stringify({ model: sub.key, dataset: model.dataset, accepted: accepted.map((c) => ({ ...c, grid: undefined, chart: toChart(c.grid) })), rejected }, null, 1));
  console.log(JSON.stringify({ model: sub.key, accepted: accepted.length, rejected: rejected.length, sheet: "out/motif-learner/sheet.svg" }));
  for (const c of accepted.slice(0, 3)) console.log(`\n${c.group} seed ${c.seed} ll ${c.logLikelihood.toFixed(3)} nearest ${c.nearest.id} ${(c.nearest.iou * 100).toFixed(0)}%\n${toChart(c.grid).join("\n")}`);
} else if (cmd === "extract") {
  const file = positional[0];
  if (!file) throw new Error("extract needs an image path");
  const sharp = (await import("sharp")).default;
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const r = extractGrid({ width: info.width, height: info.height, data, channels: 3 });
  if (!r) { console.error("no clear stitch pitch: not a counted chart or flat photograph"); process.exit(2); }
  const record: MotifRecord = {
    id: flag("id", "extracted")!, tradition: flag("tradition", "")!, region: null, technique: "cross-stitch", sourceGroup: flag("group", "")!, chart: toChart(r.grid),
    provenance: { kind: "museum-object", licence: "unreviewed", culturalAccess: "review", independentSource: true, note: `extracted at pitch ${r.pitch.join("×")} px, confidence ${r.confidence.toFixed(2)}` },
  };
  console.log(JSON.stringify(record, null, 1));
} else {
  console.error("usage: cli.ts train|generate|extract");
  process.exit(1);
}
