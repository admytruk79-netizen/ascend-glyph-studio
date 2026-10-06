/**
 * Open-access museum collection adapters. Each adapter pages through search
 * results for one query and yields normalized candidates with provenance.
 * Keyless sources run by default; keyed sources run only when their key is set.
 */
import type { Candidate, RightsStatus } from "./gates.ts";

export type Query = { q: string; tradition: string };
export type Adapter = {
  institution: string;
  source: string;
  enabled: () => boolean;
  /** Source-specific queries; when absent the shared QUERIES list is used. */
  queries?: Query[];
  search: (query: Query, fetchJson: FetchJson) => AsyncGenerator<Candidate>;
};
export type FetchJson = (url: string, headers?: Record<string, string>) => Promise<any>;

const UA = "ASCEND-Tesseract-Research-Corpus/0.2 (structural pattern research; contact via github.com/admytruk79-netizen)";
export const USER_AGENT = UA;

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const join = (v: unknown) => (Array.isArray(v) ? str(v.filter(Boolean).join("; ")) : str(v));

// The Met retired /v1/search on 2026-10-01; /v1.1/search is paginated with offset and limit.
const metIds = (res: any): number[] => {
  const list = res?.objectIDs ?? res?.results ?? res?.data ?? res?.objects ?? [];
  return (list as any[]).map((x) => (typeof x === "number" ? x : Number(x?.objectID ?? x?.id))).filter((n) => Number.isFinite(n));
};
const met: Adapter = {
  institution: "The Metropolitan Museum of Art",
  source: "met",
  enabled: () => true,
  async *search({ q, tradition }, fetchJson) {
    const base = "https://collectionapi.metmuseum.org/public/collection";
    for (let offset = 0; offset < 10000; offset += 100) {
      const res = await fetchJson(`${base}/v1.1/search?hasImages=true&q=${encodeURIComponent(q)}&offset=${offset}&limit=100`);
      const ids = metIds(res);
      if (!ids.length) return;
      for (const id of ids) {
        let x: any;
        try { x = await fetchJson(`${base}/v1/objects/${id}`); } catch { continue; }
        if (!x) continue;
        const rightsStatus: RightsStatus = x.isPublicDomain === true ? "open" : "review";
        yield {
          id: `met-${id}`, institution: met.institution, source: met.source, query: q, tradition,
          title: str(x.title), creator: str(x.artistDisplayName), date: str(x.objectDate),
          region: str([x.country, x.region, x.city].filter(Boolean).join(", ")), culture: str(x.culture),
          material: str(x.medium), technique: str(x.classification), objectType: str(x.objectName),
          objectURL: str(x.objectURL), image: str(x.primaryImageSmall) ?? str(x.primaryImage),
          rights: x.isPublicDomain ? "Public domain (Met Open Access, CC0)" : str(x.rightsAndReproduction) ?? "Not open access",
          rightsStatus, accession: str(x.accessionNumber), reliability: 0.98,
          description: str([x.department, x.period, x.dynasty, x.tags?.map((t: any) => t.term).join(" ")].filter(Boolean).join(" ")),
        };
      }
      const total = Number(res?.total ?? res?.totalCount ?? NaN);
      if (ids.length < 100 || (Number.isFinite(total) && offset + 100 >= total)) return;
    }
  },
};

const aic: Adapter = {
  institution: "Art Institute of Chicago",
  source: "aic",
  enabled: () => true,
  async *search({ q, tradition }, fetchJson) {
    const fields = "id,title,artist_display,date_display,place_of_origin,medium_display,classification_title,artwork_type_title,image_id,is_public_domain,main_reference_number,thumbnail,style_title,department_title,term_titles";
    for (let page = 1; page <= 100; page++) {
      const url = `https://api.artic.edu/api/v1/artworks/search?q=${encodeURIComponent(q)}&query[term][is_public_domain]=true&limit=100&page=${page}&fields=${fields}`;
      let res: any;
      try { res = await fetchJson(url, { "AIC-User-Agent": UA }); } catch { return; }
      const rows: any[] = res?.data ?? [];
      if (!rows.length) return;
      for (const x of rows) {
        yield {
          id: `aic-${x.id}`, institution: aic.institution, source: aic.source, query: q, tradition,
          title: str(x.title), creator: str(x.artist_display), date: str(x.date_display),
          region: str(x.place_of_origin), culture: str(x.style_title),
          material: str(x.medium_display), technique: str(x.classification_title), objectType: str(x.artwork_type_title),
          objectURL: `https://www.artic.edu/artworks/${x.id}`,
          image: x.image_id ? `https://www.artic.edu/iiif/2/${x.image_id}/full/843,/0/default.jpg` : undefined,
          imageWidth: x.thumbnail?.width, imageHeight: x.thumbnail?.height,
          rights: x.is_public_domain ? "Public domain (AIC, CC0)" : "Not public domain",
          rightsStatus: x.is_public_domain ? "open" : "review",
          accession: str(x.main_reference_number), reliability: 0.97,
          description: str([x.department_title, join(x.term_titles)].filter(Boolean).join(" ")),
        };
      }
      if (page >= (res?.pagination?.total_pages ?? 0)) return;
    }
  },
};

