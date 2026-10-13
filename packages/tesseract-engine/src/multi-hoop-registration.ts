/** Reference-only multi-hoop layout. Never grants production approval. */
export type Point={x:number;y:number};
export type Tile={id:string;row:number;column:number;originMm:Point;sizeMm:{width:number;height:number}};
export type Join={fromTileId:string;toTileId:string;axis:"x"|"y";overlapMm:number;anchorsGlobalMm:[Point,Point];requiresNoGoClearance:true};
export type Plan={schema:"ascend.hoop-segmentation-plan.v1";status:"reference-layout-only";coordinateFrame:"global-pattern-piece-mm";machineId:string;tiles:Tile[];joins:Join[];errors:string[];warnings:string[];productionApproved:false};
export function planRegisteredHoops(input:{machineId:string;widthMm:number;heightMm:number;fieldXmm:number;fieldYmm:number;overlapMm:number;registrationToleranceMm:number}):Plan{
 const {machineId,widthMm,heightMm,fieldXmm,fieldYmm,overlapMm,registrationToleranceMm}=input;
 const errors:string[]=[];
 const valid=(n:number)=>Number.isFinite(n)&&n>0;
 if(!machineId.trim())errors.push("missing-machine-id");
 if(!valid(widthMm)||!valid(heightMm))errors.push("invalid-design-envelope");
 if(!valid(fieldXmm)||!valid(fieldYmm))errors.push("invalid-hoop-field");
 if(!valid(registrationToleranceMm))errors.push("unverified-registration-tolerance");
 if(!valid(overlapMm)||overlapMm>=fieldXmm||overlapMm>=fieldYmm)errors.push("invalid-hoop-overlap");
 const plan:Plan={schema:"ascend.hoop-segmentation-plan.v1",status:"reference-layout-only",coordinateFrame:"global-pattern-piece-mm",machineId,tiles:[],joins:[],errors,warnings:["Reference-only: field, overlap and tolerance require manufacturer and physical validation.","No stitch splitting, fabric compensation or safe registration-mark placement."],productionApproved:false};
 if(errors.length)return plan;
 const origins=(length:number,field:number)=>{
  if(length<=field)return [0];
  const stride=field-overlapMm;
  const count=Math.ceil((length-field)/stride)+1;
  if(count>100)return null;
  return Array.from({length:count},(_,i)=>Math.min(i*stride,length-field));
 };
 const xs=origins(widthMm,fieldXmm),ys=origins(heightMm,fieldYmm);
 if(!xs||!ys||xs.length*ys.length>400){errors.push("tile-count-exceeds-safety-limit");return plan;}
 for(let row=0;row<ys.length;row++)for(let column=0;column<xs.length;column++){
  const x=xs[column]!,y=ys[row]!;
  plan.tiles.push({id:`r${row}c${column}`,row,column,originMm:{x,y},sizeMm:{width:Math.min(fieldXmm,widthMm-x),height:Math.min(fieldYmm,heightMm-y)}});
 }
 const by=(r:number,c:number)=>plan.tiles.find(t=>t.row===r&&t.column===c)!;
 for(let row=0;row<ys.length;row++)for(let column=0;column<xs.length;column++){
  const tile=by(row,column);
  if(column+1<xs.length){
   const next=by(row,column+1),start=next.originMm.x,end=Math.min(tile.originMm.x+tile.sizeMm.width,next.originMm.x+next.sizeMm.width),mid=(start+end)/2;
   const top=Math.max(tile.originMm.y,next.originMm.y),bottom=Math.min(tile.originMm.y+tile.sizeMm.height,next.originMm.y+next.sizeMm.height);
   plan.joins.push({fromTileId:tile.id,toTileId:next.id,axis:"x",overlapMm:end-start,anchorsGlobalMm:[{x:mid,y:top+(bottom-top)/3},{x:mid,y:top+2*(bottom-top)/3}],requiresNoGoClearance:true});
  }
  if(row+1<ys.length){
   const next=by(row+1,column),start=next.originMm.y,end=Math.min(tile.originMm.y+tile.sizeMm.height,next.originMm.y+next.sizeMm.height),mid=(start+end)/2;
   const left=Math.max(tile.originMm.x,next.originMm.x),right=Math.min(tile.originMm.x+tile.sizeMm.width,next.originMm.x+next.sizeMm.width);
   plan.joins.push({fromTileId:tile.id,toTileId:next.id,axis:"y",overlapMm:end-start,anchorsGlobalMm:[{x:left+(right-left)/3,y:mid},{x:left+2*(right-left)/3,y:mid}],requiresNoGoClearance:true});
  }
 }
 return plan;
}
