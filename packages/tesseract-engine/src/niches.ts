import type {Topology} from "./topology";
import type {VisualFeatureVector} from "./visual-features";
import {topologyVisualVector} from "./candidate-visual-vector";

export type DesignNicheId="collar"|"placket"|"shoulder"|"sleeve"|"cuff-wrap"|"chest"|"yoke"|"back-field"|"hem-band"|"leather-tooling"|"journal-emboss"|"print-field";
export type DesignNiche={
 id:DesignNicheId;medium:"embroidery"|"leather"|"emboss"|"print";
 target:Partial<VisualFeatureVector>;tolerance:number;
 requirements:{minVoid?:number;maxDensity?:number;minScaleLevels?:number;preferClosure?:boolean;preferInterruption?:boolean};
};
export const DESIGN_NICHES:Record<DesignNicheId,DesignNiche>={
 collar:{id:"collar",medium:"embroidery",target:{horizontal:1,wrap:1,density:.55,voidRatio:.35},tolerance:.45,requirements:{maxDensity:.78,minVoid:.2,preferClosure:true}},
 placket:{id:"placket",medium:"embroidery",target:{vertical:1,density:.5,interruption:.35},tolerance:.45,requirements:{maxDensity:.75,minScaleLevels:2,preferInterruption:true}},
 shoulder:{id:"shoulder",medium:"embroidery",target:{horizontal:.8,branching:.55,interruption:.3,field:.25},tolerance:.48,requirements:{minVoid:.18,minScaleLevels:2}},
 sleeve:{id:"sleeve",medium:"embroidery",target:{vertical:.8,branching:.7,interruption:.55,scaleLevels:.6},tolerance:.5,requirements:{minScaleLevels:2,preferInterruption:true}},
 "cuff-wrap":{id:"cuff-wrap",medium:"embroidery",target:{horizontal:1,wrap:1,repetition:.65,closure:.75},tolerance:.4,requirements:{maxDensity:.82,preferClosure:true}},
 chest:{id:"chest",medium:"embroidery",target:{field:.7,branching:.65,radial:.35,voidRatio:.4},tolerance:.5,requirements:{minVoid:.2,minScaleLevels:2}},
 yoke:{id:"yoke",medium:"embroidery",target:{horizontal:.8,branching:.5,closure:.25,field:.35},tolerance:.5,requirements:{minVoid:.18,minScaleLevels:2}},
 "back-field":{id:"back-field",medium:"embroidery",target:{field:1,radial:.65,branching:.55,scaleLevels:.75},tolerance:.55,requirements:{minScaleLevels:3,minVoid:.18}},
 "hem-band":{id:"hem-band",medium:"embroidery",target:{horizontal:1,repetition:.7,interruption:.3},tolerance:.42,requirements:{maxDensity:.8}},
 "leather-tooling":{id:"leather-tooling",medium:"leather",target:{density:.4,voidRatio:.55,closure:.5,branching:.35},tolerance:.5,requirements:{minVoid:.3,maxDensity:.65}},
 "journal-emboss":{id:"journal-emboss",medium:"emboss",target:{field:.8,density:.35,voidRatio:.6,radial:.35},tolerance:.5,requirements:{minVoid:.35,maxDensity:.6}},
 "print-field":{id:"print-field",medium:"print",target:{field:1,density:.65,scaleLevels:.7,interruption:.55},tolerance:.6,requirements:{minScaleLevels:3}}
};
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export function nicheFitness(t:Topology,niche:DesignNiche){
 const v=topologyVisualVector(t),target=niche.target;let err=0,count=0;
 for(const [k,x] of Object.entries(target)){const key=k as keyof VisualFeatureVector;err+=(v[key]-x!)**2;count++}
 const distance=count?Math.sqrt(err/count):0;let penalty=0;const r=niche.requirements;
 if(r.minVoid!=null&&v.voidRatio<r.minVoid)penalty+=(r.minVoid-v.voidRatio)*2;
 if(r.maxDensity!=null&&v.density>r.maxDensity)penalty+=(v.density-r.maxDensity)*2;
 if(r.minScaleLevels!=null&&v.scaleLevels<r.minScaleLevels/6)penalty+=(r.minScaleLevels/6-v.scaleLevels)*2;
 if(r.preferClosure&&v.closure<.2)penalty+=( .2-v.closure);if(r.preferInterruption&&v.interruption<.2)penalty+=( .2-v.interruption);
 return clamp(1-distance/Math.max(.1,niche.tolerance)-penalty);
}
