export type ConfidenceState="reference-published"|"pattern-specified"|"sample-measured"|"manufacturer-validated"|"production-validated";
export type Measurement={value:number;unit:"mm";confidence:ConfidenceState;sourceId?:string};
export type GarmentSurface={
 id:string;kind:"flat"|"cylinder"|"tapered-cylinder";
 length:Measurement;circumferenceStart?:Measurement;circumferenceEnd?:Measurement;
 seams:{position:number;kind:string}[];zones:string[];
};
export type MachineEnvelope={
 id:string;maker:string;model:string;process:"embroidery";
 fieldX:Measurement;fieldY:Measurement;supportsTubular:boolean;supportsFinishedSleeve:boolean;
 maxStitchesPerMinute?:number;sourceId:string;
};
export type ProjectionPlan={
 mode:"single-field"|"segmented-registration"|"flat-before-assembly"|"unsupported";
 segments:number;usableWidthMm:number;usableLengthMm:number;reasons:string[];
};
export function planEmbroidery(surface:GarmentSurface,machine:MachineEnvelope,bandWidthMm:number):ProjectionPlan{
 const reasons:string[]=[];const maxCirc=Math.max(surface.circumferenceStart?.value??0,surface.circumferenceEnd?.value??0);
 if(bandWidthMm>machine.fieldX.value&&bandWidthMm>machine.fieldY.value)return {mode:"unsupported",segments:0,usableWidthMm:0,usableLengthMm:0,reasons:["band-exceeds-machine-field"]};
 const long=Math.max(machine.fieldX.value,machine.fieldY.value),short=Math.min(machine.fieldX.value,machine.fieldY.value);
 if(surface.kind==="flat"&&surface.length.value<=long&&bandWidthMm<=short)return {mode:"single-field",segments:1,usableWidthMm:short,usableLengthMm:long,reasons};
 if(surface.kind!=="flat"&&machine.supportsTubular&&maxCirc<=long&&bandWidthMm<=short){
  reasons.push("tubular-wrap-compatible");return {mode:"single-field",segments:1,usableWidthMm:short,usableLengthMm:long,reasons};
 }
 const segments=Math.max(2,Math.ceil(Math.max(surface.length.value,maxCirc)/long));
 reasons.push("requires-registration");
 return {mode:machine.supportsFinishedSleeve?"segmented-registration":"flat-before-assembly",segments,usableWidthMm:short,usableLengthMm:long,reasons};
}
