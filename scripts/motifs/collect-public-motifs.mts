/**
 * Every publicly usable Ukrainian ornament/embroidery image we can reach → counted-motif records for review.
 * Runs on a GitHub runner (museum hosts are reachable there; Neon via TESSERACT_DATABASE_URL, read-only).
 *
 * Sources: the Neon research corpus (Commons files, Internet Archive pages), Wikimedia Commons (categories + file
 * search, licence from each file's own metadata), Art Institute of Chicago (public domain), Cleveland Museum of Art (CC0),
 * Library of Congress (no known restrictions), Internet Archive pattern books published before 1929, NYPL Digital
 * Collections (public domain), Finna (Finnish museums and archives), DigitaltMuseum (Swedish and Norwegian museums), and,
 * when their API keys are configured, Europeana (open reuse) and Smithsonian (CC0).
 *
 * Rules:
 *  - licence must be public domain, CC0, CC BY or CC BY-SA (any version); NC / ND / unknown are listed and skipped;
 *  - "Ukrainian" only from the item's own title, culture, place or categories, never from the words we searched with;
 *  - photographs of people wearing embroidery are skipped; places now in Russia are flagged for a human decision;
 *  - images are read in memory, never stored; a plate holding several motifs becomes one record per motif;
 *  - every record has culturalAccess "review": nothing trains on it until a person checks it.
 *
 * Output (data/motifs/public/): candidates.json (everything seen + status), public-motifs.unreviewed.json, review-sheet.svg
 */
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { extractGrid } from "../../packages/motif-learner/src/extract.ts";
import { blank, crop, density, parseChart, toChart, toSvg, type Grid } from "../../packages/motif-learner/src/grid.ts";
import { detectSymmetry } from "../../packages/motif-learner/src/symmetry.ts";
import type { MotifRecord } from "../../packages/motif-learner/src/model.ts";

const OUT = "data/motifs/public";
const MAX_MINUTES = Number(process.env.COLLECT_MAX_MINUTES ?? 150);
const MAX_IMAGES = Number(process.env.COLLECT_MAX_IMAGES ?? 15000);
const UA_HEADER = "ASCEND-motif-learner/0.1 (https://github.com/admytruk79-netizen/ascend-glyph-studio; provenance-first research)";
const started = Date.now(), minutes = () => (Date.now() - started) / 60000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function get(url: string, asJson = true): Promise<any> {
  for (let i = 0; ; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA_HEADER, "AIC-User-Agent": UA_HEADER } });
      if (r.status === 404 || r.status === 410) return null;
      if (r.status === 429 || r.status >= 500) throw new Error(`HTTP ${r.status}`);
      if (!r.ok) return null;
      return asJson ? await r.json() : Buffer.from(await r.arrayBuffer());
    } catch (e) { if (i >= 3) throw e; await sleep(2500 * (i + 1)); }
  }
}

// ---------- evidence, licence, flags ----------
const UA = /малорос|малорус|южнорус|южно-рус|malorus|little russia|ukrai[nń]|ukrajin|україн|украин|ucrain|ruthen|руськ|hutsul|huculsk|huzul|гуцул|poltav|полтав|podil|поділ|подол|bukovyn|буковин|volyn|волин|kyiv|київ|kiev|chernihiv|чернігів|lviv|львів|galici|галич|polissia|полісс|slobo|слобож|вишив|вишит|рушник|vyshyv|rushnyk|писанк|pysank/i;
// a record that names a place in Ukraine (oblast, region, ОТГ hromada) is attributed by its own metadata too;
// such records must still name an ornament or garment themselves, not just through the search that found them
const UA_PLACE = /вінниц|vinnyts|житомир|zhytomyr|закарпат|zakarpat|transcarpath|запоріж|zaporiz|івано-франків|ivano-frankiv|кіровоград|kirovohrad|кропивниц|kropyvnyts|луганськ|luhansk|миколаївськ|миколаївщин|mykolaiv|одеськ|одещин|odesa|рівнен|rivne|сумськ|сумщин|тернопіл|ternopil|харків|kharkiv|херсон|kherson|хмельниц|khmelnyts|черкас|cherkas|чернівец|чернівц|chernivts|дніпропетров|дніпров|dnipro|донецьк|донеччин|покутт|pokut|бойків|бойки|boyko|(?<![а-яіїєґ])ОТГ(?![а-яіїєґ])|територіальн\S* громад/i;
const RUSSIA = /белгород|belgorod|шебекин|shebekin|курск|kursk|воронеж|voronezh|брянск|bryansk/i;
const PEOPLE = /festival|фестивал|couple|patron|parade|roundelay|toronto|girl|дівчин|україночк|woman|women|man in|men in|portrait|портрет|wearing|одягн|день вишиванки|vyshyvanka day|парад|march|марш|selfie|actor|singer|politician/i;
const ORNAMENT = /embroider|haft|koszul|stickerei|hemd|výšiv|vysiv|blouse|costume|kostium|tracht|cămaș|camas|cămeș|cames|altiț|altit|broderi|плахт|запаск|спідниц|фартух|попередниц|керсетк|корсетк|кептар|сердак|безрукавк|plakht|plachta|zapask|kersetk|keptar|kieptar|serdak|apron|skirt|\bvests?\b|fartuch|spódnic|kamizel|schürze|zástěr|sukn|вишив|вишит|рушник|сорочк|хрестик|cross.?stitch|орнамент|ornament|узор|візерун|пояс|sash|textile|towel|shirt|sampler|пис[аа]нк|pysank|pattern|design|мотив|motif|ткан|weav|kilim|килим|brodyr|broderad|brodert|bunad|dräkt|drakt|handduk|skjorta|\bblus|kirjont|kirjail|pyyhe|paita|kansanpuku|textil|tekstil|mönster|kuvio/i;

