import type {GarmentZoneKind} from "./garment";
import type {PatternPiece,PatternPieceKind,Point,ShirtPattern} from "./pattern";
import {resolvePilotShirtMeasurements} from "./shirt-measurements";
import type {SizeProfile} from "./garment";

const rect=(w:number,h:number):Point[]=>[{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}];
const zone=(kind:GarmentZoneKind,w:number,h:number,wrapGroupId?:string)=>({kind,polygon:rect(w,h),wrapGroupId});

function piece(id:string,kind:PatternPieceKind,w:number,h:number,zones:ReturnType<typeof zone>[]):PatternPiece{
 return {id,kind,cutQuantity:1,mirror:false,outline:rect(w,h),grainline:{from:{x:w/2,y:10},to:{x:w/2,y:h-10}},seams:[],noGoZones:[],designZones:zones,sourceState:"reference"};
}

export function buildPilotShirtPattern(size:SizeProfile):ShirtPattern{
 const r=resolvePilotShirtMeasurements(size);if(!r.measurements)throw new Error(r.errors.join(","));
 const m=r.measurements,halfChest=m.garmentChestMm/4,bodyH=m.bodyLengthMm;
 const sleeveW=m.upperSleeveCircumferenceMm/2,sleeveH=m.sleeveMm*.78,cuffW=m.cuffMm/2;
 const frontL=piece("front-left","front-left",halfChest,bodyH,[zone("chest",halfChest,bodyH*.55),zone("placket",45,bodyH),zone("hem",halfChest,70)]);
 const frontR=piece("front-right","front-right",halfChest,bodyH,[zone("chest",halfChest,bodyH*.55),zone("placket",45,bodyH),zone("hem",halfChest,70)]);
 const back=piece("back","back",halfChest*2,bodyH,[zone("back",halfChest*2,bodyH*.7),zone("hem",halfChest*2,70)]);
 const yoke=piece("yoke","yoke",m.shoulderMm,180,[zone("yoke",m.shoulderMm,180),zone("shoulder",m.shoulderMm,180)]);
 const sl=piece("sleeve-left","sleeve-left",sleeveW,sleeveH,[zone("sleeve",sleeveW,sleeveH,"left-arm")]);
 const sr=piece("sleeve-right","sleeve-right",sleeveW,sleeveH,[zone("sleeve",sleeveW,sleeveH,"right-arm")]);
 const cl=piece("cuff-left","cuff-left",cuffW,120,[zone("cuff",cuffW,120,"left-arm")]);
 const cr=piece("cuff-right","cuff-right",cuffW,120,[zone("cuff",cuffW,120,"right-arm")]);
 const collar=piece("collar","collar",m.collarMm/2,110,[zone("collar",m.collarMm/2,110,"neck")]);
 const pieces=[frontL,frontR,back,yoke,sl,sr,cl,cr,collar];
 const seamGraph=[
  ["front-left","yoke"],["front-right","yoke"],["back","yoke"],
  ["yoke","sleeve-left"],["yoke","sleeve-right"],["sleeve-left","cuff-left"],["sleeve-right","cuff-right"],["yoke","collar"]
 ].map(([a,b],i)=>({fromPiece:a!,fromSeam:`join-${i}-a`,toPiece:b!,toSeam:`join-${i}-b`}));
 return {id:`pilot-shirt:${size.id}`,size,pieces,seamGraph};
}
