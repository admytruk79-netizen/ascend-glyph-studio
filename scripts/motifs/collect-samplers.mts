/**
 * English samplers → counted-motif records for review (the second tradition, so the motif learner can blend).
 * Runs on a GitHub runner, like the Ukrainian collector, with the same rules:
 *  - licence must be public domain, CC0, CC BY or CC BY-SA; anything else is listed and skipped;
 *  - "English" only from the object's own culture, place or title (England or a British place), never from the search
 *    words. "New England" and American samplers do not count; Scottish and Welsh pieces are flagged for a person;
 *  - images are read in memory, never stored; every record stays culturalAccess "review" until a person keeps it.
 * Sources: the Met, Art Institute of Chicago, Cleveland Museum of Art (all keyless open access), Wikimedia Commons,
 * Openverse (CC-licensed shared photos), Europeana (demo key) and the Smithsonian when SI_API_KEY is set.
 * Output: data/motifs/samplers/ (candidates.json, public-motifs.unreviewed.json, review-sheet.svg).
 */
import { collector, finish, get, series, sleep, type Candidate } from "./lib/collect.mts";

const { candidates, add } = collector();

// English attribution from the object's own fields. Language labels ("English: …") and New England are not places in England.
const EN = /\bengland\b|\benglish\b|\bbritain\b|\bbritish\b|united kingdom|\blondon\b|yorkshire|lancashire|norfolk|suffolk|\bkent\b|devon|cornwall|bristol|sussex|essex|surrey|cumberland|westmorland|northumberland|lincolnshire|derbyshire|nottingham|leicester|warwick|birmingham|manchester|liverpool|cheshire|somerset|dorset|wiltshire|hampshire|\bscotland\b|scottish|\bwales\b|welsh/i;
const clean = (s: string) => s.replace(/\bnew england\b|\bnew london\b|\bEnglish\s*:/gi, " ");
const english = (...fields: (string | undefined | null)[]) => fields.find((f) => f && EN.test(clean(f))) ?? null;
const SAMPLER = /sampler|needlework|embroider|cross.?stitch|needlepoint|canvas ?work|berlin wool|blackwork|marking/i;
const PEOPLE = /portrait|photograph of|wearing|\bgirl\b|\bwoman\b|\bwomen\b/i;

// ---------- source: the Met (Open Access, keyless) ----------
async function fromMet() {
  const API = "https://collectionapi.metmuseum.org/public/collection/v1", ids = new Set<number>();
  const idsOf = (res: any): number[] => ((res?.objectIDs ?? res?.results ?? res?.data ?? res?.objects ?? []) as any[]).map((x) => (typeof x === "number" ? x : Number(x?.objectID ?? x?.id))).filter((n) => Number.isFinite(n));
  for (const q of ["sampler", "English sampler", "British sampler", "band sampler", "needlework sampler", "embroidered sampler"]) for (let offset = 0; offset < 800; offset += 100) {
    const page = idsOf(await get(`${API.replace("/v1", "/v1.1")}/search?hasImages=true&q=${encodeURIComponent(q)}&offset=${offset}&limit=100`));
    page.forEach((id) => ids.add(id)); await sleep(150);
    if (page.length < 100) break;
  }
  console.log(`met: ${ids.size} object ids`);
  for (const id of ids) {
    const o = await get(`${API}/objects/${id}`).catch(() => null); await sleep(100);
    if (!o?.primaryImage) continue;
    const own = english(o.culture, o.country, o.region, o.county, o.state, o.city, o.title);
    add({ id: `met-${id}`, source: "met", title: `${o.title ?? ""} (${o.objectDate ?? ""})`.slice(0, 200), pageUrl: o.objectURL ?? "", imageUrl: o.primaryImage,
      licenceText: o.isPublicDomain ? "public domain (Met Open Access)" : "not public domain", evidence: own ? `culture/place/title: ${own}` : null,
      group: `met:${id}`, note: `${o.objectName ?? ""} · ${o.classification ?? ""} · ${o.medium ?? ""}`.slice(0, 200) });
  }
}

// ---------- source: Art Institute of Chicago ----------
async function fromAic() {
  const fields = "id,title,place_of_origin,image_id,medium_display,classification_title,is_public_domain,date_display";
  for (const q of ["sampler", "English sampler", "British sampler", "English embroidery"]) for (let page = 1; page <= 5; page++) {
    const r = await get(`https://api.artic.edu/api/v1/artworks/search?q=${encodeURIComponent(q)}&query[term][is_public_domain]=true&limit=100&page=${page}&fields=${fields}`);
    const rows = r?.data ?? []; if (!rows.length) break;
    for (const x of rows) {
      if (!x.image_id || !x.is_public_domain) continue;
      const own = english(x.place_of_origin, x.title);
      add({ id: `aic-${x.id}`, source: "aic", title: `${x.title} (${x.date_display ?? ""})`, pageUrl: `https://www.artic.edu/artworks/${x.id}`, imageUrl: `https://www.artic.edu/iiif/2/${x.image_id}/full/1686,/0/default.jpg`,
        licenceText: "CC0 public domain (AIC)", evidence: own ? `place/title: ${own}` : null, group: `aic:${x.id}`, note: `${x.medium_display ?? ""} · ${x.classification_title ?? ""}` });
    }
    await sleep(300);
  }
}