type Licence = "public-domain" | "CC0" | "CC-BY" | "CC-BY-SA";
function licenceOf(text: string | undefined | null): Licence | null {
  const t = (text ?? "").toLowerCase();
  if (!t) return null;
  if (/\bnc\b|non-?commercial|\bnd\b|no-?deriv/.test(t)) return null;
  if (/cc0|publicdomain\/zero/.test(t)) return "CC0";
  if (/public domain|publicdomain|\bpd\b|pd-|\bpdm\b/.test(t)) return "public-domain";
  if (/by-sa|by sa|sharealike|share-alike/.test(t)) return "CC-BY-SA";
  if (/cc[- ]by|creativecommons\.org\/licenses\/by\//.test(t)) return "CC-BY";
  return null;
}

interface Candidate { id: string; source: string; title: string; pageUrl: string; imageUrl: string; licenceText: string; evidence: string | null; group: string; note?: string }
const candidates = new Map<string, Candidate>();
const add = (c: Candidate) => { if (c.imageUrl && !candidates.has(c.id)) candidates.set(c.id, c); };
const series = (title: string) => title.replace(/\.(jpe?g|png|tiff?|gif|webp)$/i, "").replace(/[\s_\-.(]*\(?\d+[a-z]?\)?$/i, "").trim().toLowerCase();

// ---------- source: Neon corpus ----------
async function fromNeon() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.log("neon: no DATABASE_URL, skipped"); return; }
  const pg = (await import("pg")).default;
  const db = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } }); // as scripts/train/train-tesseract.mts
  await db.connect();
  try {
    const { rows } = await db.query(`select id, title, source_url, image_url, rights from research_corpus_object
      where image_url is not null and (tradition ilike '%ukrain%' or title ~* $1)`, [UA.source]);
    for (const r of rows as any[]) {
      const book = r.id.startsWith("ia-") ? String(r.title).replace(/, page \d+$/, "") : null;
      add({ id: r.id, source: r.id.split("-")[0], title: r.title ?? "", pageUrl: r.source_url ?? "", imageUrl: r.image_url, licenceText: r.rights ?? "",
        evidence: UA.test(r.title ?? "") ? `title: ${r.title}` : null, group: book ? `ia:${book}` : `${r.id.split("-")[0]}:${series(r.title ?? r.id)}` });
    }
    console.log(`neon: ${rows.length} rows`);
  } finally { await db.end(); }
}

// ---------- source: Wikimedia Commons ----------
const COMMONS = "https://commons.wikimedia.org/w/api.php?format=json&formatversion=2&origin=*";
const ROOT_CATEGORIES = ["Embroidery of Ukraine", "Rushnyky", "Vyshyvanka", "Ukrainian embroidery", "Ornaments of Ukraine", "Ukrainian ornaments", "Embroidered shirts of Ukraine", "Cross-stitch in Ukraine", "Pysanky", "Ukrainian folk art", "Textiles of Ukraine", "Motifs of Ukrainian ornament", "Мотиви українського орнаменту",
  // shirts and museum collections (vyshyvanka focus)
  "Vyshyvankas", "Embroidered shirts", "Ukrainian embroidered shirts", "Folk costumes of Ukraine", "Ukrainian folk costume", "Ukrainian national costume",
  "Ivan Honchar Museum", "National Museum of Ukrainian Folk Decorative Art", "Embroidery in museums of Ukraine", "Rushnyky in museums", "Ukrainian women's shirts", "Sorochka",
  // skirts, aprons and vests of the Ukrainian costume
  "Plakhta", "Zapaska", "Kersetka", "Keptar", "Keptars", "Aprons of Ukraine", "Skirts of Ukraine", "Vests of Ukraine", "Hutsul costume", "Ukrainian folk clothing"];
// collections of Ukrainian museums on Commons: found by searching category names, then walked one level down
const MUSEUM_CATEGORY_SEARCHES = ["музей вишивки", "музей рушника", "музей народного мистецтва", "музей етнографії", "музей народної архітектури та побуту", "музей гуцульщини", "Museum of Hutsul", "Museum of Ethnography and Crafts",
  "Pyrohiv museum", "Pereiaslav museum", "Museum of Ukrainian Folk Decorative Art", "Ivan Honchar Museum", "Kolomyia museum", "Lviv Museum of Ethnography", "Poltava Local Lore Museum", "Chernihiv museum", "краєзнавчий музей вишивка",
  "Exhibits in museums of Ukraine", "Embroidery in museums", "Ukrainian ornament album", "орнамент український альбом"];
