/**
 * Style profiles: how each tradition builds pattern, measured from the analysed corpus as numbers
 * (never images). The blend engine mixes them by weight into structure targets (docs/BLEND-ENGINE.md).
 */
import type { AnalyzedRow } from "./store.ts";

/**
 * Traditions the blend engine can be asked for. Profiles are numbers only (symmetry, rhythm, density),
 * so a structure-only tradition contributes structure targets and never motifs; nation-specific
 * selection (a named tribe) is not offered.
 */
export const SELECTABLE = ["Ukrainian", "Belarusian", "Lithuanian", "English (16th–19th c.)", "Western / cowboy material culture", "Native American (structure only)"] as const;
export const STRUCTURE_ONLY = new Set(["Native American (structure only)"]);

const CULTURE_RULES: [RegExp, string][] = [
  [/ukrain|hutsul|ruthen|galici|bukovin|podil|podol|volhyn|poltava|lemko|boyk|transcarpath|zakarpat|pokut|україн|гуцул/i, "Ukrainian"],
  [/belarus|byelorus|slutsk|білорус|беларус/i, "Belarusian"],
  [/lithuan|lietuv|samogit|žemait|dzūk|aukštait/i, "Lithuanian"],
  [/\b(england|english|british|london|jacobean|elizabethan)\b/i, "English (16th–19th c.)"],
  [/\b(cowboy|vaquero|charro|western saddle|texas|wyoming|montana)\b/i, "Western / cowboy material culture"],
];
const INDIGENOUS = /\b(native american|american indian|first nations?|lakota|navajo|din[eé]|hopi|apache|cheyenne|sioux|ojibw?e|cherokee|pueblo|plains|acoma|zuni|pomo|seminole|chilkat|tlingit|haida|great lakes)\b/i;
// Western / cowboy material is catalogued by object type, with culture "American" or "Mexican".
const WESTERN_OBJECT = /\b(saddle\w*|spurs?|chaps|cowboy|vaquero|charro|bridle|holster|lariat|lasso|reata|concho\w*|stirrups?|rodeo|bandana|boots?|bit and headstall|headstall|saddlebags?|tooled)\b/i;
const WESTERN_PLACE = /\b(american|united states|mexic\w*|texas|wyoming|montana|california|new mexico|arizona|colorado|oklahoma|west)\b/i;
const QUERY_GROUPS = new Set<string>([...SELECTABLE, "Global"]);

/**
 * Tradition of a row: the museum's own culture/region/title text wins over the search group
 * (museum search is fuzzy, so a "Ukrainian embroidery" query also returns unrelated objects).
 * Older rows carry the culture in `tradition`; it is read as catalogue text unless it is a query-group label.
 */
export function traditionOf(r: AnalyzedRow): string {
  const label = typeof r.tradition === "string" ? r.tradition : "";
  const parts = [r.culture, r.region, r.title, QUERY_GROUPS.has(label) ? undefined : label].filter((v) => typeof v === "string" && v.trim());
  const t = parts.join(" ");
  if (INDIGENOUS.test(t)) return "Native American (structure only)";
  for (const [re, name] of CULTURE_RULES) if (re.test(t)) return name;
  if (WESTERN_OBJECT.test(t) && (WESTERN_PLACE.test(t) || label === "Western / cowboy material culture")) return "Western / cowboy material culture";
  // Without catalogue text, trust the search group only for the targeted groups, marked as weaker evidence.
  if (!t && label && label !== "Global") return `${label} (by query)`;
  return t ? "Other" : "Unlabelled";
}

type Dist = Record<string, number>;
export type StyleProfile = {
  tradition: string;
  n: number;
  /** Share of rows whose label came from catalogue text rather than the search query. */
  labelConfidence: number;
  kind: Dist;
  frieze: Dist;
  wallpaperRotation: Dist;
  rosette: Dist;
  dominantAxis: Dist;
  grammarFigures: Dist;
  /** Medians of structural features (0–1). */
  median: Record<string, number>;
  /** Median band repeat relative to band length, and band thickness relative to image. */
  band: { periodRel: number | null; thicknessRel: number | null; breaksRatio: number | null };
};

const NUM = ["edgeDensity", "voidRatio", "densityVariation", "mirrorX", "mirrorY", "rotation180", "radiality", "repetitionX", "repetitionY", "axisStrength", "contrast"] as const;

const median = (xs: number[]): number | null => {
  const v = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = v.length >> 1;
  return v.length % 2 ? v[m]! : (v[m - 1]! + v[m]!) / 2;
};
const r3 = (v: number) => Math.round(v * 1000) / 1000;
function normalize(d: Dist): Dist {
  const s = Object.values(d).reduce((a, b) => a + b, 0);
  const o: Dist = {};
  for (const [k, v] of Object.entries(d).sort((a, b) => b[1] - a[1])) o[k] = s ? r3(v / s) : 0;
  return o;
}
const bump = (d: Dist, k: string | undefined) => { if (k) d[k] = (d[k] ?? 0) + 1; };

