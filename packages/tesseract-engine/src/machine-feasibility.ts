import type {MachineTemplate} from "./machine-template";
import type {StitchIrObject} from "./production-stitch-ir";

/**
 * Conservative, single-field reference feasibility only.
 * Passing this gate NEVER implies digitizer approval, manufacturer validation,
 * a physical sew-out, or a production-ready DST.
 */
export type MachineFeasibility={
  machineId:string;
  scope:"single-field-reference-check";
  errors:string[];
  warnings:string[];
};

export function assessSingleFieldMachine(
  machine:MachineTemplate,
  objects:readonly StitchIrObject[],
  widthMm:number,
  heightMm:number
):MachineFeasibility{
  const errors:string[]=[];
  const warnings:string[]=[
    "Machine dimensions and capabilities are reference data until verified on the selected manufacturer's actual equipment.",
    "Single-field fit does not verify hoop clearance, fixture access, material recipe, stitch density, or physical sew-out."
  ];
  const x=machine.fieldX.value,y=machine.fieldY.value;
  const validField=Number.isFinite(x)&&Number.isFinite(y)&&x>0&&y>0&&
    machine.fieldX.unit==="mm"&&machine.fieldY.unit==="mm"&&
    !!machine.fieldX.sourceId&&!!machine.fieldY.sourceId;
  if(!validField)errors.push("machine-field-unverified");
  else if(Number.isFinite(widthMm)&&Number.isFinite(heightMm)&&widthMm>0&&heightMm>0&&
    !((widthMm<=x&&heightMm<=y)||(widthMm<=y&&heightMm<=x)))
    errors.push("machine-field-exceeded:segmentation-required");

  if(!Number.isInteger(machine.heads)||machine.heads<1||
    !Number.isInteger(machine.needlesPerHead)||machine.needlesPerHead<1)
    errors.push("machine-head-or-needle-capacity-unverified");
  if(!Number.isInteger(machine.maxColors)||machine.maxColors<1)
    errors.push("machine-color-capacity-unverified");
  else if(new Set(objects.map(o=>o.color)).size>machine.maxColors)
    errors.push("machine-color-capacity-exceeded");
  if(!Array.isArray(machine.acceptedFormats)||machine.acceptedFormats.length===0)
    errors.push("machine-format-unverified");
  if(!Array.isArray(machine.frames)||machine.frames.length===0)
    errors.push("machine-frame-unverified");
  if(!Number.isFinite(machine.registrationToleranceMm)||machine.registrationToleranceMm<=0)
    errors.push("machine-registration-tolerance-unverified");
  if(!machine.sourceId||!machine.confidence)
    errors.push("machine-provenance-unverified");
  if(machine.confidence==="reference-published")
    warnings.push("Reference machine profile: no manufacturer or production approval.");
  else
    warnings.push("Machine profile confidence is metadata only; no physical validation is inferred by this check.");
  return {machineId:machine.id,scope:"single-field-reference-check",errors,warnings};
}
