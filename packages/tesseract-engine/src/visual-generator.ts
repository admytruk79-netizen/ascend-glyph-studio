export type TraditionCondition={id:string;weight:number;community?:string;region?:string};
export type VisualGenerationRequest={
 seed:string;width:number;height:number;physicalWidthMm:number;physicalHeightMm:number;
 ascendGlyphIds:string[];traditions:TraditionCondition[];medium:"embroidery"|"weaving"|"print";
 complexity:number;repeat:"none"|"half-drop"|"mirror"|"tessellated";palette?:string[];
};
export type VisualCandidate={
 id:string;seed:string;imageUri:string;width:number;height:number;
 maps?:{depthUri?:string;normalUri?:string;roughnessUri?:string;maskUri?:string;directionUri?:string};
 provenance:{model:string;traditions:TraditionCondition[];ascendGlyphIds:string[]};
};
export interface VisualGeneratorProvider{
 readonly id:string;
 generate(request:VisualGenerationRequest):Promise<VisualCandidate[]>;
 embed(imageUri:string):Promise<number[]>;
 segment(imageUri:string):Promise<{maskUri:string;labels:string[]}>;
 estimateDepth(imageUri:string):Promise<{depthUri:string}>;
}
export type NoveltyEvidence={candidateId:string;nearestSourceId?:string;similarity:number;cropSimilarity?:number;passed:boolean};
export function noveltyGate(candidateId:string,similarity:number,cropSimilarity=0,limit=.86):NoveltyEvidence{
 const score=Math.max(similarity,cropSimilarity);
 return {candidateId,similarity,cropSimilarity,passed:Number.isFinite(score)&&score<limit};
}
export function assertVisualRequest(r:VisualGenerationRequest){
 if(!r.ascendGlyphIds.length)throw new Error("ASCEND identity conditioning is required");
 if(!r.traditions.length)throw new Error("At least one documented tradition condition is required");
 if(r.traditions.some(t=>t.id==="indigenous-north-america"&&!t.community&&!t.region))throw new Error("Indigenous North American conditioning must identify a specific community or region");
 if(r.complexity<0||r.complexity>1)throw new Error("complexity must be 0..1");
 if(r.width<512||r.height<512)throw new Error("visual generation must be at least 512px per side");
 if(r.physicalWidthMm<=0||r.physicalHeightMm<=0)throw new Error("physical dimensions required");
}
