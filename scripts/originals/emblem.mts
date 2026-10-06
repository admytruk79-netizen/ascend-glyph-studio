import { writeFileSync } from "node:fs";
import { emblem, emblemSvg } from "../../packages/blend-engine/src/emblem.ts";
import { ASCEND_PALETTE as C } from "../../packages/blend-engine/src/ascend.ts";
import { estimateMinutes, plan, recipes, runGate, writeDst, previewSvg } from "../../packages/stitch-engine/src/index.ts";
const out = process.argv[2]!;
const variants = {
  night: { ground: C.night, colors: undefined },
  linen: { ground: C.linen, colors: { orbit: C.royal, peaks: C.indigo, heart: C.ember, roots: C.ash, star: C.ember, sequin: "#c9962f", sequinStar: "#d9a93c" } },
  indigo: { ground: C.indigo, colors: { orbit: C.peach, peaks: C.lavender, heart: C.ember, roots: C.sand, star: C.peach, sequin: "#e3e0f0", sequinStar: "#f2efe6" } },
};
const r = recipes["linen-180-prewashed"]!;
for (const [name, v] of Object.entries(variants)) {
  const e = emblem(v.colors as any);
  writeFileSync(`${out}/emblem-${name}.svg`, emblemSvg(e, v.ground));
  if (name === "night") {
    const p = plan(e.objects, r);
    const g = runGate(e.objects, p.commands, r, { hoop: { name: "100x100", width: 100, height: 100 } }, estimateMinutes(p, r.speedSpm));
    writeFileSync(`${out}/emblem.dst`, writeDst(p.commands, { label: "OLEKSANDR" }));
    writeFileSync(`${out}/emblem-stitches.svg`, previewSvg(p.commands, p.colors));
    const sheet = { design: "Personal emblem — Oleksandr", size: "70 x 98 mm", stitches: p.commands.filter((c) => c.cmd === "stitch").length, minutes: +estimateMinutes(p, r.speedSpm).toFixed(1), threads: p.colors,
      sequins: e.sequins.map((s) => ({ part: s.part, x: +s.x.toFixed(1), y: +s.y.toFixed(1), diameterMm: s.d, color: s.color })), meaning: e.meaning,
      gate: g.checks.filter((c) => !c.pass).map((c) => `${c.id}: ${c.detail}`) };
    writeFileSync(`${out}/emblem-runsheet.json`, JSON.stringify(sheet, null, 2));
    console.log(JSON.stringify({ stitches: sheet.stitches, minutes: sheet.minutes, sequins: sheet.sequins.length, gate: sheet.gate }));
  }
}
