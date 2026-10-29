import type {evaluateSurfaceLayout} from "./garment-surface-math";
import type {ConstructionEnvelope} from "./construction-envelope";

/**
 * Reject invalid final stitch-IR footprints before candidate ranking or persistence.
 * An approved digital layout is NOT a manufacturer-approved recipe or sew-out.
 * Allowed nested/enclosed pairs must already be resolved by evaluateSurfaceLayout.
 */
export function assessCandidateSurface(
  report: Pick<ReturnType<typeof evaluateSurfaceLayout>,"invalidPairs"|"seamCrossings">,
  seamPolicy:ConstructionEnvelope["seamPolicy"]
):{valid:boolean;errors:string[]}{
  const errors:string[]=[];
  if(report.invalidPairs.length)errors.push(`surface-collisions:${report.invalidPairs.length}`);
  if(seamPolicy==="avoid"&&report.seamCrossings.length)
    errors.push(`seam-crossings:${report.seamCrossings.join(",")}`);
  return {valid:errors.length===0,errors};
}
