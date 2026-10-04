export type ImageCorpusClass="source-drawing"|"real-historical"|"real-manufactured"|"ascend-generated"|"reference-board";
export type EvidenceTier="A"|"B"|"C"|"D";
export type ImageObservation={
 id:string;sourceRef:string;class:ImageCorpusClass;evidenceTier:EvidenceTier;
 verifiedReal:boolean;trainingUse:"geometry"|"composition"|"material"|"manufacturing"|"negative-example";
 features:{
  symmetry?:number;density?:number;voidRatio?:number;scaleLevels?:number;
  dominantDirection?:("vertical"|"horizontal"|"radial"|"field"|"wrap")[];
  operations?:string[];zones?:string[];materials?:string[];techniques?:string[];
 };
 notes:string[];provenance?:string;
};
export type CorpusStats={count:number;realCount:number;generatedCount:number;byUse:Record<string,number>};

export function validateObservation(o:ImageObservation):string[]{
 const e:string[]=[];
 if(o.verifiedReal&&o.class==="ascend-generated")e.push("generated-image-cannot-be-verified-real");
 if(o.class==="real-historical"&&!o.provenance)e.push("historical-example-requires-provenance");
 if(o.trainingUse==="manufacturing"&&!o.verifiedReal)e.push("manufacturing-training-requires-real-sample");
 return e;
}
export function corpusStats(xs:ImageObservation[]):CorpusStats{
 const byUse:Record<string,number>={};for(const x of xs)byUse[x.trainingUse]=(byUse[x.trainingUse]??0)+1;
 return {count:xs.length,realCount:xs.filter(x=>x.verifiedReal).length,generatedCount:xs.filter(x=>x.class==="ascend-generated").length,byUse};
}
export function trainingWeight(o:ImageObservation):number{
 const tier={A:1,B:.8,C:.5,D:.2}[o.evidenceTier];
 const reality=o.verifiedReal?1:o.class==="source-drawing"?.95:o.class==="ascend-generated"?.25:.45;
 return tier*reality;
}
