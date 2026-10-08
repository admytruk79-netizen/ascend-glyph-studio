import type {GarmentZoneKind} from "./garment";
import type {PatternPiece,PatternPieceKind,Point,ShirtPattern} from "./pattern";
import {resolvePilotShirtMeasurements} from "./shirt-measurements";
import type {SizeProfile} from "./garment";
import {addConstructionNoGoZones} from "./pattern-projector";
import type {PilotBlockSpec} from "./pilot-block";
import {validatePilotBlockSpec} from "./pilot-block";

const rect=(w:number,h:number):Point[]=>[{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}];
const zone=(kind:GarmentZoneKind,w:number,h:number,wrapGroupId?:string)=>({kind,polygon:rect(w,h),wrapGroupId});

function piece(id:string,kind:PatternPieceKind,w:number,h:number,zones:ReturnType<typeof zone>[]):PatternPiece{
 return {id,kind,cutQuantity:1,mirror:false,outline:rect(w,h),grainline:{from:{x:w/2,y:10},to:{x:w/2,y:h-10}},seams:[],noGoZones:[],designZones:zones,sourceState:"reference"};
}

function connect(a:PatternPiece,b:PatternPiece,index:number){
 const aId=`join-${index}-a`,bId=`join-${index}-b`;
 a.seams.push({id:aId,kind:"construction",edge:"reference-edge",joins:{pieceId:b.id,seamId:bId},allowanceMm:10,crossDesignAllowed:true,registrationToleranceMm:2});
 b.seams.push({id:bId,kind:"construction",edge:"reference-edge",joins:{pieceId:a.id,seamId:aId},allowanceMm:10,crossDesignAllowed:true,registrationToleranceMm:2});
 return {fromPiece:a.id,fromSeam:aId,toPiece:b.id,toSeam:bId};
}

function sourcedPattern(size:SizeProfile,block:PilotBlockSpec):ShirtPattern{
 const byKind=new Map<PatternPieceKind,PatternPiece>();
 for(const supplied of Object.values(block.pieces)){
  if(!supplied)continue;
  const p:PatternPiece={id:supplied.kind,kind:supplied.kind,cutQuantity:1,mirror:false,
   outline:supplied.outline.map(q=>({...q})),grainline:{from:{...supplied.grainline.from},to:{...supplied.grainline.to}},
   seams:[],noGoZones:supplied.noGoZones.map(z=>({...z,polygon:z.polygon.map(q=>({...q}))})),
   designZones:supplied.designZones.map(z=>({...z,polygon:z.polygon.map(q=>({...q}))})),sourceState:block.sourceState};
  byKind.set(supplied.kind,p);
 }
 const seamGraph:ShirtPattern["seamGraph"]=[];
 for(const supplied of Object.values(block.pieces)){
  if(!supplied)continue;const p=byKind.get(supplied.kind)!;
  for(const seam of supplied.seams){
   const target=seam.joins?byKind.get(seam.joins.pieceKind):undefined;
   p.seams.push({id:seam.id,kind:seam.kind,edge:seam.edge,joins:seam.joins&&target?{pieceId:target.id,seamId:seam.joins.seamId}:undefined,
    allowanceMm:seam.allowanceMm,crossDesignAllowed:seam.crossDesignAllowed,registrationToleranceMm:seam.registrationToleranceMm});
   if(seam.joins&&target&&p.id<target.id)seamGraph.push({fromPiece:p.id,fromSeam:seam.id,toPiece:target.id,toSeam:seam.joins.seamId});
   // the seam allowance is folded into the seam: no embroidery within allowanceMm of the sourced seam path
   const path=seam.edgePath??[];
   for(let i=1;i<path.length;i++){
    const a=path[i-1]!,b=path[i]!,L=Math.hypot(b.x-a.x,b.y-a.y);if(L<1e-6)continue;
    const nx=-(b.y-a.y)/L*seam.allowanceMm,ny=(b.x-a.x)/L*seam.allowanceMm;
    p.noGoZones.push({id:`${p.id}:${seam.id}:allowance-${i}`,reason:`seam allowance (${seam.kind})`,polygon:[{x:a.x+nx,y:a.y+ny},{x:b.x+nx,y:b.y+ny},{x:b.x-nx,y:b.y-ny},{x:a.x-nx,y:a.y-ny}],clearanceMm:2});
   }
  }
 }
 return {id:`pilot-shirt:${size.id}:${block.id}`,size,pieces:[...byKind.values()].map(addConstructionNoGoZones),seamGraph};
}

export function buildPilotShirtPattern(size:SizeProfile,block?:PilotBlockSpec):ShirtPattern{
 const blockErrors=block?validatePilotBlockSpec(block):[];if(blockErrors.length)throw new Error(blockErrors.join(","));
 if(block)return sourcedPattern(size,block);
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
 const seamGraph=[connect(frontL,yoke,0),connect(frontR,yoke,1),connect(back,yoke,2),connect(yoke,sl,3),connect(yoke,sr,4),connect(sl,cl,5),connect(sr,cr,6),connect(yoke,collar,7)];
 const pieces=[frontL,frontR,back,yoke,sl,sr,cl,cr,collar].map(addConstructionNoGoZones);
 return {id:`pilot-shirt:${size.id}:reference`,size,pieces,seamGraph};
}
