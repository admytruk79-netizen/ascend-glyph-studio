/**
 * Blend engine v0.1: request (tradition weights + meanings + product zone) → band design candidates.
 *
 *  meanings  → motif choice (with the evidence grades from the semantics file)
 *  traditions→ symmetry group, proportions, event probability, palette (measured profiles when given,
 *              literature priors otherwise; structure-only traditions never touch motifs or palette)
 *  zone      → wrap-around fit (integer repeats, seam on a boundary), band height, rails
 *
 * Every candidate carries its lineage and is self-checked: the analyser must read back the symmetry
 * group the generator intended, and the stitch engine's gate must accept it.
 */
import { EVENT_MOTIFS, UNIT_MOTIFS, type Motif, type Poly } from "./motifs.js";
import { FRIEZE_GROUPS, friezeCell, type FriezeGroup } from "./symmetry.js";
import { PRIORS } from "./priors.js";
import { ASCEND_EVENTS, ASCEND_PALETTE, ASCEND_UNITS } from "./ascend.js";

export interface Request {
  weights: Record<string, number>;
  meanings: string[];
  zone: { name: string; finishedLength: number; height: number; seamAllowance?: number; closureOverlap?: number };
  /** Measured style profiles (scripts/corpus/profiles.ts); frieze distributions override priors when present. */
  profiles?: { tradition: string; n: number; frieze: Record<string, number> }[];
  seed?: number;
  /** "ascend" (default): motifs and palette from Oleksandr's drawings; "folk": the provisional folk-geometry set. */
  vocabulary?: "ascend" | "folk";
}

export interface Candidate {
  id: string;
  group: FriezeGroup;
  motif: Motif;
  event: Motif | null;
  period: number;
  repeats: number;
  rails: boolean;
  palette: { motif: string; event: string; rails: string };
  /** Polygons in mm, band coordinates (x along the band from the seam, y across). */
  shapes: { id: string; role: "motif" | "event" | "rail"; color: string; poly: Poly }[];
  lineage: Lineage;
}

export interface Lineage {
  request: { weights: Record<string, number>; meanings: string[]; zone: string };
  structure: { group: FriezeGroup; groupSource: "measured-profiles" | "literature-priors"; groupDistribution: Record<string, number>; period: number; repeats: number; grammar: string };
  meaning: { meaning: string; motif: string; semantics: string[] }[];
  structureOnly: string[];
}

/** ASCEND meaning map (ASCEND concepts, not folk-graded claims): protection = orbit around an axis,
 * family = mirrored eye-seed pair, ascent = peaks, growth = roots/lotus, light = sun on the horizon. */
const MEANING_ASCEND: Record<string, { unit: string; event?: string; rails?: boolean; mirror?: boolean }> = {
  protection: { unit: "orbit", event: "heartStar", rails: true },
  family: { unit: "eyeSeed", mirror: true },
  ascent: { unit: "peak" },
  growth: { unit: "rootAxis", event: "lotus" },
  life: { unit: "rootAxis", event: "lotus" },
  fertility: { unit: "rootAxis", event: "lotus" },
  harvest: { unit: "rootAxis", event: "lotus" },
  sun: { unit: "peak", event: "sunHorizon" },
  light: { unit: "peak", event: "sunHorizon" },
  road: { unit: "orbit" },
  water: { unit: "orbit" },
  heart: { unit: "eyeSeed", event: "heartStar" },
};

/** Meaning → motifs (generator motif, preferred event). Unknown meanings fall back to the hook. */
const MEANING: Record<string, { unit: string; event?: string; rails?: boolean; mirror?: boolean }> = {
  protection: { unit: "hook", event: "rhombRing", rails: true },
  family: { unit: "hook", mirror: true },
  ascent: { unit: "branch" },
  growth: { unit: "branch" },
  life: { unit: "branch", event: "star8" },
  fertility: { unit: "seedRhomb" },
  harvest: { unit: "seedRhomb" },
  sun: { unit: "hook", event: "sun6" },
  light: { unit: "hook", event: "star8" },
  road: { unit: "wave" },
  water: { unit: "wave" },
};

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

