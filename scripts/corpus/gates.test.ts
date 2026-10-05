import test from "node:test";
import assert from "node:assert/strict";
import { culturalAccessOf, dedupeKeys, gate, type Candidate } from "./gates.ts";

const base: Candidate = {
  id: "cma-1", institution: "Cleveland Museum of Art", source: "cma", query: "embroidery", tradition: "Global",
  title: "Embroidered towel (rushnyk)", culture: "Ukraine, 19th century", material: "linen, cotton embroidery",
  objectURL: "https://clevelandart.org/art/1", image: "https://openaccess-cdn.clevelandart.org/1/1_web.jpg",
  imageWidth: 1200, imageHeight: 900, rights: "CC0", rightsStatus: "open", accession: "1916.1", reliability: 0.97,
};

test("open, provenanced, pattern-bearing record is accepted with relevance tags", () => {
  const g = gate(base);
  assert.equal(g.accepted, true);
  if (g.accepted) assert.ok(g.relevance.includes("textile"));
});

test("records without an image or with a tiny image are rejected", () => {
  assert.deepEqual(gate({ ...base, image: undefined }), { accepted: false, reason: "no-image", culturalAccess: "open" });
  assert.equal((gate({ ...base, imageWidth: 300, imageHeight: 200 }) as any).reason, "image-too-small");
});

test("missing provenance and unresolved rights are rejected", () => {
  assert.equal((gate({ ...base, objectURL: undefined }) as any).reason, "missing-provenance");
  assert.equal((gate({ ...base, rightsStatus: "review" }) as any).reason, "rights-unresolved");
});

test("nation-specific Indigenous North American provenance goes to review, never auto-accepted", () => {
  const c = { ...base, culture: "Lakota", title: "Beaded vest" };
  assert.equal(culturalAccessOf(c), "review");
  assert.equal((gate(c) as any).reason, "cultural-review");
});

test("sacred or ceremonial context goes to review regardless of culture", () => {
  assert.equal((gate({ ...base, title: "Ceremonial sash" }) as any).reason, "cultural-review");
});

test("objects with no structural-pattern vocabulary are rejected as not relevant", () => {
  assert.equal((gate({ ...base, title: "Portrait of a man", material: "oil on canvas", culture: "Dutch" }) as any).reason, "not-structurally-relevant");
});

test("dedupe keys cover id, image URL and institution accession", () => {
  const k = dedupeKeys({ ...base, image: base.image + "?v=2" });
  assert.deepEqual(k, ["cma-1", "img:https://openaccess-cdn.clevelandart.org/1/1_web.jpg", "acc:Cleveland Museum of Art:1916.1"]);
});
