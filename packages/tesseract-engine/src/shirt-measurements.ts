import type {SizeProfile} from "./garment";

export type ShirtResolvedMeasurements={
 neckMm:number;chestMm:number;waistMm:number;shoulderMm:number;sleeveMm:number;
 wristMm:number;bodyLengthMm:number;bicepMm:number;
 garmentChestMm:number;garmentWaistMm:number;collarMm:number;cuffMm:number;
 upperSleeveCircumferenceMm:number;
};

export type MeasurementResolution={
 measurements?:ShirtResolvedMeasurements;errors:string[];warnings:string[];
 sourceState:"pattern-specified";
};

const required=["neckMm","chestMm","waistMm","shoulderMm","sleeveMm","wristMm","bodyLengthMm"] as const;

export function resolvePilotShirtMeasurements(size:SizeProfile):MeasurementResolution{
 const errors:string[]=[],warnings:string[]=[];
 for(const k of required)if(!size.body[k]||size.body[k]!<=0)errors.push(`missing-or-invalid:${k}`);
 if(errors.length)return {errors,warnings,sourceState:"pattern-specified"};
 const b=size.body as Required<typeof size.body>;
 const chestEase=size.easeMm?.chest??120,waistEase=size.easeMm?.waist??120,neckEase=size.easeMm?.neck??15;
 // These are engine defaults, not historical or manufacturer-validated pattern rules.
 const bicepMm=Math.max(300,b.chestMm*.34);
 const upperSleeveCircumferenceMm=bicepMm+80;
 const cuffMm=Math.max(b.wristMm+55,210);
 if(!size.easeMm?.chest)warnings.push("default-chest-ease:120mm");
 if(!size.easeMm?.waist)warnings.push("default-waist-ease:120mm");
 if(!size.easeMm?.neck)warnings.push("default-neck-ease:15mm");
 return {errors,warnings,sourceState:"pattern-specified",measurements:{
  neckMm:b.neckMm,chestMm:b.chestMm,waistMm:b.waistMm,shoulderMm:b.shoulderMm,sleeveMm:b.sleeveMm,
  wristMm:b.wristMm,bodyLengthMm:b.bodyLengthMm,bicepMm,
  garmentChestMm:b.chestMm+chestEase,garmentWaistMm:b.waistMm+waistEase,collarMm:b.neckMm+neckEase,
  cuffMm,upperSleeveCircumferenceMm
 }};
}

export const PILOT_SIZE_PROFILES:SizeProfile[]=[
 {id:"pilot-s",label:"Pilot S",standardSize:"S",body:{neckMm:381,chestMm:914,waistMm:813,shoulderMm:445,sleeveMm:838,wristMm:165,bodyLengthMm:762}},
 {id:"pilot-m",label:"Pilot M",standardSize:"M",body:{neckMm:406,chestMm:1016,waistMm:914,shoulderMm:470,sleeveMm:864,wristMm:178,bodyLengthMm:787}},
 {id:"pilot-l",label:"Pilot L",standardSize:"L",body:{neckMm:432,chestMm:1118,waistMm:1016,shoulderMm:495,sleeveMm:889,wristMm:191,bodyLengthMm:813}},
 {id:"pilot-xl",label:"Pilot XL",standardSize:"XL",body:{neckMm:457,chestMm:1219,waistMm:1118,shoulderMm:521,sleeveMm:914,wristMm:203,bodyLengthMm:838}},
 {id:"pilot-xxl",label:"Pilot XXL",standardSize:"XXL",body:{neckMm:483,chestMm:1321,waistMm:1219,shoulderMm:546,sleeveMm:940,wristMm:216,bodyLengthMm:864}}
];
// Pilot body profiles are provisional engine fixtures. Replace with the selected ASCEND block/tech-pack grading before production.