const cleveland: Adapter = {
  institution: "Cleveland Museum of Art",
  source: "cma",
  enabled: () => true,
  async *search({ q, tradition }, fetchJson) {
    for (let skip = 0; skip < 20000; skip += 100) {
      let res: any;
      try { res = await fetchJson(`https://openaccess-api.clevelandart.org/api/artworks/?q=${encodeURIComponent(q)}&cc0=1&has_image=1&limit=100&skip=${skip}`); } catch { return; }
      const rows: any[] = res?.data ?? [];
      if (!rows.length) return;
      for (const x of rows) {
        const img = x.images?.web ?? x.images?.print;
        yield {
          id: `cma-${x.id}`, institution: cleveland.institution, source: cleveland.source, query: q, tradition,
          title: str(x.title), creator: str(x.creators?.map((c: any) => c.description).join("; ")),
          date: str(x.creation_date), region: str(x.culture?.join("; ")), culture: join(x.culture),
          material: str(x.technique), technique: str(x.type), objectType: str(x.type),
          objectURL: str(x.url), image: str(img?.url),
          imageWidth: Number(img?.width) || undefined, imageHeight: Number(img?.height) || undefined,
          rights: x.share_license_status === "CC0" ? "CC0 (Cleveland Museum of Art Open Access)" : str(x.share_license_status),
          rightsStatus: x.share_license_status === "CC0" ? "open" : "review",
          accession: str(x.accession_number), reliability: 0.97,
          description: str([x.department, x.collection, x.tombstone].filter(Boolean).join(" ")),
        };
      }
      if (rows.length < 100) return;
    }
  },
};

// V&A images are licensed for non-commercial use only, so V&A candidates are
// recorded for review but never auto-accepted into a commercial derivation corpus.
const vam: Adapter = {
  institution: "Victoria and Albert Museum",
  source: "vam",
  enabled: () => true,
  async *search({ q, tradition }, fetchJson) {
    for (let page = 1; page <= 100; page++) {
      let res: any;
      try { res = await fetchJson(`https://api.vam.ac.uk/v2/objects/search?q=${encodeURIComponent(q)}&images_exist=true&page_size=100&page=${page}`); } catch { return; }
      const rows: any[] = res?.records ?? [];
      if (!rows.length) return;
      for (const x of rows) {
        yield {
          id: `vam-${x.systemNumber}`, institution: vam.institution, source: vam.source, query: q, tradition,
          title: str(x._primaryTitle) ?? str(x.objectType), creator: str(x._primaryMaker?.name),
          date: str(x._primaryDate), region: str(x._primaryPlace), culture: str(x._primaryPlace),
          objectType: str(x.objectType), technique: str(x.objectType),
          objectURL: `https://collections.vam.ac.uk/item/${x.systemNumber}/`,
          image: x._images?._iiif_image_base_url ? `${x._images._iiif_image_base_url}full/843,/0/default.jpg` : str(x._images?._primary_thumbnail),
          rights: "V&A images: non-commercial use licence", rightsStatus: "review",
          accession: str(x.accessionNumber), reliability: 0.96,
        };
      }
      if (page >= (res?.info?.pages ?? 0)) return;
    }
  },
};