export function mixFrieze(req: Request): { dist: Record<string, number>; source: Lineage["structure"]["groupSource"] } {
  const total = Object.values(req.weights).reduce((a, b) => a + b, 0);
  const dist: Record<string, number> = {};
  let measured = 0;
  for (const [t, w] of Object.entries(req.weights)) {
    if (!PRIORS[t]) throw new Error(`unknown tradition "${t}"`);
    const prof = req.profiles?.find((p) => p.tradition === t && p.n >= 30);
    const src = prof ? prof.frieze : PRIORS[t]!.frieze;
    if (prof) measured++;
    for (const [g, v] of Object.entries(src)) dist[g] = (dist[g] ?? 0) + (v as number) * (w / total);
  }
  return { dist, source: measured ? "measured-profiles" : "literature-priors" };
}

export function generate(req: Request, count = 6): Candidate[] {
  const rand = rng(req.seed ?? 1);
  const total = Object.values(req.weights).reduce((a, b) => a + b, 0);
  if (!(total > 0)) throw new Error("weights must sum to more than 0");
  const { dist, source } = mixFrieze(req);
  const structureOnly = Object.keys(req.weights).filter((t) => t.includes("(structure only)"));
  // palette and proportions from motif-bearing traditions only
  const motifTraditions = Object.entries(req.weights).filter(([t]) => !structureOnly.includes(t)).sort((a, b) => b[1] - a[1]);
  const lead = PRIORS[motifTraditions[0]?.[0] ?? "Ukrainian"]!;
  const aspect = Object.entries(req.weights).reduce((a, [t, w]) => a + PRIORS[t]!.aspect * (w / total), 0);
  const eventP = Object.entries(req.weights).reduce((a, [t, w]) => a + PRIORS[t]!.event * (w / total), 0);

  const ascend = (req.vocabulary ?? "ascend") === "ascend";
  const MAP = ascend ? MEANING_ASCEND : MEANING;
  const UNITS: Record<string, Motif> = ascend ? ASCEND_UNITS : UNIT_MOTIFS;
  const EVENTS: Record<string, Motif> = ascend ? ASCEND_EVENTS : EVENT_MOTIFS;
  const meaningSpecs = req.meanings.map((m) => ({ m, spec: MAP[m.toLowerCase()] ?? { unit: ascend ? "orbit" : "hook" } }));
  const wantMirror = meaningSpecs.some((x) => x.spec.mirror);
  const rails = meaningSpecs.some((x) => x.spec.rails);
  const eventId = meaningSpecs.find((x) => x.spec.event)?.spec.event;
  const units = [...new Set(meaningSpecs.map((x) => x.spec.unit))];

  const out: Candidate[] = [];
  const seen = new Set<string>();
  for (let k = 0, tries = 0; out.length < count && tries < count * 8; tries++) {
    // symmetry: sample from the blended distribution; "family" (mirrored pair) restricts to mirror groups
    let groups = FRIEZE_GROUPS.filter((g) => (dist[g] ?? 0) > 0);
    if (wantMirror) groups = groups.filter((g) => g === "p1m1" || g === "p2mm" || g === "p2mg");
    if (!groups.length) groups = ["p1m1"];
    const z = groups.reduce((a, g) => a + (dist[g] ?? 0.01), 0);
    let r = rand() * z, group: FriezeGroup = groups[0]!;
    for (const g of groups) { r -= dist[g] ?? 0.01; if (r <= 0) { group = g; break; } }

    const motif = UNITS[units[tries % units.length] ?? (ascend ? "orbit" : "hook")]!;
    const railH = rails ? 2.2 : 0, gap = rails ? 1.5 : 0;
    const inner = req.zone.height - 2 * (railH + gap);
    const wantPeriod = inner * aspect * (group === "p2mg" ? 1.6 : group === "p1" || group === "p11m" ? 0.7 : 1) * (0.9 + 0.2 * rand());
    const useEvent = !!eventId && rand() < Math.max(0.5, eventP);
    const event = useEvent ? EVENTS[eventId!]! : null;
    const usable = req.zone.finishedLength - 2 * (req.zone.seamAllowance ?? 0) - (req.zone.closureOverlap ?? 0);
    const eventLen = event ? inner * 1.25 : 0;
    const repeats = Math.max(2, Math.round((usable - eventLen) / wantPeriod));
    const period = (usable - eventLen) / repeats;

    // ASCEND palette (from the drawings) leads; the lead tradition's colours are kept as the folk option
    const c = ascend
      ? { motif: ASCEND_PALETTE.royal, event: ASCEND_PALETTE.ember, rails: ASCEND_PALETTE.indigo }
      : { motif: lead.palette[0] ?? "#9b1c1c", event: lead.palette[1] ?? lead.palette[0] ?? "#1a1a1a", rails: lead.palette[1] ?? "#1a1a1a" };
    const shapes: Candidate["shapes"] = [];
    const y0 = railH + gap;
    const cell = friezeCell(motif.polys, group);
    const half = Math.floor(repeats / 2);
    let x = 0;
    for (let i = 0; i < repeats; i++) {
      if (event && i === half) {
        const s = inner * 0.95;
        for (const p of event.polys) shapes.push({ id: `event`, role: "event", color: c.event, poly: p.map((q) => ({ x: x + (eventLen - s) / 2 + q.x * s, y: y0 + (inner - s) / 2 + q.y * s })) });
        x += eventLen;
      }
      for (const p of cell) shapes.push({ id: `a${i}`, role: "motif", color: c.motif, poly: p.map((q) => ({ x: x + q.x * period, y: y0 + q.y * inner })) });
      x += period;
    }
    if (rails) for (const [n, yy] of [["top", railH / 2], ["bottom", req.zone.height - railH / 2]] as const)
      shapes.push({ id: `rail-${n}`, role: "rail", color: c.rails, poly: [{ x: 0, y: yy }, { x: usable, y: yy }] });

    const key = `${group}|${motif.id}|${event?.id ?? "-"}|${repeats}`;
    if (seen.has(key)) continue;
    seen.add(key);
    k++;
    const grammar = event ? `${"A".repeat(half)} | B | ${"A".repeat(repeats - half)}` : "A".repeat(repeats);
    out.push({
      id: `cand-${req.seed ?? 1}-${k}`, group, motif, event, period, repeats, rails, palette: c, shapes,
      lineage: {
        request: { weights: req.weights, meanings: req.meanings, zone: req.zone.name },
        structure: { group, groupSource: source, groupDistribution: Object.fromEntries(Object.entries(dist).map(([g, v]) => [g, Math.round(v * 1000) / 1000])), period: Math.round(period * 100) / 100, repeats, grammar },
        meaning: meaningSpecs.map(({ m, spec }) => ({ meaning: m, motif: spec.event && event ? `${spec.unit} + ${spec.event}` : spec.unit, semantics: [...(UNITS[spec.unit]?.semantics ?? []), ...(spec.event ? EVENTS[spec.event]?.semantics ?? [] : [])] })),
        structureOnly,
      },
    });
  }
  return out;
}

/** SVG preview (mm). */
export function toSvg(c: Candidate, height: number, ground = "#efe9dc"): string {
  const w = Math.max(...c.shapes.flatMap((s) => s.poly.map((p) => p.x)));
  const body = c.shapes.map((s) => s.role === "rail"
    ? `<line x1="${s.poly[0]!.x}" y1="${s.poly[0]!.y}" x2="${s.poly[1]!.x}" y2="${s.poly[1]!.y}" stroke="${s.color}" stroke-width="2.2"/>`
    : `<polygon points="${s.poly.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ")}" fill="${s.color}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w.toFixed(1)}mm" height="${height}mm" viewBox="0 0 ${w.toFixed(2)} ${height}"><rect width="100%" height="100%" fill="${ground}"/>${body}</svg>`;
}
