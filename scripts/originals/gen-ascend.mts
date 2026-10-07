import { writeFileSync } from "node:fs";
import { generate, toSvg } from "../../packages/blend-engine/src/generate.ts";
import { feasibility, readBackGroup } from "../../packages/blend-engine/src/check.ts";
const zone = { name: "linen shirt cuff band", finishedLength: 250, height: 30, seamAllowance: 10, closureOverlap: 18 };
const focus = { Ukrainian: 50, "Western / cowboy material culture": 25, "Native American (structure only)": 15 };
const reqs = [
  { weights: focus, meanings: ["protection", "family", "ascent"], zone, seed: 21 },
  { weights: focus, meanings: ["growth", "light", "heart"], zone, seed: 22 },
];
let i = 0;
for (const r of reqs) for (const c of generate(r, 5)) {
  const f = feasibility(c), back = readBackGroup(c, 30);
  const fail = f.gate.checks.filter((x) => !x.pass && x.id !== "recipe-validated").map((x) => x.id);
  const dark = i % 2 === 1;
  let svg = toSvg(c, 30, dark ? "#13131e" : "#efe9dc");
  if (dark) svg = svg.replaceAll('"#3d4088"', '"#a393c5"').replaceAll('"#0e0e4b"', '"#b89569"').replaceAll('"#cc662b"', '"#e0b18e"');
  writeFileSync(`${process.argv[2]}/d${String(++i).padStart(2, "0")}.svg`, svg);
  console.log(i, c.group, back.group, c.motif.id, c.event?.id ?? "-", c.repeats, f.stitches, fail.join(",") || "ok");
}
