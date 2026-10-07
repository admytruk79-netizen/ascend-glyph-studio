import test from "node:test";
import assert from "node:assert/strict";
import { assignSplit, corpusStats, mergeCorpus, splitGroup, type AnalyzedRow } from "./store.ts";

const row = (id: string, extra: Partial<AnalyzedRow> = {}): AnalyzedRow => ({ id, source: "cma", accession: `1916.${id}`, image: `https://img/${id}.jpg`, tradition: "Ukraine", ...extra });

test("merge adds new rows, drops duplicates by image and hash, and upgrades re-analyzed rows", () => {
  const master = [row("1", { dhash: "0f".repeat(16) }), row("2")];
  const incoming = [
    row("3"),
    row("4", { image: "https://img/2.jpg?size=large" }), // same image as 2
    row("5", { dhash: "0f".repeat(15) + "0e" }), // near-identical to 1
    row("2", { deconstruction: { kind: "frieze" }, analyzedAt: "2026-10-06" }),
  ];
  const m = mergeCorpus(master, incoming);
  assert.deepEqual(m.rows.map((r) => r.id), ["1", "2", "3"]);
  assert.equal(m.added, 1);
  assert.equal(m.duplicates, 2);
  assert.equal(m.updated, 1);
  assert.equal(m.rows[1]!.deconstruction?.kind, "frieze");
});

test("splits are stable, ~80/10/10, and keep an accession series together", () => {
  assert.equal(splitGroup(row("x", { accession: "1916.123" })), "cma:1916");
  assert.equal(splitGroup(row("x", { source: "commons", accession: "commons:123" })), "commons:commons:123");
  assert.equal(assignSplit(row("a", { accession: "1916.1" })), assignSplit(row("b", { accession: "1916.999" })));
  const counts = { train: 0, validation: 0, holdout: 0 };
  for (let i = 0; i < 5000; i++) counts[assignSplit(row(String(i), { accession: `${1800 + (i % 2000)}.${i}` }))]++;
  assert.ok(counts.train > 3600 && counts.train < 4400, JSON.stringify(counts));
  assert.ok(counts.holdout > 300 && counts.holdout < 700, JSON.stringify(counts));
});

test("stats report milestone progress and v3 diversity checks", () => {
  const rows = Array.from({ length: 10 }, (_, i) => row(String(i), { source: i < 6 ? "aic" : "cma", tradition: i < 5 ? "Japan" : `T${i}`, deconstruction: { kind: "frieze", bands: [{ frieze: { group: "p1m1" } }] } }));
  const s = corpusStats(rows);
  assert.equal(s.total, 10);
  assert.equal(s.milestone.next, 25_000);
  assert.equal(s.diversity.maxSourceShare, 0.6);
  assert.equal(s.diversity.checks.sourceShare, false);
  assert.equal(s.friezeGroups.p1m1, 10);
});
