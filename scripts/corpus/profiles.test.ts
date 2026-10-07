import test from "node:test";
import assert from "node:assert/strict";
import { blend, buildProfiles, traditionOf } from "./profiles.ts";
import type { AnalyzedRow } from "./store.ts";

const row = (id: string, o: Partial<AnalyzedRow> & { group?: string; void?: number; mx?: number }): AnalyzedRow => ({
  id, source: "t", tradition: o.tradition ?? "Global", culture: o.culture, title: o.title,
  features: { voidRatio: o.void ?? 0.3, mirrorX: o.mx ?? 0.5, edgeDensity: 0.2, dominantAxis: "horizontal" },
  deconstruction: { kind: "frieze", bands: [{ frieze: { group: o.group ?? "p1" }, periodRel: 0.1, thicknessRel: 0.2, breaks: { ratio: 0 }, grammar: { figures: ["continuity"] } }] } as any,
});

test("catalogue text beats the search group; Indigenous provenance is structure-only; bare query labels are marked", () => {
  assert.equal(traditionOf(row("a", { tradition: "Ukrainian", culture: "Japan", title: "Inro" })), "Other");
  assert.equal(traditionOf(row("b", { tradition: "Global", culture: "Ukraine, Hutsul region" })), "Ukrainian");
  assert.equal(traditionOf(row("c", { tradition: "Ukrainian" })), "Ukrainian (by query)");
  assert.equal(traditionOf(row("d", { culture: "Lakota" })), "Native American (structure only)");
  assert.equal(traditionOf(row("e", { title: "Rinktinė juosta, Lietuva" })), "Lithuanian");
  assert.equal(traditionOf(row("f", { culture: "American", title: "Saddle" })), "Western / cowboy material culture");
  assert.equal(traditionOf(row("g", { culture: "Mexican", title: "Pair of spurs" })), "Western / cowboy material culture");
  assert.equal(traditionOf(row("h", { culture: "French", title: "Saddle cloth" })), "Other");
  assert.equal(traditionOf(row("i", { tradition: "Ukraine" })), "Ukrainian"); // older rows: culture stored in tradition
  assert.equal(traditionOf(row("j", { tradition: "American", title: "Beaded bag, Lakota" })), "Native American (structure only)");
});

test("profiles and blend: distributions, medians, dominant symmetry, fail closed", () => {
  const rows = [
    ...Array.from({ length: 40 }, (_, i) => row(`u${i}`, { culture: "Ukraine", group: i < 30 ? "p2mm" : "p1m1", void: 0.1, mx: 0.9 })),
    ...Array.from({ length: 10 }, (_, i) => row(`e${i}`, { culture: "England", group: "p1", void: 0.6, mx: 0.2 })),
  ];
  const ps = buildProfiles(rows);
  const ua = ps.find((p) => p.tradition === "Ukrainian")!;
  assert.equal(ua.n, 40);
  assert.deepEqual(ua.frieze, { p2mm: 0.75, p1m1: 0.25 });
  assert.equal(ua.median.voidRatio, 0.1);
  const b = blend(ps, { Ukrainian: 3, "English (16th–19th c.)": 1 });
  assert.equal(b.dominant, "Ukrainian");
  assert.equal(b.friezeGroup, "p2mm");
  assert.equal(b.median.voidRatio, 0.225); // 0.75×0.1 + 0.25×0.6
  assert.ok(b.warnings.some((w) => w.startsWith("English")), "English has < 30 objects → provisional");
  assert.throws(() => blend(ps, { Navajo: 1 } as any), /not a selectable/); // no nation-specific selection
  assert.throws(() => blend(ps, { Belarusian: 1 }), /no profile/);
});