const smithsonian: Adapter = {
  institution: "Smithsonian Institution",
  source: "si",
  enabled: () => Boolean(process.env.SMITHSONIAN_API_KEY),
  async *search({ q, tradition }, fetchJson) {
    const key = process.env.SMITHSONIAN_API_KEY!;
    for (let start = 0; start < 10000; start += 100) {
      let res: any;
      const query = `${q} AND online_media_type:"Images"`;
      try { res = await fetchJson(`https://api.si.edu/openaccess/api/v1.0/search?q=${encodeURIComponent(query)}&rows=100&start=${start}&api_key=${key}`); } catch { return; }
      const rows: any[] = res?.response?.rows ?? [];
      if (!rows.length) return;
      for (const x of rows) {
        const dn = x.content?.descriptiveNonRepeating ?? {};
        const media = (dn.online_media?.media ?? []).find((m: any) => m.type === "Images");
        const ft = x.content?.freetext ?? {};
        const is = x.content?.indexedStructured ?? {};
        const cc0 = media?.usage?.access === "CC0";
        yield {
          id: `si-${x.id}`, institution: smithsonian.institution, source: smithsonian.source, query: q, tradition,
          title: str(x.title), date: str(ft.date?.[0]?.content), region: join(is.place), culture: join(is.culture),
          material: str(ft.physicalDescription?.[0]?.content), technique: join(is.object_type), objectType: join(is.object_type),
          objectURL: str(dn.record_link) ?? str(dn.guid), image: str(media?.content),
          rights: cc0 ? "CC0 (Smithsonian Open Access)" : str(media?.usage?.access) ?? "Not open access",
          rightsStatus: cc0 ? "open" : "review",
          accession: str(dn.record_ID), reliability: 0.95,
          description: str([dn.unit_code, dn.data_source].filter(Boolean).join(" ")),
        };
      }
    }
  },
};


