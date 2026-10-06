import type {GarmentZoneKind,SizeProfile} from "./garment";

export type Point={x:number;y:number};
export type SeamKind="construction"|"fold"|"center"|"hem"|"placket"|"cuff-join"|"collar-join";
export type PatternPieceKind="front-left"|"front-right"|"back"|"yoke"|"sleeve-left"|"sleeve-right"|"cuff-left"|"cuff-right"|"collar"|"collar-band"|"placket";

export type SeamRef={
 id:string;kind:SeamKind;edge:string;joins?:{pieceId:string;seamId:string};
 allowanceMm:number;crossDesignAllowed:boolean;registrationToleranceMm?:number;
};

export type NoGoZone={id:string;reason:string;polygon:Point[];clearanceMm:number};

export type PatternPiece={
 id:string;kind:PatternPieceKind;cutQuantity:number;mirror:boolean;
 outline:Point[];grainline:{from:Point;to:Point};
 seams:SeamRef[];noGoZones:NoGoZone[];
 designZones:{kind:GarmentZoneKind;polygon:Point[];wrapGroupId?:string}[];
 sourceState:"reference"|"pattern-specified"|"sample-measured"|"manufacturer-validated"|"production-validated";
};

export type ShirtPattern={
 id:string;size:SizeProfile;pieces:PatternPiece[];
 seamGraph:{fromPiece:string;fromSeam:string;toPiece:string;toSeam:string}[];
};

export function adjacentPieces(p:ShirtPattern,pieceId:string){
 return p.seamGraph.flatMap(e=>e.fromPiece===pieceId?[e.toPiece]:e.toPiece===pieceId?[e.fromPiece]:[]);
}

export function validatePattern(p:ShirtPattern):string[]{
 const errors:string[]=[];
 const ids=new Set(p.pieces.map(x=>x.id));
 for(const e of p.seamGraph){
  if(!ids.has(e.fromPiece)||!ids.has(e.toPiece)){errors.push(`dangling-seam:${e.fromPiece}->${e.toPiece}`);continue}
  const from=p.pieces.find(x=>x.id===e.fromPiece)!;
  const to=p.pieces.find(x=>x.id===e.toPiece)!;
  const fs=from.seams.find(s=>s.id===e.fromSeam);
  const ts=to.seams.find(s=>s.id===e.toSeam);
  if(!fs)errors.push(`missing-seam:${e.fromPiece}:${e.fromSeam}`);
  if(!ts)errors.push(`missing-seam:${e.toPiece}:${e.toSeam}`);
  if(fs?.joins&&(fs.joins.pieceId!==e.toPiece||fs.joins.seamId!==e.toSeam))errors.push(`seam-join-mismatch:${e.fromPiece}:${e.fromSeam}`);
  if(ts?.joins&&(ts.joins.pieceId!==e.fromPiece||ts.joins.seamId!==e.fromSeam))errors.push(`seam-join-mismatch:${e.toPiece}:${e.toSeam}`);
 }
 for(const piece of p.pieces){
  if(piece.outline.length<3)errors.push(`invalid-outline:${piece.id}`);
  if(piece.seams.some(s=>s.allowanceMm<0))errors.push(`negative-seam-allowance:${piece.id}`);
 }
 return errors;
}
