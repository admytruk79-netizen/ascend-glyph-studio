/**
 * Probe open museum APIs for Ukrainian embroidery before writing a collector for each: what they hold, how many
 * results, which licence fields they return. Writes data/motifs/probe/museums.json (a sample of each response).
 * Runs on a GitHub runner; the local sandbox cannot reach museum hosts.
 */
import { writeFileSync } from "node:fs";

const UA = "ASCEND-motif-learner/0.1 (https://github.com/admytruk79-netizen/ascend-glyph-studio; provenance-first research)";
const probes: Record<string, string[]> = {
  "museums-victoria": ["https://collections.museumsvictoria.com.au/api/search?query=ukrainian+embroidery&hasimages=yes&perpage=5", "https://collections.museumsvictoria.com.au/api/search?query=ukrainian&hasimages=yes&perpage=1"],
  finna: ["https://api.finna.fi/v1/search?lookfor=ukrainalainen&filter[]=online_boolean:1&limit=5&field[]=id&field[]=title&field[]=imageRights&field[]=images&field[]=subjects&field[]=geographicSubjects&field[]=summary&field[]=buildings&field[]=formats",
    "https://api.finna.fi/v1/search?lookfor=ukrainian+embroidery&filter[]=online_boolean:1&limit=5&field[]=id&field[]=title&field[]=imageRights&field[]=images"],
  mia: ["https://search.artsmia.org/ukrainian%20embroidery", "https://search.artsmia.org/ukraine"],
  auckland: ["https://api.aucklandmuseum.com/search/collectionsonline/_search?q=ukrainian&size=5"],
  wellcome: ["https://api.wellcomecollection.org/catalogue/v2/works?query=ukrainian%20embroidery&include=items,subjects&pageSize=5", "https://api.wellcomecollection.org/catalogue/v2/images?query=ukrainian%20embroidery&pageSize=5"],
  rijksmuseum: ["https://data.rijksmuseum.nl/search/collection?description=oekra%C3%AFne&type=borduurwerk", "https://data.rijksmuseum.nl/search/collection?title=Oekra%C3%AFens"],
  "digitaltmuseum": ["https://api.dimu.org/api/solr/select?q=ukrainsk+brodering&wt=json&rows=5&api.key=demo", "https://api.dimu.org/api/solr/select?q=ukraina&wt=json&rows=5&api.key=demo"],
  "yale-lux": ["https://lux.collections.yale.edu/api/search/item?q=%7B%22text%22%3A%22ukrainian%20embroidery%22%7D"],
  "hathitrust": ["https://catalog.hathitrust.org/api/volumes/brief/oclc/4766036.json"],
  "polona": ["https://polona.pl/api/entities/?query=haft%20ukrai%C5%84ski&size=5"],
  "harvard": ["https://api.harvardartmuseums.org/object?keyword=ukrainian&size=5"],
  "va": ["https://api.vam.ac.uk/v2/objects/search?q=ukrainian%20embroidery&page_size=5&images_exist=1"],
  "cma-check": ["https://openaccess-api.clevelandart.org/api/artworks/?q=ukrainian&has_image=1&limit=5&cc0"],
};
const out: Record<string, unknown> = {};
for (const [name, urls] of Object.entries(probes)) {
  out[name] = await Promise.all(urls.map(async (url) => {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json, application/ld+json;q=0.9, */*;q=0.5" }, signal: AbortSignal.timeout(30000) });
      const body = await r.text();
      return { url, status: r.status, type: r.headers.get("content-type"), length: body.length, sample: body.slice(0, 6000) };
    } catch (e) { return { url, error: String(e) }; }
  }));
  console.log(name, JSON.stringify((out[name] as any[]).map((p) => p.status ?? p.error)));
}
writeFileSync("data/motifs/probe/museums.json", JSON.stringify(out, null, 1) + "\n");
