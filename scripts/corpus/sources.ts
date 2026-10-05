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
  search: (query: Query, fetchJson: FetchJson) => AsyncGenerator<Candidate>;
};
export type FetchJson = (url: string, headers?: Record<string, string>) => Promise<any>;

const UA = "ASCEND-Tesseract-Research-Corpus/0.2 (structural pattern research; contact via github.com/admytruk79-netizen)";
export const USER_AGENT = UA;

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const join = (v: unknown) => (Array.isArray(v) ? str(v.filter(Boolean).join("; ")) : str(v));

const met: Adapter = {
  institution: "The Metropolitan Museum of Art",
  source: "met",
  enabled: () => true,
  async *search({ q, tradition }, fetchJson) {
    const base = "https://collectionapi.metmuseum.org/public/collection/v1";
    const res = await fetchJson(`${base}/search?hasImages=true&q=${encodeURIComponent(q)}`);
    for (const id of (res?.objectIDs ?? []) as number[]) {
      let x: any;
      try { x = await fetchJson(`${base}/objects/${id}`); } catch { continue; }
      if (!x) continue;
      const rightsStatus: RightsStatus = x.isPublicDomain === true ? "open" : "review";
      yield {
        id: `met-${id}`, institution: met.institution, source: met.source, query: q, tradition,
        title: str(x.title), creator: str(x.artistDisplayName), date: str(x.objectDate),
        region: str([x.country, x.region, x.city].filter(Boolean).join(", ")), culture: str(x.culture),
        material: str(x.medium), technique: str(x.classification), objectType: str(x.objectName),
        objectURL: str(x.objectURL), image: str(x.primaryImage) ?? str(x.primaryImageSmall),
        rights: x.isPublicDomain ? "Public domain (Met Open Access, CC0)" : str(x.rightsAndReproduction) ?? "Not open access",
        rightsStatus, accession: str(x.accessionNumber), reliability: 0.98,
        description: str([x.department, x.period, x.dynasty, x.tags?.map((t: any) => t.term).join(" ")].filter(Boolean).join(" ")),
      };
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

export const ADAPTERS: Adapter[] = [met, aic, cleveland, vam, smithsonian];

const UKRAINIAN = ["Ukrainian embroidery", "Ukrainian textile", "Ukrainian costume", "rushnyk", "Ukrainian kilim", "Hutsul", "Ukrainian folk art", "Ukrainian ceramics", "Petrykivka", "Kosiv ceramics", "Ukraine weaving", "Ukrainian towel"];
const WESTERN = ["saddle", "spurs", "leather tooling", "cowboy", "bridle", "chaps", "western boots", "charro", "saddle blanket", "horse tack", "silver concho", "belt buckle"];
const GLOBAL = [
  "embroidery", "embroidered linen", "needlework sampler", "weaving", "tapestry", "brocade", "damask", "lace", "kilim", "carpet", "rug",
  "ikat", "batik", "block printed textile", "chintz", "quilt", "jacquard", "shawl", "sash", "textile fragment", "textile design",
  "ornament print", "pattern book", "border design", "wallpaper", "tile", "mosaic", "ceramic ornament", "enamel", "filigree",
  "metalwork ornament", "wood carving ornament", "marquetry", "inlay",
  "Hungarian embroidery", "Polish folk", "Romanian embroidery", "Slovak embroidery", "Balkan textile", "Caucasian rug", "suzani",
  "Persian textile", "Ottoman textile", "Ottoman tile", "kimono", "Chinese silk", "Indian textile", "Andean textile", "kente",
  "adire", "songket", "Celtic interlace", "Islamic geometric", "Gothic ornament", "Art Nouveau ornament", "Coptic textile",
  "Scandinavian weaving", "Baltic textile", "Greek embroidery", "Turkmen", "Uzbek ikat", "Japanese stencil katagami",
];

export const QUERIES: Query[] = [
  ...UKRAINIAN.map((q) => ({ q, tradition: "Ukrainian" })),
  ...WESTERN.map((q) => ({ q, tradition: "Western / cowboy material culture" })),
  ...GLOBAL.map((q) => ({ q, tradition: "Global" })),
];
