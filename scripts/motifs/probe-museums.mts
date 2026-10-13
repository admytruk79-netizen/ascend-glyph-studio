/**
 * Probe open museum APIs for Ukrainian embroidery before writing a collector for each: what they hold, how many
 * results, which licence fields they return. Writes data/motifs/probe/museums.json (a sample of each response).
 * Runs on a GitHub runner; the local sandbox cannot reach museum hosts.
 */
import { mkdirSync, writeFileSync } from "node:fs";

const UA = "ASCEND-motif-learner/0.1 (https://github.com/admytruk79-netizen/ascend-glyph-studio; provenance-first research)";
const probes: Record<string, string[]> = {
  "museum-digital-ua-object": ["https://ua.museum-digital.org/json/object/24349", "https://ua.museum-digital.org/json/object/1098"],
  "museum-digital-ua-paging": ["https://ua.museum-digital.org/json/objects?s=%D0%B2%D0%B8%D1%88%D0%B8%D0%B2%D0%BA%D0%B0&startwert=24", "https://ua.museum-digital.org/json/objects?s=%D0%B2%D0%B8%D1%88%D0%B8%D0%B2%D0%BA%D0%B0&gbreitenat=100&startwert=0",
    "https://ua.museum-digital.org/json/objects?s=%D1%80%D1%83%D1%88%D0%BD%D0%B8%D0%BA", "https://ua.museum-digital.org/json/institutions"],
};
const out: Record<string, unknown> = {};
for (const [name, urls] of Object.entries(probes)) {
  out[name] = await Promise.all(urls.map(async (url) => {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json, application/ld+json;q=0.9, */*;q=0.5" }, signal: AbortSignal.timeout(30000) });
      const body = await r.text();
      return { url, status: r.status, type: r.headers.get("content-type"), length: body.length, sample: body.slice(0, 12000) };
    } catch (e) { return { url, error: String(e) }; }
  }));
  console.log(name, JSON.stringify((out[name] as any[]).map((p) => p.status ?? p.error)));
}
mkdirSync("data/motifs/probe", { recursive: true });
writeFileSync("data/motifs/probe/museums.json", JSON.stringify(out, null, 1) + "\n");
