export type DimensionKey="geometry"|"semantics"|"culture"|"relations"|"hierarchy"|"transformation"|"material"|"provenance";

export type WeightedRef={id:string;weight:number;confidence?:number};
export type CulturalAccess="structural-public"|"documented-public"|"community-specific"|"sacred-restricted"|"uncertain";

export type IntentVector={
  concepts:WeightedRef[];
  traditions?:WeightedRef[];
  character?:WeightedRef[];
  complexityTarget?:number;
  materialId?:string;
  zoneId?:string;
  exclusions?:string[];
};

export type ComplexityVector={
  topological:number;
  semantic:number;
  hierarchical:number;
  rhythmic:number;
  transformational:number;
  cultural:number;
  visual:number;
  production:number;
};

export type ProvenanceRef={
  sourceId:string;
  principleId?:string;
  confidence:number;
  access:CulturalAccess;
  transformationDistance?:number;
};

export type Tesseract8DState={
  version:2;
  seed:string;
  dimensions:{
    geometry:WeightedRef[];
    semantics:WeightedRef[];
    culture:WeightedRef[];
    relations:WeightedRef[];
    hierarchy:WeightedRef[];
    transformation:WeightedRef[];
    material:WeightedRef[];
    provenance:ProvenanceRef[];
  };
  complexity:ComplexityVector;
  antiStyle:WeightedRef[];
  ontologyVersion:string;
  solverVersion:string;
};

export function clamp01(n:number){return Math.max(0,Math.min(1,n));}
export function sparseDimensionScore(xs:WeightedRef[]){return xs.reduce((s,x)=>s+clamp01(x.weight)*clamp01(x.confidence??1),0);}
export function complexityMean(c:ComplexityVector){
  const v=Object.values(c); return v.reduce((a,b)=>a+b,0)/v.length;
}
