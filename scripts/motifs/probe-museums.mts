/**
 * Probe open museum APIs for Ukrainian embroidery before writing a collector for each: what they hold, how many
 * results, which licence fields they return. Writes data/motifs/probe/museums.json (a sample of each response).
 * Runs on a GitHub runner; the local sandbox cannot reach museum hosts.
 */
import { mkdirSync, writeFileSync } from "node:fs";

const UA = "ASCEND-motif-learner/0.1 (https://github.com/admytruk79-netizen/ascend-glyph-studio; provenance-first research)";
const probes: Record<string, string[]> = {
  openverse: ["https://api.openverse.org/v1/images/?q=ukrainian%20embroidery&license=by,by-sa,cc0,pdm&page_size=20", "https://api.openverse.org/v1/images/?q=%D0%B2%D0%B8%D1%88%D0%B8%D0%B2%D0%BA%D0%B0&license=by,by-sa,cc0,pdm&page_size=20",
    "https://api.openverse.org/v1/images/?q=ukrainian%20cross%20stitch%20pattern&license=by,by-sa,cc0,pdm&page_size=20"],
  zenodo: ["https://zenodo.org/api/records?q=ukrainian%20embroidery&size=10", "https://zenodo.org/api/records?q=vyshyvanka&size=10"],
  huggingface: ["https://huggingface.co/api/datasets?search=embroidery&limit=50&full=true", "https://huggingface.co/api/datasets?search=ukrainian&limit=50"],
  "ukrfolk-omeka": ["https://collections.ukrfolk.ca/api/items?search=embroidery&per_page=5", "https://collections.ukrfolk.ca/api/items/5252", "https://collections.ukrfolk.ca/items/show/5252"],
  horniman: ["https://www.horniman.ac.uk/object/nn12579.1/"],
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
