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
 for(const e of p.seamGraph)if(!ids.has(e.fromPiece)||!ids.has(e.toPiece))errors.push(`dangling-seam:${e.fromPiece}->${e.toPiece}`);
 for(const piece of p.pieces){
  if(piece.outline.length<3)errors.push(`invalid-outline:${piece.id}`);
  if(piece.seams.some(s=>s.allowanceMm<0))errors.push(`negative-seam-allowance:${piece.id}`);
 }
 return errors;
}