// ---------- source: Cleveland Museum of Art ----------
async function fromCleveland() {
  for (const q of ["sampler", "English embroidery"]) for (let skip = 0; skip < 1000; skip += 100) {
    const r = await get(`https://openaccess-api.clevelandart.org/api/artworks/?q=${encodeURIComponent(q)}&has_image=1&cc0=1&limit=100&skip=${skip}`);
    const rows = r?.data ?? []; if (!rows.length) break;
    for (const x of rows) {
      const img = x.images?.print?.url ?? x.images?.web?.url; if (!img) continue;
      const own = english((x.culture ?? []).join("; "), x.title);
      add({ id: `cma-${x.id}`, source: "cma", title: `${x.title} (${x.creation_date ?? ""})`, pageUrl: x.url ?? "", imageUrl: img, licenceText: "CC0 (Cleveland Museum of Art Open Access)",
        evidence: own ? `culture/title: ${own}` : null, group: `cma:${x.id}`, note: `${x.technique ?? ""} · ${x.type ?? ""}` });
    }
    await sleep(300);
  }
}

// ---------- source: Wikimedia Commons (categories found by name, then file search) ----------
const COMMONS = "https://commons.wikimedia.org/w/api.php?format=json&formatversion=2&origin=*";
const strip = (s?: { value?: string }) => (s?.value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const fileInfo = (p: any, via: string) => {
  const ii = p.imageinfo?.[0]; if (!ii) return;
  const m = ii.extmetadata ?? {}, title = String(p.title ?? "").replace(/^File:/, ""), desc = strip(m.ImageDescription), cats = strip(m.Categories);
  const own = english(title, desc, cats);
  add({ id: `commons-${p.pageid}`, source: "commons", title, pageUrl: ii.descriptionurl ?? "", imageUrl: ii.thumburl ?? ii.url, licenceText: `${strip(m.LicenseShortName)} ${strip(m.UsageTerms)} ${strip(m.License)}`,
    evidence: own ? `title/description/categories: ${clean(own).slice(0, 160)}` : null, group: `commons:${series(title)}`, note: `found via ${via}` });
};
async function fromCommons() {
  const queue: [string, number][] = [], seen = new Set<string>();
  for (const term of ["Samplers (embroidery)", "English samplers", "Embroidered samplers", "Samplers in the United Kingdom", "Needlework samplers", "Band samplers"]) {
    const r = await get(`${COMMONS}&${new URLSearchParams({ action: "query", list: "search", srsearch: term, srnamespace: "14", srlimit: "20" })}`);
    for (const h of r?.query?.search ?? []) queue.push([String(h.title).replace(/^Category:/, ""), 0]);
    await sleep(200);
  }
  while (queue.length && seen.size < 200) {
    const [cat, depth] = queue.shift()!; if (seen.has(cat)) continue; seen.add(cat);
    let cont: any = {};
    do {
      const r = await get(`${COMMONS}&${new URLSearchParams({ action: "query", generator: "categorymembers", gcmtitle: `Category:${cat}`, gcmtype: "file", gcmlimit: "50", prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: "1600", ...cont })}`); if (!r) break;
      for (const p of r.query?.pages ?? []) fileInfo(p, `Category:${cat}`);
      cont = r.continue ?? null; await sleep(200);
    } while (cont);
    if (depth < 1) {
      const r = await get(`${COMMONS}&${new URLSearchParams({ action: "query", list: "categorymembers", cmtitle: `Category:${cat}`, cmtype: "subcat", cmlimit: "100" })}`);
      for (const s of r?.query?.categorymembers ?? []) queue.push([String(s.title).replace(/^Category:/, ""), depth + 1]);
    }
  }
  for (const term of ["English sampler embroidery", "sampler England needlework", "band sampler 17th century", "Georgian sampler", "Victorian sampler cross stitch", "British sampler embroidery"]) for (let offset = 0; offset < 300; offset += 50) {
    const r = await get(`${COMMONS}&${new URLSearchParams({ action: "query", generator: "search", gsrsearch: term, gsrnamespace: "6", gsrlimit: "50", gsroffset: String(offset), prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: "1600" })}`);
    if (!r?.query) break;
    for (const p of r.query.pages ?? []) fileInfo(p, `search "${term}"`);
    if (!r.continue) break; await sleep(200);
  }
  console.log(`commons: ${seen.size} categories walked`);
}

// ---------- source: Openverse (CC-licensed photos people shared; Commons is crawled directly above) ----------
async function fromOpenverse() {
  for (const q of ["english sampler embroidery", "needlework sampler", "antique sampler cross stitch", "victorian sampler", "georgian sampler", "british sampler"]) for (let page = 1; page <= 10; page++) {
    const r = await get(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&license=by,by-sa,cc0,pdm&page_size=20&page=${page}`);
    const rows = r?.results ?? []; if (!rows.length) break;
    for (const x of rows) {
      if (x.source === "wikimedia" || !x.url) continue;
      const text = [x.title, (x.tags ?? []).map((t: any) => t.name).join(" ")].join(" "), own = english(text);
      add({ id: `openverse-${x.id}`, source: `openverse-${x.source}`, title: String(x.title ?? "").slice(0, 200), pageUrl: x.foreign_landing_url ?? "", imageUrl: x.url,
        licenceText: `${x.license ?? ""} ${x.license_version ?? ""} ${x.license_url ?? ""}`, evidence: own ? `title/tags: ${clean(own).slice(0, 160)}` : null,
        group: `openverse:${x.source}:${x.creator ?? "?"}`, note: `shared by ${x.creator ?? "?"} on ${x.source}; ${x.attribution ?? ""}`.slice(0, 300) });
    }
    if (page >= (r?.page_count ?? 0)) break;
    await sleep(1500);
  }
}

// ---------- source: Europeana (open reuse only) ----------
async function fromEuropeana() {
  const key = process.env.EUROPEANA_API_KEY || "api2demo", pages = process.env.EUROPEANA_API_KEY ? 5 : 1;
  for (const q of ["sampler England", "English sampler", "needlework sampler", "merklap Engeland"]) {
    let cursor = "*";
    for (let i = 0; i < pages && cursor; i++) {
      const r = await get(`https://api.europeana.eu/record/v2/search.json?wskey=${key}&query=${encodeURIComponent(q)}&reusability=open&media=true&rows=100&profile=rich&cursor=${encodeURIComponent(cursor)}`);
      for (const x of r?.items ?? []) {
        const img = x.edmIsShownBy?.[0]; if (!img) continue;
        const lang = (o: any) => (o ? Object.values(o).flat().join(" ") : "");
        const own = english(x.title?.join(" "), x.dcDescription?.join(" "), lang(x.dcSubjectLangAware), lang(x.edmPlaceLabelLangAware));
        add({ id: `europeana-${String(x.id).replace(/[^A-Za-z0-9]+/g, "-").replace(/^-/, "").slice(0, 80)}`, source: "europeana", title: String(x.title?.[0] ?? "").slice(0, 200), pageUrl: x.guid ?? "", imageUrl: img,
          licenceText: x.rights?.[0] ?? "", evidence: own ? `title/description/subject/place: ${clean(own).replace(/\s+/g, " ").slice(0, 140)}` : null,
          group: `europeana:${x.dataProvider?.[0] ?? ""}:${series(String(x.title?.[0] ?? x.id))}`, note: `provider ${x.dataProvider?.[0] ?? "?"}, ${x.country?.[0] ?? "?"}; type ${x.type ?? ""}` });
      }
      cursor = r?.nextCursor ?? ""; await sleep(1200);
    }
  }
}

// ---------- source: Smithsonian, including Cooper Hewitt (only with SI_API_KEY) ----------
async function fromSmithsonian() {
  const key = process.env.SI_API_KEY; if (!key) { console.log("smithsonian: no SI_API_KEY, skipped"); return; }
  for (const q of ["english sampler", "british sampler", "sampler england"]) for (let start = 0; start < 500; start += 100) {
    const r = await get(`https://api.si.edu/openaccess/api/v1.0/search?q=${encodeURIComponent(q)}&start=${start}&rows=100&api_key=${key}`);
    const rows = r?.response?.rows ?? []; if (!rows.length) break;
    for (const x of rows) {
      const media = (x.content?.descriptiveNonRepeating?.online_media?.media ?? []).find((m: any) => /CC0/i.test(m.usage?.access ?? "")); if (!media) continue;
      const own = english(JSON.stringify(x.content?.freetext?.place ?? ""), JSON.stringify(x.content?.indexedStructured?.geoLocation ?? ""), x.title);
      add({ id: `si-${x.id}`, source: "smithsonian", title: String(x.title ?? "").slice(0, 200), pageUrl: x.content?.descriptiveNonRepeating?.record_link ?? "", imageUrl: media.content,
        licenceText: "CC0 (Smithsonian Open Access)", evidence: own ? `place/title: ${clean(own).slice(0, 140)}` : null, group: `si:${x.id}` });
    }
    await sleep(300);
  }
}

// ---------- run ----------
for (const [name, fn] of [["met", fromMet], ["aic", fromAic], ["cleveland", fromCleveland], ["commons", fromCommons], ["openverse", fromOpenverse], ["europeana", fromEuropeana], ["smithsonian", fromSmithsonian]] as const) {
  try { await fn(); } catch (e) { console.error(`${name} failed:`, String(e)); }
}
await finish(candidates, {
  out: "data/motifs/samplers", tradition: "English", evidenceLabel: "English evidence", noAttributionStatus: "no-english-attribution-in-own-metadata",
  flags: (c: Candidate) => (/scotland|scottish|\bwales\b|welsh/i.test(c.evidence ?? "") ? ["scottish-or-welsh-check-attribution"] : []),
  skip: (r) => (PEOPLE.test(r.title) ? "photo-of-people" : !SAMPLER.test(`${r.title} ${r.note ?? ""} ${r.evidence ?? ""}`) ? "not-sampler-or-needlework" : null),
});
