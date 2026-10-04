import type {NoGoZone,PatternPiece,Point,ShirtPattern} from "./pattern";

export type PatternTransform={pieceId:string;scaleX:number;scaleY:number;offsetX:number;offsetY:number};
export type PieceProjectionPlan={
 pieceId:string;usableBounds:{x:number;y:number;width:number;height:number};
 transform:PatternTransform;noGoZones:NoGoZone[];warnings:string[];
};
export type SeamTransfer={
 fromPiece:string;toPiece:string;fromPoint:Point;toPoint:Point;
 registrationToleranceMm:number;allowed:boolean;
};

function bounds(poly:Point[]){const xs=poly.map(p=>p.x),ys=poly.map(p=>p.y);return {minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)}}

export function planPieceProjection(piece:PatternPiece,sourceWidth=1000,sourceHeight=1000,seamClearanceMm=12):PieceProjectionPlan{
 const b=bounds(piece.outline),warnings:string[]=[];
 const x=b.minX+seamClearanceMm,y=b.minY+seamClearanceMm;
 const width=Math.max(0,b.maxX-b.minX-seamClearanceMm*2),height=Math.max(0,b.maxY-b.minY-seamClearanceMm*2);
 if(width===0||height===0)warnings.push("no-usable-design-area");
 if(piece.sourceState==="reference")warnings.push("reference-pattern-not-production-validated");
 return {pieceId:piece.id,usableBounds:{x,y,width,height},transform:{pieceId:piece.id,scaleX:width/sourceWidth,scaleY:height/sourceHeight,offsetX:x,offsetY:y},noGoZones:piece.noGoZones,warnings};
}

export function mapPoint(p:Point,t:PatternTransform):Point{return {x:t.offsetX+p.x*t.scaleX,y:t.offsetY+p.y*t.scaleY};}

export function seamTransfers(pattern:ShirtPattern,defaultToleranceMm=2):SeamTransfer[]{
 const pieces=new Map(pattern.pieces.map(p=>[p.id,p]));
 return pattern.seamGraph.map(e=>{
  const a=pieces.get(e.fromPiece),b=pieces.get(e.toPiece);
  const sa=a?.seams.find(s=>s.id===e.fromSeam),sb=b?.seams.find(s=>s.id===e.toSeam);
  const ba=a?bounds(a.outline):undefined,bb=b?bounds(b.outline):undefined;
  return {fromPiece:e.fromPiece,toPiece:e.toPiece,
   fromPoint:{x:ba?(ba.minX+ba.maxX)/2:0,y:ba?.maxY??0},
   toPoint:{x:bb?(bb.minX+bb.maxX)/2:0,y:bb?.minY??0},
   registrationToleranceMm:sa?.registrationToleranceMm??sb?.registrationToleranceMm??defaultToleranceMm,
   allowed:(sa?.crossDesignAllowed??true)&&(sb?.crossDesignAllowed??true)};
 });
}

export function addConstructionNoGoZones(piece:PatternPiece):PatternPiece{
 const b=bounds(piece.outline),w=b.maxX-b.minX,h=b.maxY-b.minY,z=[...piece.noGoZones];
 if(piece.kind==="front-left"||piece.kind==="front-right")z.push({id:`${piece.id}:placket-hardware`,reason:"buttons/buttonholes/placket construction",polygon:[{x:0,y:0},{x:55,y:0},{x:55,y:h},{x:0,y:h}],clearanceMm:8});
 if(piece.kind==="cuff-left"||piece.kind==="cuff-right")z.push({id:`${piece.id}:closure`,reason:"cuff closure/buttonhole",polygon:[{x:0,y:0},{x:35,y:0},{x:35,y:h},{x:0,y:h}],clearanceMm:8});
 if(piece.kind==="collar")z.push({id:`${piece.id}:ends`,reason:"collar end construction",polygon:[{x:0,y:0},{x:25,y:0},{x:25,y:h},{x:0,y:h},{x:w,y:0},{x:w-25,y:0},{x:w-25,y:h},{x:w,y:h}],clearanceMm:6});
 return {...piece,noGoZones:z};
}
