export type StructuralFeedback={
  avoidRelations:string[];
  relationPenalties:Record<string,number>;
  relationBoosts:Record<string,number>;
  centralHierarchyBoost:number;
  scaleSeparationBoost:number;
  repetitionReduction:number;
  crossingReduction:number;
  asymmetryBoost:number;
  explorationFloor:number;
  reasons:string[];
};

export const EMPTY_STRUCTURAL_FEEDBACK:StructuralFeedback={
  avoidRelations:[],relationPenalties:{},relationBoosts:{},
  centralHierarchyBoost:0,scaleSeparationBoost:0,repetitionReduction:0,
  crossingReduction:0,asymmetryBoost:0,explorationFloor:.08,reasons:[]
};

export function deriveStructuralFeedback(rows:{raster?:any;finalCritique?:any}[]):StructuralFeedback{
  const f={...EMPTY_STRUCTURAL_FEEDBACK,avoidRelations:[] as string[],relationPenalties:{} as Record<string,number>,relationBoosts:{} as Record<string,number>,reasons:[] as string[]};
  const flags=rows.flatMap(r=>[...(r.raster?.flags??[]),...(r.finalCritique?.flags??[])]);
  const has=(x:string)=>flags.includes(x);
  if(has("raster-tangle")){
    f.crossingReduction=.8;
    Object.assign(f.relationPenalties,{intersect:.85,bridge:.55,orbit:.35});
    f.avoidRelations.push("intersect");
    f.reasons.push("raster-tangle");
  }
  if(has("excessive-path-repetition")){
    f.repetitionReduction=.75;
    Object.assign(f.relationPenalties,{repeat:.7,return:.5,flow:.28});
    Object.assign(f.relationBoosts,{transform:.45,branch:.28});
    f.reasons.push("excessive-path-repetition");
  }
  if(has("weak-focal-hierarchy")){
    f.centralHierarchyBoost=.85;
    f.scaleSeparationBoost=.72;
    Object.assign(f.relationBoosts,{enclose:.35,nest:.45,anchor:.5});
    f.reasons.push("weak-focal-hierarchy");
  }
  if(has("flat-composition")){
    f.asymmetryBoost=.42;
    f.scaleSeparationBoost=Math.max(f.scaleSeparationBoost,.55);
    Object.assign(f.relationBoosts,{ascend:.3,transform:.32,branch:.22});
    f.reasons.push("flat-composition");
  }
  f.explorationFloor=.16;
  return f;
}
