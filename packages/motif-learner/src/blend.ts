/**
 * Amalgamation of traditions: one sub-model built from several, so the generator can make motifs that carry the
 * construction of more than one tradition (Ukrainian with English samplers, with tatreez …).
 *
 *  - mode "mix": the local construction is a weighted mixture, so a motif may use any parent's ways of building
 *    (Ukrainian diagonals beside English stepped borders);
 *  - mode "common": a weighted geometric mean, so only constructions plausible in every parent survive (the ground
 *    the traditions share).
 * Colour comes from one named parent (structure from one, palette from another) or from the weighted mixture.
 * Every parent's references stay in the near-copy gate, so a blend can copy none of them.
 * A blend is a request-time object, never a pooled fit: the traditions themselves stay separate.
 */
import { parseChart } from "./grid.ts";
import { logLikelihood, type SubModel } from "./model.ts";
import { GROUPS, type Group } from "./symmetry.ts";

export type BlendMode = "mix" | "common";
export interface BlendPart { sub: SubModel; weight: number }

export function blend(parts: BlendPart[], o: { mode?: BlendMode; colourFrom?: string } = {}): SubModel {
  const mode = o.mode ?? "mix";
  if (parts.length < 2) throw new Error("blend-needs-two-traditions");
  const total = parts.reduce((s, p) => s + p.weight, 0);
  if (!(total > 0) || parts.some((p) => p.weight < 0)) throw new Error("blend-weights-must-be-positive");
  const w = parts.map((p) => p.weight / total), subs = parts.map((p) => p.sub);

  const n = subs[0]!.patch.counts.length;
  const prob = (s: SubModel, k: number) => (s.patch.counts[k]! + s.patch.alpha) / (s.patch.total + n * s.patch.alpha);
  const raw = Array.from({ length: n }, (_, k) =>
    mode === "common" ? Math.exp(subs.reduce((a, s, i) => a + w[i]! * Math.log(prob(s, k)), 0)) : subs.reduce((a, s, i) => a + w[i]! * prob(s, k), 0));
  const z = raw.reduce((a, b) => a + b, 0), scale = 1e6;

  let colour: SubModel["colour"] = null;
  if (o.colourFrom) {
    const src = subs.find((s) => s.key === o.colourFrom);
    if (!src) throw new Error(`blend-colour-parent-missing:${o.colourFrom}`);
    colour = src.colour;
  } else {
    const coloured = subs.map((s, i) => ({ c: s.colour, w: w[i]! })).filter((x) => x.c);
    const cw = coloured.reduce((a, x) => a + x.w, 0);
    if (coloured.length) {
      const L = coloured[0]!.c!.layers.length, C = coloured[0]!.c!.layers[0]!.length;
      const layers = Array.from({ length: L }, (_, l) => Array.from({ length: C }, (_, c) =>
        coloured.reduce((a, x) => { const row = x.c!.layers[l]!, rs = row.reduce((p, q) => p + q, 0); return a + (x.w / cw) * (rs ? row[c]! / rs : 0); }, 0) * 1000));
      const same = coloured.reduce((a, x) => a + (x.w / cw) * (x.c!.adjacent ? x.c!.sameAdjacent / x.c!.adjacent : 0), 0);
      colour = { layers, sameAdjacent: same * 1000, adjacent: 1000 };
    }
  }

  const symmetry = Object.fromEntries(GROUPS.map((g) => [g, subs.reduce((a, s, i) => a + w[i]! * (s.symmetry[g as Group] / Math.max(1, s.examples)), 0) * 100])) as Record<Group, number>;
  const sizes = subs.flatMap((s, i) => Array.from({ length: Math.max(1, Math.round(w[i]! * 100)) }, (_, k) => s.sizes[Math.floor((k * s.sizes.length) / Math.max(1, Math.round(w[i]! * 100)))]!));
  const name = subs.map((s, i) => `${s.key}×${w[i]!.toFixed(2)}`).join("+");
  const sub: SubModel = {
    key: `blend(${mode}):${name}${o.colourFrom ? `;colour=${o.colourFrom}` : ""}`,
    examples: subs.reduce((a, s) => a + s.examples, 0),
    sourceGroups: subs.reduce((a, s) => a + s.sourceGroups, 0),
    independentSources: subs.reduce((a, s) => a + s.independentSources, 0),
    patch: { alpha: 0, counts: raw.map((p) => (p / z) * scale), total: scale },
    colour, symmetry, sizes,
    density: { mean: subs.reduce((a, s, i) => a + w[i]! * s.density.mean, 0), sd: subs.reduce((a, s, i) => a + w[i]! * s.density.sd, 0) },
    islands: { mean: subs.reduce((a, s, i) => a + w[i]! * s.islands.mean, 0) },
    plausibilityFloor: -Infinity,
    references: subs.flatMap((s) => s.references),
    parents: subs.map((s, i) => ({ key: s.key, weight: +w[i]!.toFixed(3) })),
  };
  const scores = sub.references.map((r) => logLikelihood(parseChart(r.chart), sub)).sort((a, b) => a - b);
  sub.plausibilityFloor = scores[Math.floor(scores.length * 0.1)]! - 0.25;
  return sub;
}

/** How much a motif reads as each parent: its fit under each tradition, relative to that tradition's own floor. */
export const parentFit = (g: ReturnType<typeof parseChart>, subs: SubModel[]) =>
  subs.map((s) => ({ tradition: s.key, logLikelihood: +logLikelihood(g, s).toFixed(3), aboveFloor: +(logLikelihood(g, s) - s.plausibilityFloor).toFixed(3) }));
