/**
 * Held-out evaluation: leave one source group out, refit on the rest, and score the held-out motifs against the
 * independent-cell baseline. Groups (object, book, chart author) never straddle the split. Promotion of a model
 * should rest on this, not on how many images it saw.
 */
import { admit, baselineLogLikelihood, fit, logLikelihood, type FitOptions, type MotifRecord } from "./model.ts";
import { parseChart } from "./grid.ts";

export interface HeldOut { group: string; id: string; tradition: string; learned: number; baseline: number; gain: number }
export interface Evaluation { folds: number; heldOut: HeldOut[]; meanGain: number; wins: number; independentSourceGroups: number; caveat: string | null }

export function leaveOneGroupOut(records: MotifRecord[], opts: FitOptions = {}): Evaluation {
  const { admitted } = admit(records);
  const groups = [...new Set(admitted.map((a) => a.record.sourceGroup))];
  const heldOut: HeldOut[] = [];
  for (const group of groups) {
    const train = admitted.filter((a) => a.record.sourceGroup !== group).map((a) => a.record);
    const { model } = fit(train, opts);
    for (const a of admitted.filter((x) => x.record.sourceGroup === group)) {
      const sub = model.traditions[a.record.tradition];
      if (!sub) continue; // the tradition has no other group to learn from
      const g = parseChart(a.record.chart), learned = logLikelihood(g, sub), baseline = baselineLogLikelihood(g, sub);
      heldOut.push({ group, id: a.record.id, tradition: a.record.tradition, learned, baseline, gain: learned - baseline });
    }
  }
  const independent = new Set(admitted.filter((a) => a.record.provenance.independentSource).map((a) => a.record.sourceGroup)).size;
  return {
    folds: groups.length, heldOut,
    meanGain: heldOut.reduce((s, h) => s + h.gain, 0) / Math.max(1, heldOut.length),
    wins: heldOut.filter((h) => h.gain > 0).length,
    independentSourceGroups: independent,
    caveat: independent < 30 ? `only ${independent} independent historical source groups: results show the method works, not that it has learned a tradition` : null,
  };
}