// Wikimedia Commons: category crawl over Ukrainian embroidery and folk-textile
// categories. Commons hosts many photographs of museum objects with explicit
// per-file licences. Public domain, CC0 and CC BY are treated as open; CC BY-SA
// (share-alike) goes to review unless COMMONS_ACCEPT_SHAREALIKE=1.
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const COUNTRY: Record<string, string> = { Ukrainian: "Ukraine", Belarusian: "Belarus", Lithuanian: "Lithuania" };
const stripHtml = (v: unknown) => str(String(v ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
export function commonsRights(licence: string | undefined): RightsStatus {
  const l = (licence ?? "").toLowerCase();
  if (!l) return "unknown";
  if (/public domain|^pd|cc0|cc-zero/.test(l)) return "open";
  if (/by-sa|by sa/.test(l)) return process.env.COMMONS_ACCEPT_SHAREALIKE === "1" ? "open" : "review";
  if (/^cc by(?!-nc|-nd)|^cc-by(?!-nc|-nd)/.test(l) && !/nc|nd/.test(l)) return "open";
  return "review";
}
const commons: Adapter = {
  institution: "Wikimedia Commons",
  source: "commons",
  enabled: () => true,
  queries: [
    "Embroidery of Ukraine", "Traditional Ukrainian embroidery", "Ukrainian embroidery by region",
    "Rushnyks in Ukraine by region", "Embroidery of Northern Bukovina", "Embroidery of Chernihiv Oblast", "Embroidery of Lviv Oblast",
    "Embroidery of Podolia", "Embroidery of Pokuttya", "Embroidery of Polissya", "Embroidery of Poltavshchyna",
    "Embroidery of Ternopil Oblast", "Embroidery of Volhynia", "Embroidery of Zakarpattia", "Ukrainian embroidery by date",
    "Ukrainian rushnyk", "Sorochka (Ukraine)", "Nyz'", "Cross-stitching in Ukraine", "Pillows of Ukraine", "Vyshyvanka in Ukraine",
    "Ukrainian embroidery", "Vyshyvanka", "Rushnyky",
    "Ukrainian folk costume", "Folk costumes of Ukraine", "Hutsul embroidery", "Hutsul costume", "Boyko costume", "Lemko costume",
    "Ivan Honchar Museum", "National Museum of Ukrainian Folk Decorative Art", "Ukrainian kilims", "Kilims of Ukraine", "Plakhta",
    "Petrykivka painting", "Kosiv ceramics", "Reshetylivka embroidery",
  ].map((q) => ({ q, tradition: "Ukrainian" })).concat(
    ["Embroidery of Belarus", "Textiles of Belarus", "Rushnyks of Belarus", "Belarusian national costume", "Folk costumes of Belarus",
      "Slutsk sashes", "Belarusian folk art", "Weaving in Belarus"].map((q) => ({ q, tradition: "Belarusian" })),
    ["Embroidery of Lithuania", "Textiles of Lithuania", "Lithuanian sashes", "Juostos", "Lithuanian national costume",
      "Folk costumes of Lithuania", "Lithuanian folk art", "Weaving in Lithuania"].map((q) => ({ q, tradition: "Lithuanian" })),
  ),
  async *search({ q, tradition }, fetchJson) {
    const visited = new Set<string>();
    const stack: { title: string; depth: number }[] = [{ title: `Category:${q}`, depth: 0 }];
    while (stack.length) {
      const { title, depth } = stack.pop()!;
      if (visited.has(title)) continue;
      visited.add(title);
      let cont: Record<string, string> = { continue: "" };
      for (let page = 0; page < 50 && cont; page++) {
        const params = new URLSearchParams({
          action: "query", format: "json", generator: "categorymembers", gcmtitle: title, gcmtype: "file|subcat", gcmlimit: "200",
          prop: "imageinfo", iiprop: "url|size|mime|extmetadata", iiurlwidth: "1024",
          iiextmetadatafilter: "LicenseShortName|ImageDescription|Artist|DateTimeOriginal|ObjectName|Credit", ...cont,
        });
        const res = await fetchJson(`${COMMONS_API}?${params}`);
        for (const p of Object.values<any>(res?.query?.pages ?? {})) {
          if (p.ns === 14) { if (depth < 2) stack.push({ title: p.title, depth: depth + 1 }); continue; }
          const ii = p.imageinfo?.[0];
          if (!ii || !/^image\/(jpeg|png|tiff|webp)/.test(ii.mime ?? "")) continue;
          const m = ii.extmetadata ?? {};
          const licence = str(m.LicenseShortName?.value);
          yield {
            id: `commons-${p.pageid}`, institution: commons.institution, source: commons.source, query: q, tradition,
            title: stripHtml(m.ObjectName?.value) ?? str(p.title.replace(/^File:/, "").replace(/\.[a-z]+$/i, "")),
            creator: stripHtml(m.Artist?.value), date: stripHtml(m.DateTimeOriginal?.value),
            culture: COUNTRY[tradition] ?? tradition, region: COUNTRY[tradition] ?? tradition,
            objectURL: str(ii.descriptionurl) ?? `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title)}`,
            image: str(ii.thumburl) ?? str(ii.url), imageWidth: ii.width, imageHeight: ii.height,
            rights: licence ?? "No licence metadata", rightsStatus: commonsRights(licence),
            accession: `commons:${p.pageid}`, reliability: 0.8,
            description: stripHtml([m.ImageDescription?.value, m.Credit?.value, title.replace(/^Category:/, "")].filter(Boolean).join(" ")),
          };
        }
        cont = res?.continue;
      }
    }
  },
};

// Europeana: the EU's aggregated museum network. Holds Ukrainian, Belarusian and
// Lithuanian textiles from many European museums. Needs a free API key
// (EUROPEANA_API_KEY, from pro.europeana.eu). Rights come as rights-statement URLs.
export function europeanaRights(url: string | undefined): RightsStatus {
  const u = (url ?? "").toLowerCase();
  if (!u) return "unknown";
  if (/creativecommons\.org\/publicdomain\/(mark|zero)/.test(u)) return "open";
  if (/creativecommons\.org\/licenses\/by-sa\//.test(u)) return process.env.COMMONS_ACCEPT_SHAREALIKE === "1" ? "open" : "review";
  if (/creativecommons\.org\/licenses\/by\//.test(u)) return "open";
  return "review"; // NC, ND, in-copyright and rightsstatements.org terms
}
const first = (v: unknown) => (Array.isArray(v) ? str(v[0]) : str(v));
const europeana: Adapter = {
  institution: "Europeana",
  source: "europeana",
  enabled: () => Boolean(process.env.EUROPEANA_API_KEY),
  queries: [
    ...["Ukrainian embroidery", "вишивка", "рушник", "сорочка", "вишиванка", "Ukrainian folk costume", "Hutsul", "Ruthenian embroidery",
      "Ukrainian textile", "Ukrainian kilim", "плахта", "Bukovina embroidery", "Galicia folk costume", "Lemko", "Boyko", "крайка", "пояс тканий",
      "ukraińska haftowana", "ukrainischer Stickerei"].map((q) => ({ q, tradition: "Ukrainian" })),
    ...["Belarusian embroidery", "вышыўка", "ручнік", "Belarus textile", "Slutsk sash", "białoruski haft"].map((q) => ({ q, tradition: "Belarusian" })),
    ...["juosta", "Lithuanian sash", "lietuvių tautinis kostiumas", "Lithuanian textile", "rinktinė juosta", "audinys"].map((q) => ({ q, tradition: "Lithuanian" })),
    ...["blackwork embroidery", "crewelwork", "English sampler", "Jacobean embroidery"].map((q) => ({ q, tradition: "English (16th–19th c.)" })),
  ],
  async *search({ q, tradition }, fetchJson) {
    const key = process.env.EUROPEANA_API_KEY!;
    let cursor = "*";
    for (let page = 0; page < 100 && cursor; page++) {
      const params = new URLSearchParams({ wskey: key, query: q, qf: "TYPE:IMAGE", media: "true", rows: "100", profile: "rich", cursor });
      let res: any;
      try { res = await fetchJson(`https://api.europeana.eu/record/v2/search.json?${params}`); } catch { return; }
      const items: any[] = res?.items ?? [];
      if (!items.length) return;
      for (const x of items) {
        const rightsUrl = first(x.rights);
        yield {
          id: `europeana-${String(x.id).replace(/^\//, "").replace(/\//g, "-")}`, institution: first(x.dataProvider) ?? europeana.institution,
          source: europeana.source, query: q, tradition,
          title: first(x.title), creator: first(x.dcCreator), date: first(x.year),
          region: join(x.country), culture: join(x.edmPlaceLabel) ?? join(x.country),
          objectType: join(x.dcTypeLangAware?.def ?? x.dcType), material: join(x.dcFormat),
          objectURL: first(x.edmIsShownAt) ?? str(x.guid), image: first(x.edmIsShownBy) ?? first(x.edmPreview),
          rights: rightsUrl ?? "No rights statement", rightsStatus: europeanaRights(rightsUrl),
          accession: `europeana:${x.id}`, reliability: 0.85,
          description: str([first(x.dcDescription), first(x.provider)].filter(Boolean).join(" ")),
        };
      }
      cursor = res?.nextCursor ?? "";
    }
  },
};

// Library of Congress (loc.gov JSON API, no key). Prints and photographs, many with
// "No known restrictions"; each item's rights advisory is read before acceptance.
export function locRights(advisory: string | undefined): RightsStatus {
  const a = (advisory ?? "").toLowerCase();
  if (!a) return "unknown";
  if (/no known restrictions|public domain|no known copyright/.test(a)) return "open";
  return "review";
}
function locImage(urls: unknown): string | undefined {
  const list = (Array.isArray(urls) ? urls : []).map((u) => String(u).replace(/#.*$/, ""));
  const iiif = list.find((u) => u.includes("/iiif/"));
  if (iiif) return iiif.replace(/\/full\/[^/]+\/0\//, "/full/!1600,1600/0/");
  return list.at(-1);
}
const loc: Adapter = {
  institution: "Library of Congress",
  source: "loc",
  enabled: () => true,
  queries: [
    ...["Ukrainian embroidery", "Ukrainian costume", "Ukrainian folk art", "Hutsul", "Ukrainian peasant", "Ruthenian", "Little Russian costume",
      "Ukrainian Easter eggs", "Ukrainian textile"].map((q) => ({ q, tradition: "Ukrainian" })),
    ...["Belarus costume", "White Russian peasant", "Byelorussian folk art"].map((q) => ({ q, tradition: "Belarusian" })),
    ...["Lithuanian costume", "Lithuanian folk art", "Lithuanian weaving"].map((q) => ({ q, tradition: "Lithuanian" })),
    ...["sampler embroidery", "crewel embroidery", "English needlework"].map((q) => ({ q, tradition: "English (16th–19th c.)" })),
    ...["cowboy boots", "saddle", "western saddle", "chaps cowboy", "spurs", "tooled leather"].map((q) => ({ q, tradition: "Western / cowboy material culture" })),
  ],
  async *search({ q, tradition }, fetchJson) {
    for (let page = 1; page <= 30; page++) {
      let res: any;
      try { res = await fetchJson(`https://www.loc.gov/search/?q=${encodeURIComponent(q)}&fa=online-format:image&fo=json&c=100&sp=${page}`); } catch { return; }
      const results: any[] = res?.results ?? [];
      if (!results.length) return;
      for (const x of results) {
        const image = locImage(x.image_url);
        if (!image || !x.id) continue;
        let advisory: string | undefined;
        try {
          const item = await fetchJson(`${String(x.id).replace(/\/$/, "")}/?fo=json`);
          advisory = str(item?.item?.rights_advisory) ?? join(item?.item?.rights) ?? str(item?.rights);
        } catch { /* rights unknown → not accepted */ }
        yield {
          id: `loc-${String(x.id).replace(/^https?:\/\/www\.loc\.gov\//, "").replace(/\W+/g, "-")}`, institution: loc.institution, source: loc.source,
          query: q, tradition, title: str(x.title), date: str(x.date), region: join(x.location), culture: join(x.location),
          objectType: join(x.original_format), technique: join(x.subject), objectURL: str(x.url) ?? str(x.id), image,
          rights: advisory ?? "No rights advisory", rightsStatus: locRights(advisory), accession: `loc:${x.id}`, reliability: 0.9,
          description: str([join(x.description), join(x.subject)].filter(Boolean).join(" ")),
        };
      }
      if (!res?.pagination?.next) return;
    }
  },
};

// Internet Archive (no key): scanned pattern albums and ornament books. Each page image is a
// candidate. Open only when public domain in the US (published 1930 or earlier, or marked PD).
export function archiveRights(year: number | undefined, licence: string | undefined): RightsStatus {
  if (/publicdomain/i.test(licence ?? "")) return "open";
  if (year !== undefined && Number.isFinite(year)) return year <= 1930 ? "open" : "review";
  return "unknown";
}
const archive: Adapter = {
  institution: "Internet Archive",
  source: "ia",
  enabled: () => true,
  queries: [
    ...["український орнамент", "українські вишивки", "вишивки", "малорусский орнамент", "малороссийские узоры", "ukrainian ornament",
      "ukrainian embroidery", "hutsul", "писанки", "узоры вышивок"].map((q) => ({ q, tradition: "Ukrainian" })),
    ...["белорусский орнамент", "белорусские узоры", "беларускі арнамент"].map((q) => ({ q, tradition: "Belarusian" })),
    ...["lietuvių ornamentas", "juostos", "lithuanian ornament"].map((q) => ({ q, tradition: "Lithuanian" })),
    ...["sampler patterns", "needlework patterns", "embroidery patterns 17th century"].map((q) => ({ q, tradition: "English (16th–19th c.)" })),
  ],
  async *search({ q, tradition }, fetchJson) {
    const params = new URLSearchParams({ q: `(${q}) AND mediatype:(texts OR image)`, rows: "100", page: "1", output: "json" });
    for (const f of ["identifier", "title", "year", "date", "licenseurl", "creator", "language"]) params.append("fl[]", f);
    let res: any;
    try { res = await fetchJson(`https://archive.org/advancedsearch.php?${params}`); } catch { return; }
    for (const d of res?.response?.docs ?? []) {
      const year = Number(String(d.year ?? d.date ?? "").slice(0, 4)) || undefined;
      const rightsStatus = archiveRights(year, str(d.licenseurl));
      if (rightsStatus !== "open") continue; // don't fetch manifests for books we cannot use
      let man: any;
      try { man = await fetchJson(`https://iiif.archive.org/iiif/3/${encodeURIComponent(d.identifier)}/manifest.json`); } catch { continue; }
      const canvases: any[] = (man?.items ?? []).slice(0, 400);
      for (let i = 0; i < canvases.length; i++) {
        const c = canvases[i];
        const body = c?.items?.[0]?.items?.[0]?.body;
        const svc = body?.service?.[0]?.id ?? body?.service?.[0]?.["@id"];
        const image = svc ? `${svc}/full/!1600,1600/0/default.jpg` : str(body?.id);
        if (!image) continue;
        yield {
          id: `ia-${d.identifier}-p${i + 1}`, institution: archive.institution, source: archive.source, query: q, tradition,
          title: `${join(d.title) ?? d.identifier}, page ${i + 1}`, creator: join(d.creator), date: year ? String(year) : undefined,
          culture: COUNTRY[tradition] ?? tradition, region: COUNTRY[tradition] ?? tradition,
          objectURL: `https://archive.org/details/${d.identifier}/page/n${i}`, image, imageWidth: c.width, imageHeight: c.height,
          rights: str(d.licenseurl) ?? `Published ${year}; public domain in the US`, rightsStatus, accession: `ia:${d.identifier}:${i + 1}`,
          reliability: 0.75, description: `ornament album page ${q}`,
        };
      }
    }
  },
};

// Finna (Finnish museums, archives and libraries; no key). Per-image licences.
const finna: Adapter = {
  institution: "Finna",
  source: "finna",
  enabled: () => true,
  queries: [
    ...["ukrainalainen", "Ukraina kirjonta", "Ukraina tekstiili", "ukrainalainen kansanpuku"].map((q) => ({ q, tradition: "Ukrainian" })),
    ...["valkovenäläinen", "Valko-Venäjä tekstiili"].map((q) => ({ q, tradition: "Belarusian" })),
    ...["liettualainen", "Liettua vyö", "Liettua tekstiili"].map((q) => ({ q, tradition: "Lithuanian" })),
  ],
  async *search({ q, tradition }, fetchJson) {
    for (let page = 1; page <= 20; page++) {
      const params = new URLSearchParams({ lookfor: q, limit: "100", page: String(page) });
      params.append("filter[]", 'online_boolean:"1"');
      for (const f of ["id", "title", "images", "imageRights", "buildings", "year", "nonPresenterAuthors", "subjects", "formats", "recordPage"]) params.append("field[]", f);
      let res: any;
      try { res = await fetchJson(`https://api.finna.fi/v1/search?${params}`); } catch { return; }
      const recs: any[] = res?.records ?? [];
      if (!recs.length) return;
      for (const x of recs) {
        const img = x.images?.[0];
        if (!img) continue;
        const licence = str(x.imageRights?.copyright);
        yield {
          id: `finna-${x.id}`, institution: str(x.buildings?.[0]?.translated) ?? finna.institution, source: finna.source, query: q, tradition,
          title: str(x.title), date: str(x.year), creator: str(x.nonPresenterAuthors?.[0]?.name),
          culture: COUNTRY[tradition] ?? tradition, objectType: str(x.formats?.at(-1)?.translated),
          objectURL: `https://www.finna.fi${str(x.recordPage) ?? `/Record/${encodeURIComponent(x.id)}`}`,
          image: `https://api.finna.fi${String(img).replace("size=small", "size=large")}`,
          rights: licence ?? "No licence", rightsStatus: commonsRights(licence), accession: `finna:${x.id}`, reliability: 0.85,
          description: join((x.subjects ?? []).flat()),
        };
      }
      if (recs.length < 100) return;
    }
  },
};

export const ADAPTERS: Adapter[] = [met, aic, cleveland, vam, smithsonian, commons, europeana, loc, archive, finna];

const UKRAINIAN = [
  "Ukrainian embroidery", "Ukrainian textile", "Ukrainian costume", "rushnyk", "Ukrainian kilim", "Hutsul", "Ukrainian folk art", "Ukrainian ceramics",
  "Petrykivka", "Kosiv ceramics", "Ukraine weaving", "Ukrainian towel",
  // Historical and regional names used in Western museum catalogues.
  "Ruthenian", "Ruthenian embroidery", "Galicia embroidery", "Galician costume", "Bukovina", "Bukovina embroidery", "Carpathian embroidery",
  "Carpathian textile", "Lemko", "Boyko", "Transcarpathia", "Podolia", "Volhynia", "Poltava", "Little Russian", "Kiev embroidery",
  "Ukrainian shirt", "embroidered shirt Ukraine", "Ukrainian sash", "Ukrainian apron", "plakhta", "Ukrainian Easter egg", "pysanka",
  "вишивка", "вишиванка", "рушник", "сорочка", "килим", "орнамент",
];
const BELARUSIAN = ["Belarusian embroidery", "Belarusian textile", "Belarusian towel", "Belarus weaving", "Slutsk sash", "Byelorussian", "White Russian embroidery", "Belarusian costume"];
const LITHUANIAN = ["Lithuanian sash", "Lithuanian textile", "Lithuanian costume", "Lithuanian weaving", "juosta", "Baltic sash"];
const ENGLISH = [
  "English embroidery", "blackwork", "crewelwork", "Jacobean embroidery", "English sampler", "needlework sampler 17th century",
  "Elizabethan embroidery", "stumpwork", "Berlin woolwork", "Spitalfields silk", "English needlework", "embroidered coif", "English quilt",
];
const WESTERN = ["saddle", "spurs", "leather tooling", "cowboy", "bridle", "chaps", "western boots", "charro", "saddle blanket", "horse tack", "silver concho", "belt buckle", "cowboy boots", "boot stitching", "tooled leather", "vaquero", "saddlery", "Western saddle"];
const GLOBAL = [
  "embroidery", "embroidered linen", "needlework sampler", "weaving", "tapestry", "brocade", "damask", "lace", "kilim", "carpet", "rug",
  "ikat", "batik", "block printed textile", "chintz", "quilt", "jacquard", "shawl", "sash", "textile fragment", "textile design",
  "ornament print", "pattern book", "border design", "wallpaper", "tile", "mosaic", "ceramic ornament", "enamel", "filigree",
  "metalwork ornament", "wood carving ornament", "marquetry", "inlay",
  "Hungarian embroidery", "Polish folk", "Romanian embroidery", "Slovak embroidery", "Balkan textile", "Caucasian rug", "suzani",
  "Persian textile", "Ottoman textile", "Ottoman tile", "kimono", "Chinese silk", "Indian textile", "Andean textile", "kente",
  "adire", "songket", "Celtic interlace", "Islamic geometric", "Gothic ornament", "Art Nouveau ornament", "Coptic textile",
  "Scandinavian weaving", "Baltic textile", "Greek embroidery", "Turkmen", "Uzbek ikat", "Japanese stencil katagami",
  "velvet", "silk textile", "linen", "woven silk", "printed cotton", "resist dyed", "tie-dye", "shibori", "obi", "fukusa",
  "sari", "Kashmir shawl", "paisley", "toile", "Spitalfields silk", "Lyon silk", "Italian velvet", "Mughal textile",
  "Safavid", "Mamluk", "Fatimid", "Byzantine textile", "Sasanian", "Peruvian textile", "Paracas", "Mexican textile", "Guatemalan textile",
  "Indonesian textile", "Philippine textile", "Chinese embroidery", "Korean textile", "dragon robe", "rank badge",
  "openwork", "lattice", "pierced", "interlace ornament", "arabesque", "rosette", "palmette", "guilloche", "meander", "strapwork",
  "grotesque ornament", "acanthus", "lacquer", "inro", "netsuke", "sword guard tsuba", "tsuba", "damascened", "niello", "champlevé", "cloisonné",
  "bookbinding", "manuscript border", "illuminated border", "Qur'an illumination", "endpaper", "marbled paper", "textile sample book",
  "stained glass", "floor tile", "Iznik", "Delftware", "maiolica", "lustreware", "Chinese porcelain", "blue and white", "celadon",
  "basketry", "mat weaving", "feltwork", "felt", "knitting", "crochet", "bobbin lace", "needle lace", "whitework", "cutwork", "drawn thread work",
  "cross stitch", "counted thread", "smocking", "beaded bag", "embroidered purse", "chasuble", "cope", "vestment", "banner",
];

export const QUERIES: Query[] = [
  ...UKRAINIAN.map((q) => ({ q, tradition: "Ukrainian" })),
  ...BELARUSIAN.map((q) => ({ q, tradition: "Belarusian" })),
  ...LITHUANIAN.map((q) => ({ q, tradition: "Lithuanian" })),
  ...ENGLISH.map((q) => ({ q, tradition: "English (16th–19th c.)" })),
  ...WESTERN.map((q) => ({ q, tradition: "Western / cowboy material culture" })),
  ...GLOBAL.map((q) => ({ q, tradition: "Global" })),
];
