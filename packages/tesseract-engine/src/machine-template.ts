import type {ConfidenceState,Measurement,MachineEnvelope} from "./manufacturing";

export type FrameType="flat-hoop"|"border-frame"|"tubular"|"cap"|"clamp";
export type StitchFileFormat="DST"|"DSB"|"DSZ"|"EXP"|"PES"|"JEF"|"VP3"|"XXX";

export interface MachineTemplate extends MachineEnvelope{
  confidence:ConfidenceState;
  heads:number;
  needlesPerHead:number;
  frames:readonly FrameType[];
  acceptedFormats:readonly StitchFileFormat[];
  maxColors:number;
  registrationToleranceMm:number;
  maxPracticalStitches?:number;
  maxContinuousRunMinutes?:number;
  notes:readonly string[];
}

const m=(value:number,sourceId:string):Measurement=>({value,unit:"mm",confidence:"reference-published",sourceId});

/**
 * REFERENCE templates only. They constrain generation conservatively until the
 * actual ASCEND manufacturer/machine setup is measured and promoted.
 */
export const MACHINE_TEMPLATES:Record<string,MachineTemplate>={
  "brother-pr1055x-reference":{
    id:"brother-pr1055x-reference",maker:"Brother",model:"PR1055X",process:"embroidery",
    fieldX:m(356,"production-poa:brother-pr1055x"),fieldY:m(203,"production-poa:brother-pr1055x"),
    supportsTubular:false,supportsFinishedSleeve:false,maxStitchesPerMinute:1000,
    sourceId:"production-poa:brother-pr1055x",confidence:"reference-published",
    heads:1,needlesPerHead:10,frames:["flat-hoop"],acceptedFormats:["PES","DST"],
    maxColors:10,registrationToleranceMm:1.0,maxPracticalStitches:80000,maxContinuousRunMinutes:90,
    notes:["Prototype/semi-industrial reference profile.","Use flat pattern pieces for sleeve work unless a validated accessory/profile says otherwise."]
  },
  "tajima-tmbp2-sc-reference":{
    id:"tajima-tmbp2-sc-reference",maker:"Tajima",model:"TMBP2-SC",process:"embroidery",
    fieldX:m(360,"production-poa:tajima-tmbp2-sc"),fieldY:m(500,"production-poa:tajima-tmbp2-sc"),
    supportsTubular:true,supportsFinishedSleeve:true,maxStitchesPerMinute:1200,
    sourceId:"production-poa:tajima-tmbp2-sc",confidence:"reference-published",
    heads:1,needlesPerHead:15,frames:["flat-hoop","border-frame","tubular","cap","clamp"],acceptedFormats:["DST"],
    maxColors:15,registrationToleranceMm:0.8,maxPracticalStitches:120000,maxContinuousRunMinutes:120,
    notes:["Industrial reference profile.","Tubular/finished-sleeve capability remains reference until the actual factory setup is validated."]
  },
  "industrial-multihead-generic":{
    id:"industrial-multihead-generic",maker:"Generic",model:"Manufacturer-validated multihead",process:"embroidery",
    fieldX:{value:0,unit:"mm",confidence:"reference-published",sourceId:"manufacturer-required"},
    fieldY:{value:0,unit:"mm",confidence:"reference-published",sourceId:"manufacturer-required"},
    supportsTubular:false,supportsFinishedSleeve:false,sourceId:"manufacturer-required",confidence:"reference-published",
    heads:1,needlesPerHead:1,frames:[],acceptedFormats:["DST"],maxColors:1,registrationToleranceMm:1.0,
    notes:["Placeholder template. Field, heads, needles, frames, speed and tolerances must be supplied by the selected manufacturer before production validation."]
  }
};

export function machineTemplate(id:string|undefined):MachineTemplate|undefined{
  return id?MACHINE_TEMPLATES[id]:undefined;
}

export function assertUsableMachineTemplate(t:MachineTemplate):void{
  if(!(t.fieldX.value>0&&t.fieldY.value>0))throw new Error("machine template requires measured embroidery field");
  if(!(t.heads>=1&&t.needlesPerHead>=1&&t.maxColors>=1))throw new Error("machine template requires head/needle/color capacity");
  if(!t.acceptedFormats.length)throw new Error("machine template requires at least one stitch-file format");
  if(!(t.registrationToleranceMm>0))throw new Error("machine template requires registration tolerance");
}