const SEARCHES = ["Мотиви українського орнаменту", "український орнамент", "українська вишивка", "вишивка хрестиком", "рушник вишитий", "вишиванка орнамент", "Ukrainian embroidery pattern", "Ukrainian cross-stitch", "Ukrainian ornament", "Hutsul embroidery", "Poltava embroidery", "Podillia embroidery",
  "вишиванка", "сорочка вишита", "вишита сорочка", "жіноча сорочка вишивка", "чоловіча сорочка вишита", "вишита сорочка музей", "уставка сорочки", "Ukrainian embroidered shirt", "vyshyvanka museum", "Ukrainian blouse embroidery",
  "плахта", "запаска", "спідниця вишита", "фартух вишитий", "попередниця", "керсетка", "корсетка", "кептар", "сердак", "безрукавка вишита",
  "Український народний орнамент", "Пчілка орнамент", "народний орнамент вишивки", "орнамент рушника", "малоросійський орнамент", "южнорусский орнамент", "Ukrainian folk ornament album",
  "plakhta", "Ukrainian apron embroidery", "Ukrainian skirt", "Hutsul keptar", "Ukrainian vest embroidered"];
const fileInfo = (p: any, via: string) => {
  const ii = p.imageinfo?.[0]; if (!ii) return;
  const m = ii.extmetadata ?? {}, strip = (s?: { value?: string }) => (s?.value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const title = String(p.title ?? "").replace(/^File:/, ""), desc = strip(m.ImageDescription), cats = strip(m.Categories);
  const own = [title, desc, cats].find((s) => UA.test(s)), place = own ? undefined : [title, desc, cats].find((s) => UA_PLACE.test(s));
  if (place) return add({ id: `commons-${p.pageid}`, source: "commons", title, pageUrl: ii.descriptionurl ?? "", imageUrl: ii.thumburl ?? ii.url, licenceText: `${strip(m.LicenseShortName)} ${strip(m.UsageTerms)} ${strip(m.License)}`,
    evidence: `place in Ukraine in ${place === title ? "title" : place === desc ? "description" : "categories"}: ${place.slice(0, 160)}`, group: `commons:${series(title)}`, note: `found via ${via}` });
  add({ id: `commons-${p.pageid}`, source: "commons", title, pageUrl: ii.descriptionurl ?? "", imageUrl: ii.thumburl ?? ii.url, licenceText: `${strip(m.LicenseShortName)} ${strip(m.UsageTerms)} ${strip(m.License)}`,
    evidence: own ? `${own === title ? "title" : own === desc ? "description" : "categories"}: ${own.slice(0, 160)}` : null, group: `commons:${series(title)}`, note: `found via ${via}` });
};
async function fromCommons() {
  const seen = new Set<string>(), queue: [string, number][] = ROOT_CATEGORIES.map((c) => [c, 0]);
  for (const term of MUSEUM_CATEGORY_SEARCHES) {
    const r = await get(`${COMMONS}&${new URLSearchParams({ action: "query", list: "search", srsearch: term, srnamespace: "14", srlimit: "30" })}`);
    for (const h of r?.query?.search ?? []) queue.push([String(h.title).replace(/^Category:/, ""), 1]);
    await sleep(200);
  }
  while (queue.length && seen.size < 900 && candidates.size < MAX_IMAGES) {
    const [cat, depth] = queue.shift()!;
    if (seen.has(cat)) continue; seen.add(cat);
    let cont: any = {};
    do {
      const q = new URLSearchParams({ action: "query", generator: "categorymembers", gcmtitle: `Category:${cat}`, gcmtype: "file", gcmlimit: "50", prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: "1600", ...cont });
      const r = await get(`${COMMONS}&${q}`); if (!r) break;
      for (const p of r.query?.pages ?? []) fileInfo(p, `Category:${cat}`);
      cont = r.continue ?? null; await sleep(200);
    } while (cont && candidates.size < MAX_IMAGES);
    if (depth < 2) {
      const r = await get(`${COMMONS}&${new URLSearchParams({ action: "query", list: "categorymembers", cmtitle: `Category:${cat}`, cmtype: "subcat", cmlimit: "200" })}`);
      for (const s of r?.query?.categorymembers ?? []) queue.push([String(s.title).replace(/^Category:/, ""), depth + 1]);
    }
  }
  for (const term of SEARCHES) {
    for (let offset = 0; offset < 500; offset += 50) {
      const q = new URLSearchParams({ action: "query", generator: "search", gsrsearch: term, gsrnamespace: "6", gsrlimit: "50", gsroffset: String(offset), prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: "1600" });
      const r = await get(`${COMMONS}&${q}`); if (!r?.query) break;
      for (const p of r.query.pages ?? []) fileInfo(p, `search "${term}"`);
      if (!r.continue) break; await sleep(200);
    }
  }
  console.log(`commons: ${seen.size} categories walked, ${candidates.size} candidates so far`);
}

// ---------- source: Art Institute of Chicago ----------
async function fromAic() {
  const fields = "id,title,place_of_origin,image_id,medium_display,classification_title,is_public_domain,date_display";
  for (const q of ["Ukraine", "Ukrainian", "Ruthenian", "Hutsul"]) for (let page = 1; page <= 5; page++) {
    const r = await get(`https://api.artic.edu/api/v1/artworks/search?q=${encodeURIComponent(q)}&query[term][is_public_domain]=true&limit=100&page=${page}&fields=${fields}`);
    const rows = r?.data ?? []; if (!rows.length) break;
    for (const x of rows) {
      if (!x.image_id || !x.is_public_domain) continue;
      const own = [x.place_of_origin, x.title].find((s: string) => s && UA.test(s));
      add({ id: `aic-${x.id}`, source: "aic", title: `${x.title} (${x.date_display ?? ""})`, pageUrl: `https://www.artic.edu/artworks/${x.id}`, imageUrl: `https://www.artic.edu/iiif/2/${x.image_id}/full/1686,/0/default.jpg`,
        licenceText: "CC0 public domain (AIC)", evidence: own ? `place/title: ${own}` : null, group: `aic:${x.id}`, note: `${x.medium_display ?? ""} · ${x.classification_title ?? ""}` });
    }
    await sleep(300);
  }
}

// ---------- source: Cleveland Museum of Art ----------
async function fromCleveland() {
  for (const q of ["Ukraine", "Ukrainian", "Ruthenian"]) for (let skip = 0; skip < 1000; skip += 100) {
    const r = await get(`https://openaccess-api.clevelandart.org/api/artworks/?q=${encodeURIComponent(q)}&has_image=1&cc0=1&limit=100&skip=${skip}`);
    const rows = r?.data ?? []; if (!rows.length) break;
    for (const x of rows) {
      const img = x.images?.print?.url ?? x.images?.web?.url; if (!img) continue;
      const culture = (x.culture ?? []).join("; "), own = [culture, x.title].find((s: string) => s && UA.test(s));
      add({ id: `cma-${x.id}`, source: "cma", title: `${x.title} (${x.creation_date ?? ""})`, pageUrl: x.url ?? "", imageUrl: img, licenceText: "CC0 (Cleveland Museum of Art Open Access)",
        evidence: own ? `culture/title: ${own}` : null, group: `cma:${x.id}`, note: `${x.technique ?? ""} · ${x.type ?? ""}` });
    }
    await sleep(300);
  }
}

// ---------- source: Library of Congress (keyless; "no known restrictions" items only) ----------
async function fromLoc() {
  for (const q of ["ukrainian embroidery", "ukrainian embroidered shirt", "ukrainian costume embroidery", "вишивка"]) for (let page = 1; page <= 3; page++) {
    const r = await get(`https://www.loc.gov/search/?q=${encodeURIComponent(q)}&fo=json&c=100&sp=${page}`);
    const rows = r?.results ?? []; if (!rows.length) break;
    for (const x of rows) {
      const img = (x.image_url ?? []).slice(-1)[0]; if (!img) continue;
      const rights = [x.rights_advisory, x.rights, x.item?.rights_advisory].flat().filter(Boolean).join(" ");
      const text = [x.title, (x.subject ?? []).join(" "), (x.location ?? []).join(" "), (x.description ?? []).join(" ")].join(" ");
      const own = UA.test(text) ? text.slice(0, 160) : null;
      add({ id: `loc-${String(x.id ?? x.url).replace(/[^A-Za-z0-9]+/g, "-").slice(-60)}`, source: "loc", title: String(x.title ?? "").slice(0, 200), pageUrl: x.url ?? x.id ?? "", imageUrl: img.split("#")[0],
        licenceText: /no known restrictions/i.test(rights) ? `public domain (LOC: ${rights.slice(0, 80)})` : rights || "unknown", evidence: own ? `title/subject/place: ${own}` : null, group: `loc:${series(String(x.title ?? x.id))}` });
    }
    await sleep(800);
  }
}

// ---------- source: Internet Archive embroidery pattern books (published before 1929) ----------
async function fromIaPatternBooks() {
  const q = encodeURIComponent('(вишивка OR вишивання OR узори OR вышивания OR "ukrainian embroidery" OR "ruthenian embroidery" OR "малороссийские узоры" OR орнамент OR орнаментъ OR "ukrainian ornament" OR "малорусский орнамент" OR "южнорусский орнамент") AND mediatype:texts AND year:[1800 TO 1928]');
  const r = await get(`https://archive.org/advancedsearch.php?q=${q}&fl[]=identifier&fl[]=title&fl[]=year&fl[]=imagecount&rows=200&output=json`);
  for (const d of r?.response?.docs ?? []) {
    const title = String(Array.isArray(d.title) ? d.title[0] : d.title ?? ""), pages = Math.min(Number(d.imagecount ?? 0) || 40, 80);
    if (!UA.test(title) || !/узор|вышив|вишив|орнамент|embroider|ornament/i.test(title)) continue;
    for (let n = 0; n < pages; n++) add({ id: `iab-${d.identifier}-p${n}`, source: "ia", title: `${title} (${d.year ?? ""}), page ${n}`, pageUrl: `https://archive.org/details/${d.identifier}/page/n${n}`,
      imageUrl: `https://archive.org/download/${d.identifier}/page/n${n}_w1600.jpg`, licenceText: `Published ${d.year}; public domain in the US`,
      evidence: UA.test(title) ? `title: ${title.slice(0, 120)}` : null, group: `ia:${d.identifier}` });
  }
}

// ---------- source: NYPL Digital Collections (public-domain items, IIIF manifests) ----------
const NYPL_ITEMS = ["a9d644f0-62d0-013b-76bb-0242ac110003", "a9395470-62d0-013b-fa13-0242ac110003"]; // Karagodina, Albom uzorov dlia vyshyvaniia (Odessa, 1895)
async function fromNypl() {
  for (const uuid of NYPL_ITEMS) {
    const m = await get(`https://api-collections.nypl.org/manifests/${uuid}`);
    if (!m) { console.log(`nypl: no manifest for ${uuid}`); continue; }
    const text = JSON.stringify(m), label = String(m.label?.en?.[0] ?? m.label ?? "NYPL item");
    const services = [...new Set([...text.matchAll(/https?:\/\/iiif\.nypl\.org\/iiif\/[23]\/[A-Za-z0-9._-]+/g)].map((x) => x[0]))];
    const own = /ukrain|україн|украин|odessa|одес/i.test(text) ? "NYPL catalogue metadata (Ukrainian; Odessa 1895)" : null;
    services.forEach((svc, n) => add({ id: `nypl-${uuid.slice(0, 8)}-p${n}`, source: "nypl", title: `${label}, plate ${n + 1}`, pageUrl: `https://digitalcollections.nypl.org/items/${uuid}`,
      imageUrl: `${svc}/full/1600,/0/default.jpg`, licenceText: "public domain in the US (NYPL)", evidence: own, group: `nypl:${uuid}` }));
    console.log(`nypl: ${services.length} images in ${uuid}`);
  }
}

// ---------- keyed sources: used only when the repository has the secret ----------
async function fromEuropeana() {
  // Without the repository's own key, Europeana's public demo key gives a capped sample (about 300 items per search).
  const own = process.env.EUROPEANA_API_KEY, key = own || "api2demo", pages = own ? 10 : 3;
  if (!own) console.log("europeana: no EUROPEANA_API_KEY, using the public demo key with a small cap");
  const queries = ["вишиванка", "вишивка", "рушник", "сорочка вишита", "vyshyvanka", "Ukrainian embroidery", "Ukrainian embroidered shirt", "Ukrainian folk costume",
    "haft ukraiński", "koszula ukraińska", "huculski haft", "ukrainische Stickerei", "ukrainisches Hemd", "ukrajinská výšivka",
    "плахта", "запаска", "керсетка", "кептар", "plachta ukraińska", "fartuch ukraiński", "kieptar huculski", "ukrainische Schürze", "Ukrainian apron", "Ukrainian skirt", "Ukrainian vest"];
  for (const q of queries) {
    let cursor = "*";
    for (let i = 0; i < pages && cursor; i++) {
      const r = await get(`https://api.europeana.eu/record/v2/search.json?wskey=${key}&query=${encodeURIComponent(q)}&reusability=open&media=true&rows=100&profile=rich&cursor=${encodeURIComponent(cursor)}`);
      for (const x of r?.items ?? []) {
        const img = x.edmIsShownBy?.[0]; if (!img) continue;
        // the object's own description only; the provider's country says where the museum is, not where the object is from
        const lang = (o: any) => (o ? Object.values(o).flat().join(" ") : "");
        const text = [x.title?.join(" "), x.dcDescription?.join(" "), lang(x.dcSubjectLangAware), lang(x.edmPlaceLabelLangAware), lang(x.dcCreatorLangAware)].join(" ");
        add({ id: `europeana-${String(x.id).replace(/[^A-Za-z0-9]+/g, "-").replace(/^-/, "").slice(0, 80)}`, source: "europeana", title: String(x.title?.[0] ?? "").slice(0, 200), pageUrl: x.guid ?? "", imageUrl: img,
          licenceText: x.rights?.[0] ?? "", evidence: UA.test(text) ? `title/description/subject/place: ${text.replace(/\s+/g, " ").slice(0, 140)}` : UA_PLACE.test(text) ? `place in Ukraine in title/description/subject/place: ${text.replace(/\s+/g, " ").slice(0, 140)}` : null,
          group: `europeana:${x.dataProvider?.[0] ?? ""}:${series(String(x.title?.[0] ?? x.id))}`, note: `provider ${x.dataProvider?.[0] ?? "?"}, ${x.country?.[0] ?? "?"}; type ${x.type ?? ""}` });
      }
      cursor = r?.nextCursor ?? ""; await sleep(own ? 300 : 1200);
    }
  }
}
// ---------- source: Finna (Finnish museums, archives and libraries; keyless; licence per image) ----------
async function fromFinna() {
  const fields = ["id", "title", "imageRights", "images", "subjects", "geographicSubjects", "summary", "buildings"].map((f) => `field[]=${f}`).join("&");
  const flat = (v: any): string => (Array.isArray(v) ? v.map(flat).join(" ") : String(v ?? ""));
  for (const q of ["ukrainalainen", "Ukraina", "ukrainsk", "ukrainian"]) for (let page = 1; page <= 6; page++) {
    const r = await get(`https://api.finna.fi/v1/search?lookfor=${encodeURIComponent(q)}&filter[]=online_boolean:1&limit=100&page=${page}&${fields}`);
    const rows = r?.records ?? []; if (!rows.length) break;
    for (const x of rows) {
      const img = x.images?.[0]; if (!img || !x.imageRights) continue;
      const text = [x.title, flat(x.subjects), flat(x.geographicSubjects), flat(x.summary)].join(" "), owner = x.buildings?.[0]?.translated ?? "?";
      add({ id: `finna-${String(x.id).replace(/[^A-Za-z0-9]+/g, "-").slice(0, 80)}`, source: "finna", title: String(x.title ?? "").slice(0, 200), pageUrl: `https://www.finna.fi/Record/${encodeURIComponent(x.id)}`,
        imageUrl: `https://api.finna.fi${img}`, licenceText: `${x.imageRights.copyright ?? ""} ${x.imageRights.link ?? ""}`,
        evidence: UA.test(text) ? `title/subjects/place: ${text.replace(/\s+/g, " ").slice(0, 160)}` : null, group: `finna:${owner}:${series(String(x.title ?? x.id))}`, note: `held by ${owner}` });
    }
    if (rows.length < 100) break;
    await sleep(500);
  }
}

// ---------- source: DigitaltMuseum (Swedish and Norwegian museums; keyless demo key; licence per object) ----------
async function fromDigitaltMuseum() {
  const fl = ["identifier.id", "identifier.owner", "artifact.uniqueId", "artifact.ingress.title", "artifact.ingress.subjects", "artifact.ingress.description", "artifact.ingress.classification",
    "artifact.ingress.production.place", "artifact.ingress.license", "artifact.defaultMediaIdentifier"].join(",");
  const join = (v: any) => [v].flat().filter(Boolean).join(" ");
  for (const q of ["ukraina", "ukrainsk", "ukrainska", "ukrainske"]) for (let start = 0; start < 2000; start += 100) {
    const r = await get(`https://api.dimu.org/api/solr/select?q=${encodeURIComponent(q)}&fq=artifact.hasPictures:true&wt=json&rows=100&start=${start}&fl=${encodeURIComponent(fl)}&api.key=demo`);
    const docs = r?.response?.docs ?? []; if (!docs.length) break;
    for (const x of docs) {
      const media = x["artifact.defaultMediaIdentifier"]; if (!media) continue;
      const title = join(x["artifact.ingress.title"]), owner = x["identifier.owner"] ?? "?";
      const text = [title, join(x["artifact.ingress.subjects"]), join(x["artifact.ingress.description"]), join(x["artifact.ingress.classification"]), join(x["artifact.ingress.production.place"])].join(" ");
      add({ id: `dimu-${x["artifact.uniqueId"] ?? x["identifier.id"]}`, source: "digitaltmuseum", title: title.slice(0, 200), pageUrl: `https://digitaltmuseum.org/${x["artifact.uniqueId"]}/`,
        imageUrl: `https://mm.dimu.org/image/${media}?dimension=1200x1200`, licenceText: join(x["artifact.ingress.license"]) || "unknown",
        evidence: UA.test(text) ? `title/subjects/description/place: ${text.replace(/\s+/g, " ").slice(0, 160)}` : null, group: `dimu:${owner}:${series(title || String(x["identifier.id"]))}`, note: `held by ${owner}` });
    }
    if (start + 100 >= (r?.response?.numFound ?? 0)) break;
    await sleep(500);
  }
}
async function fromSmithsonian() {
  const key = process.env.SI_API_KEY; if (!key) { console.log("smithsonian: no SI_API_KEY, skipped"); return; }
  for (const q of ["ukrainian embroidery", "ukrainian blouse", "ukraine embroidered"]) for (let start = 0; start < 500; start += 100) {
    const r = await get(`https://api.si.edu/openaccess/api/v1.0/search?q=${encodeURIComponent(q)}&start=${start}&rows=100&api_key=${key}`);
    const rows = r?.response?.rows ?? []; if (!rows.length) break;
    for (const x of rows) {
      const media = (x.content?.descriptiveNonRepeating?.online_media?.media ?? []).find((m: any) => /CC0/i.test(m.usage?.access ?? "")); if (!media) continue;
      const text = JSON.stringify(x.content?.freetext ?? {}) + " " + x.title;
      add({ id: `si-${x.id}`, source: "smithsonian", title: String(x.title ?? "").slice(0, 200), pageUrl: x.content?.descriptiveNonRepeating?.record_link ?? "", imageUrl: media.content,
        licenceText: "CC0 (Smithsonian Open Access)", evidence: UA.test(text) ? "catalogue text mentions Ukraine" : null, group: `si:${x.id}` });
    }
    await sleep(300);
  }
}

// ---------- reading ----------
/**
 * Separate motifs on one image: clusters of stitches more than `gap` empty cells apart, each at least min×min.
 * `complete` is false when a motif touches the edge of the area read (it runs off the photograph or the crop).
 */
export function splitMotifs(g: Grid, gap = 2, min = 5): { grid: Grid; complete: boolean }[] {
  const label = new Int32Array(g.cells.length).fill(-1), out: { grid: Grid; complete: boolean }[] = [];
  for (let i = 0; i < g.cells.length; i++) {
    if (!g.cells[i] || label[i] >= 0) continue;
    const id = out.length, stack = [i], members: number[] = []; label[i] = id;
    while (stack.length) {
      const j = stack.pop()!, x = j % g.w, y = (j - x) / g.w; members.push(j);
      for (let dy = -gap; dy <= gap; dy++) for (let dx = -gap; dx <= gap; dx++) {
        const nx = x + dx, ny = y + dy, k = ny * g.w + nx;
        if (nx >= 0 && ny >= 0 && nx < g.w && ny < g.h && g.cells[k] && label[k] < 0) { label[k] = id; stack.push(k); }
      }
    }
    const part = blank(g.w, g.h); members.forEach((j) => (part.cells[j] = g.cells[j]!));
    const xs = members.map((j) => j % g.w), ys = members.map((j) => Math.floor(j / g.w));
    const complete = Math.min(...xs) > 0 && Math.min(...ys) > 0 && Math.max(...xs) < g.w - 1 && Math.max(...ys) < g.h - 1;
    out.push({ grid: crop(part), complete });
  }
  return out.filter(({ grid: m }) => m.w >= min && m.h >= min && m.w <= 120 && m.h <= 120 && density(m) > 0.05 && density(m) < 0.9);
}

async function readImage(url: string) {
  const buf: Buffer | null = await get(url, false);
  if (!buf) throw new Error("image unavailable");
  const meta = await sharp(buf).metadata(), W = meta.width ?? 0, H = meta.height ?? 0;
  let best: { motifs: { grid: Grid; complete: boolean }[]; confidence: number; separation: number; quality: number; pitch: [number, number]; crop: string } | null = null;
  for (const frac of [1, 0.6, 0.35]) for (const work of [1000, 1800]) {
    const cw = Math.round(W * frac), ch = Math.round(H * frac);
    if (cw < 64 || ch < 64) continue;
    const { data, info } = await sharp(buf).extract({ left: (W - cw) >> 1, top: (H - ch) >> 1, width: cw, height: ch }).resize({ width: Math.min(work, cw), withoutEnlargement: true }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const got = extractGrid({ width: info.width, height: info.height, data, channels: 3 }, { minConfidence: 0.35 });
    if (!got) continue;
    // the largest motifs first, at most 12 per image (a plate rarely holds more; more usually means noise)
    const motifs = splitMotifs(got.grid).sort((a, b) => b.grid.w * b.grid.h - a.grid.w * a.grid.h).slice(0, 12);
    const quality = got.confidence * Math.min(1, got.separation / 2);
    if (motifs.length && (!best || quality > best.quality)) best = { motifs, confidence: got.confidence, separation: got.separation, quality, pitch: got.pitch, crop: `centre ${Math.round(frac * 100)}% at ${info.width}px` };
  }
  return best;
}

// ---------- run ----------
for (const [name, fn] of [["neon", fromNeon], ["commons", fromCommons], ["aic", fromAic], ["cleveland", fromCleveland], ["loc", fromLoc], ["ia-pattern-books", fromIaPatternBooks], ["nypl", fromNypl], ["finna", fromFinna], ["digitaltmuseum", fromDigitaltMuseum], ["europeana", fromEuropeana], ["smithsonian", fromSmithsonian]] as const) {
  try { await fn(); } catch (e) { console.error(`${name} failed:`, String(e)); }
}
console.log(`candidates: ${candidates.size}`);

type Row = Candidate & { licence: Licence | null; status: string; flags: string[]; motifs?: number; confidence?: number; separation?: number; quality?: number };
const rows: Row[] = [...candidates.values()].map((c) => {
  const flags: string[] = [];
  if (RUSSIA.test(`${c.title} ${c.evidence ?? ""}`)) flags.push("place-now-in-russia");
  // Bukovina and other borderlands are shared Romanian-Ukrainian (or Polish-Ukrainian) traditions: a person decides
  if (/bucovin|bukovin|буковин|maramure|мармар/i.test(`${c.title} ${c.evidence ?? ""} ${c.note ?? ""}`) || /Romania|Poland|Moldova/.test(c.note ?? "")) flags.push("shared-tradition-check-attribution");
  if (/in the us/i.test(c.licenceText)) flags.push("public-domain-in-us-only");
  return { ...c, licence: licenceOf(c.licenceText), status: "", flags };
});
const todo = rows.filter((r) => {
  if (!r.licence) return !(r.status = "licence-not-public-use");
  if (!r.evidence) return !(r.status = "no-ukrainian-attribution-in-own-metadata");
  if (PEOPLE.test(r.title)) return !(r.status = "photo-of-people");
  if (!ORNAMENT.test(r.evidence.startsWith("place in Ukraine") ? `${r.title} ${r.evidence}` : `${r.title} ${r.evidence} ${r.note ?? ""}`)) return !(r.status = "not-ornament-or-textile");
  return true;
});
console.log(`to read: ${todo.length}`);

const records: (MotifRecord & { quality: number; complete: boolean })[] = [];
let next = 0;
async function worker() {
  while (next < todo.length && minutes() < MAX_MINUTES) {
    const r = todo[next++]!;
    try {
      const read = await readImage(r.imageUrl);
      if (!read) { r.status = "no-counted-grid-read"; continue; }
      r.status = "grid-read"; r.motifs = read.motifs.length; r.confidence = +read.confidence.toFixed(3); r.separation = +read.separation.toFixed(2); r.quality = +read.quality.toFixed(3);
      read.motifs.forEach(({ grid: g, complete }, k) => {
        const id = read.motifs.length > 1 ? `${r.id}-m${k + 1}` : r.id;
        records.push({
          id, quality: +read.quality.toFixed(3), complete, name: r.title.slice(0, 120), tradition: "Ukrainian", region: null, technique: "unverified-counted", sourceGroup: r.group, chart: toChart(g),
          provenance: { kind: r.source === "ia" ? "pattern-book" : "museum-object", licence: r.licence!, culturalAccess: "review", independentSource: true, url: r.pageUrl,
            note: `${r.source}; ${r.licenceText.slice(0, 80)}; Ukrainian evidence (${r.evidence}); ${r.flags.length ? `FLAGS: ${r.flags.join(", ")}; ` : ""}grid read automatically (${read.crop}, pitch ${read.pitch.join("×")} px, confidence ${read.confidence.toFixed(2)}, colour separation ${read.separation.toFixed(2)}, ${complete ? "complete" : "CUT OFF at the edge of the image"}, symmetry ${detectSymmetry(g)}${read.motifs.length > 1 ? `, motif ${k + 1} of ${read.motifs.length}` : ""}). Check against the image, set technique and documented region, then set culturalAccess to open.` },
        });
      });
    } catch (e) { r.status = `image-error: ${String(e).slice(0, 80)}`; }
  }
}
await Promise.all([1, 2, 3, 4].map(worker));
for (const r of todo) if (!r.status) r.status = "not-reached-time-budget";

mkdirSync(OUT, { recursive: true });
const count = (k: (r: Row) => string) => rows.reduce<Record<string, number>>((m, r) => { const v = k(r); m[v] = (m[v] ?? 0) + 1; return m; }, {});
const summary = { candidates: rows.length, bySource: count((r) => r.source), byStatus: count((r) => r.status.split(":")[0]!), byLicence: count((r) => r.licence ?? "not-public-use"), records: records.length, sourceGroupsWithRecords: new Set(records.map((r) => r.sourceGroup)).size, minutes: +minutes().toFixed(1) };
writeFileSync(`${OUT}/candidates.json`, JSON.stringify({ schema: "ascend.public-motif-candidates.v1", summary, objects: rows.sort((a, b) => a.id.localeCompare(b.id)) }, null, 1) + "\n");
records.sort((a, b) => b.quality - a.quality || a.id.localeCompare(b.id));
writeFileSync(`${OUT}/public-motifs.unreviewed.json`, JSON.stringify({ schema: "ascend.motif-records.v1", records }) + "\n");
// review sheet: the 300 best reads, best first
records.sort((a, b) => b.quality - a.quality || a.id.localeCompare(b.id));
let y = 0; const body: string[] = [];
for (const rec of records.slice(0, 300)) {
  const g = { w: rec.chart[0]!.length, h: rec.chart.length, cells: [] as number[] }, cell = Math.max(2, Math.min(6, Math.floor(240 / Math.max(g.w, g.h))));
  const t = toSvg(parseChart(rec.chart), cell, `${rec.id} · q ${rec.quality} · ${(rec.name ?? "").slice(0, 40)}`);
  body.push(`<g transform="translate(0,${y})">${t}</g>`); y += g.h * cell + 24;
}
writeFileSync(`${OUT}/review-sheet.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="${Math.max(20, y)}"><rect width="100%" height="100%" fill="#fff"/>${body.join("")}</svg>\n`);
console.log(JSON.stringify(summary, null, 1));