export function buildProfiles(rows: AnalyzedRow[], minRows = 1): StyleProfile[] {
  const groups = new Map<string, AnalyzedRow[]>();
  for (const r of rows) {
    if (!r.features) continue;
    const t = traditionOf(r);
    (groups.get(t) ?? groups.set(t, []).get(t)!).push(r);
  }
  const out: StyleProfile[] = [];
  for (const [tradition, rs] of groups) {
    if (rs.length < minRows) continue;
    const kind: Dist = {}, frieze: Dist = {}, wall: Dist = {}, ros: Dist = {}, axis: Dist = {}, fig: Dist = {};
    const nums: Record<string, number[]> = Object.fromEntries(NUM.map((k) => [k, []]));
    const periodRel: number[] = [], thick: number[] = [], brk: number[] = [];
    let byText = 0;
    for (const r of rs) {
      if (!traditionOf(r).endsWith("(by query)")) byText++;
      const f = r.features as Record<string, any>;
      for (const k of NUM) if (typeof f[k] === "number") nums[k]!.push(f[k]);
      bump(axis, f.dominantAxis);
      const d = r.deconstruction as any;
      if (!d) continue;
      bump(kind, d.kind);
      for (const b of d.bands ?? []) {
        bump(frieze, b.frieze?.group);
        if (typeof b.periodRel === "number") periodRel.push(b.periodRel);
        if (typeof b.thicknessRel === "number") thick.push(b.thicknessRel);
        if (typeof b.breaks?.ratio === "number") brk.push(b.breaks.ratio);
        for (const g of b.grammar?.figures ?? []) bump(fig, g);
      }
      if (d.wallpaper) bump(wall, String(d.wallpaper.rotationOrder));
      if (d.rosette) bump(ros, d.rosette.group);
    }
    const med: Record<string, number> = {};
    for (const k of NUM) { const m = median(nums[k]!); if (m !== null) med[k] = r3(m); }
    const pm = median(periodRel), tm = median(thick), bm = median(brk);
    out.push({
      tradition, n: rs.length, labelConfidence: r3(byText / rs.length),
      kind: normalize(kind), frieze: normalize(frieze), wallpaperRotation: normalize(wall), rosette: normalize(ros),
      dominantAxis: normalize(axis), grammarFigures: normalize(fig), median: med,
      band: { periodRel: pm === null ? null : r3(pm), thicknessRel: tm === null ? null : r3(tm), breaksRatio: bm === null ? null : r3(bm) },
    });
  }
  return out.sort((a, b) => b.n - a.n);
}

export type BlendTarget = {
  weights: Record<string, number>;
  /** Symmetry follows the dominant tradition (docs/BLEND-ENGINE.md §Composition 2). */
  dominant: string;
  friezeGroup: string | null;
  frieze: Dist;
  kind: Dist;
  median: Record<string, number>;
  periodRel: number | null;
  grammarFigures: Dist;
  warnings: string[];
};

/** Mix profiles by weight. Throws on unknown or non-selectable traditions (fail closed). */
export function blend(profiles: StyleProfile[], weights: Record<string, number>, minN = 30): BlendTarget {
  const warnings: string[] = [];
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  if (!(total > 0)) throw new Error("blend: weights must sum to more than 0");
  const picked: [StyleProfile, number][] = [];
  for (const [t, w] of Object.entries(weights)) {
    if (!(SELECTABLE as readonly string[]).includes(t)) throw new Error(`blend: "${t}" is not a selectable tradition`);
    const p = profiles.find((x) => x.tradition === t) ?? profiles.find((x) => x.tradition === `${t} (by query)`);
    if (!p) throw new Error(`blend: no profile for "${t}" yet`);
    if (p.n < minN) warnings.push(`${t}: only ${p.n} analysed objects; profile is provisional`);
    if (p.labelConfidence < 0.5) warnings.push(`${t}: most labels come from search queries, not catalogue text`);
    if (STRUCTURE_ONLY.has(t)) warnings.push(`${t}: contributes symmetry, rhythm and density only — no motifs, no tribal names, never marketed as Native-made`);
    picked.push([p, w / total]);
  }
  const mix = (get: (p: StyleProfile) => Dist): Dist => {
    const o: Dist = {};
    for (const [p, w] of picked) for (const [k, v] of Object.entries(get(p))) o[k] = (o[k] ?? 0) + v * w;
    return normalize(o);
  };
  const med: Record<string, number> = {};
  for (const k of NUM) {
    let s = 0, ws = 0;
    for (const [p, w] of picked) if (typeof p.median[k] === "number") { s += p.median[k]! * w; ws += w; }
    if (ws) med[k] = r3(s / ws);
  }
  let pr = 0, pw = 0;
  for (const [p, w] of picked) if (p.band.periodRel !== null) { pr += p.band.periodRel * w; pw += w; }
  const [dom] = [...picked].sort((a, b) => b[1] - a[1])[0]!;
  const domFrieze = Object.keys(dom.frieze)[0] ?? null;
  return {
    weights: Object.fromEntries(picked.map(([p, w]) => [p.tradition, r3(w)])), dominant: dom.tradition,
    friezeGroup: domFrieze, frieze: mix((p) => p.frieze), kind: mix((p) => p.kind), median: med,
    periodRel: pw ? r3(pr / pw) : null, grammarFigures: mix((p) => p.grammarFigures), warnings,
  };
}
