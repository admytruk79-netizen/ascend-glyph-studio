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

test("Ukrainian-language descriptions count as structurally relevant", () => {
  const g = gate({ ...base, title: "Сорочка жіноча", material: undefined, culture: "Ukraine" });
  assert.equal(g.accepted, true);
  if (g.accepted) assert.ok(g.relevance.includes("ukrainian"));
});

test("Belarusian, Lithuanian and other European catalogue text counts as pattern-bearing", async () => {
  const { relevanceOf } = await import("./gates.ts");
  const t = (title: string) => relevanceOf({ ...base, title, material: undefined, culture: undefined });
  assert.ok(t("Ручнік з вышыўкай").includes("belarusian"));
  assert.ok(t("Rinktinė juosta").includes("lithuanian"));
  assert.ok(t("Ukrainische Stickerei auf Leinen").includes("european"));
});

test("Europeana rights statements: PD/CC0/CC BY open, BY-SA and NC go to review", async () => {
  const { europeanaRights } = await import("./sources.ts");
  assert.equal(europeanaRights("http://creativecommons.org/publicdomain/mark/1.0/"), "open");
  assert.equal(europeanaRights("http://creativecommons.org/publicdomain/zero/1.0/"), "open");
  assert.equal(europeanaRights("http://creativecommons.org/licenses/by/4.0/"), "open");
  assert.equal(europeanaRights("http://creativecommons.org/licenses/by-sa/4.0/"), "review");
  assert.equal(europeanaRights("http://creativecommons.org/licenses/by-nc/4.0/"), "review");
  assert.equal(europeanaRights("http://rightsstatements.org/vocab/InC/1.0/"), "review");
  assert.equal(europeanaRights(undefined), "unknown");
});

test("Library of Congress and Internet Archive rights", async () => {
  const { locRights, archiveRights } = await import("./sources.ts");
  assert.equal(locRights("No known restrictions on publication."), "open");
  assert.equal(locRights("Rights status not evaluated."), "review");
  assert.equal(locRights("<p>The Library of Congress believes that some of the items have no known restrictions</p>"), "review");
  assert.equal(locRights(undefined), "unknown");
  assert.equal(archiveRights(1876, undefined), "open");
  assert.equal(archiveRights(1930, undefined), "open");
  assert.equal(archiveRights(1955, undefined), "review");
  assert.equal(archiveRights(undefined, "http://creativecommons.org/publicdomain/mark/1.0/"), "open");
  assert.equal(archiveRights(undefined, undefined), "unknown");
});
