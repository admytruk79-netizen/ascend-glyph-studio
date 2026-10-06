/** Wrap-around fit for bands that close on themselves (cuff, collar, sleeve, boot shaft, diary spine). */

export interface WrapInput {
  /** Finished band length, mm. */
  finishedLength: number;
  /** Seam allowance per end, mm. */
  seamAllowance?: number;
  /** Overlap taken by a button/placket closure, mm. */
  closureOverlap?: number;
  /** The design's natural repeat period, mm. */
  period: number;
  /** Allowed stretch or squeeze of the period (0.05 = ±5%). */
  tolerance?: number;
  /** Length of an optional event / void segment (the `B` in `AAA | B | AAA`), mm. */
  eventLength?: number;
}

export interface WrapFit {
  usableLength: number;
  repeats: number;
  fittedPeriod: number;
  /** fittedPeriod / period − 1 */
  deviation: number;
  /** True when an event segment was needed to absorb the remainder. */
  usesEvent: boolean;
  eventLength: number;
  /** Seam sits on a segment boundary (offset 0 of the band) — never through a motif. */
  seamAt: "repeat-boundary" | "event-centre";
}

export function usableLength(i: WrapInput): number {
  return i.finishedLength - 2 * (i.seamAllowance ?? 0) - (i.closureOverlap ?? 0);
}

/** Fit an integer number of repeats; fall back to an event segment; throw if nothing fits (fail closed). */
export function fitWrap(i: WrapInput): WrapFit {
  const L = usableLength(i);
  const P = i.period;
  const tol = i.tolerance ?? 0.05;
  if (!(L > 0) || !(P > 0)) throw new Error(`wrap: invalid length ${L} or period ${P}`);
  const base = Math.max(1, Math.round(L / P));
  for (const n of [base, base - 1, base + 1]) {
    if (n < 1) continue;
    const Pp = L / n;
    if (Math.abs(Pp / P - 1) <= tol + 1e-12)
      return { usableLength: L, repeats: n, fittedPeriod: Pp, deviation: Pp / P - 1, usesEvent: false, eventLength: 0, seamAt: "repeat-boundary" };
  }
  // event segment: choose n so the event takes the remainder within [0.5, 2] × period (or the requested length ± tol)
  const ev = i.eventLength;
  for (let n = Math.floor(L / P); n >= 1; n--) {
    const rest = L - n * P;
    if (ev !== undefined) {
      const Pp = (L - ev) / n;
      if (Math.abs(Pp / P - 1) <= tol + 1e-12)
        return { usableLength: L, repeats: n, fittedPeriod: Pp, deviation: Pp / P - 1, usesEvent: true, eventLength: ev, seamAt: "event-centre" };
    } else if (rest >= 0.5 * P && rest <= 2 * P) {
      return { usableLength: L, repeats: n, fittedPeriod: P, deviation: 0, usesEvent: true, eventLength: rest, seamAt: "event-centre" };
    }
  }
  throw new Error(`wrap: no fit for L=${L.toFixed(1)} mm, P=${P} mm within ±${tol * 100}%`);
}

/** Grading table: one fit per size. */
export function gradeWrap(sizes: Record<string, number>, base: Omit<WrapInput, "finishedLength">): Record<string, WrapFit> {
  const out: Record<string, WrapFit> = {};
  for (const [size, len] of Object.entries(sizes)) out[size] = fitWrap({ ...base, finishedLength: len });
  return out;
}

/** Geometry pre-scale per axis: (1 + takeup) / (1 − shrinkage). Shrinkage is 0 for fabric washed before embroidery. */
export function compensationScale(takeup: number, shrinkage: number): number {
  if (shrinkage >= 1 || shrinkage < 0 || takeup < 0) throw new Error("compensation: invalid input");
  return (1 + takeup) / (1 - shrinkage);
}
