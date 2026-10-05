export const MATURE_CORPUS_TARGET={analyzedInstances:750000,minNamedTraditions:300,minIndependentSourceGroups:250,minRegions:30,minTechniqueFamilies:12,maxSingleTraditionShare:.02,maxSingleSourceShare:.05,minImageEligibleShare:.65} as const;
export interface CorpusCounters{analyzedInstances:number;namedTraditions:number;independentSourceGroups:number;regions:number;techniqueFamilies:number;largestTraditionShare:number;largestSourceShare:number;imageEligibleShare:number}
export function matureCorpusProgress(c:CorpusCounters){const t=MATURE_CORPUS_TARGET;const checks={instances:c.analyzedInstances/t.analyzedInstances,traditions:c.namedTraditions/t.minNamedTraditions,sources:c.independentSourceGroups/t.minIndependentSourceGroups,regions:c.regions/t.minRegions,techniques:c.techniqueFamilies/t.minTechniqueFamilies,traditionBalance:t.maxSingleTraditionShare/Math.max(c.largestTraditionShare,t.maxSingleTraditionShare),sourceBalance:t.maxSingleSourceShare/Math.max(c.largestSourceShare,t.maxSingleSourceShare),imageCoverage:c.imageEligibleShare/t.minImageEligibleShare};const bounded=Object.fromEntries(Object.entries(checks).map(([k,v])=>[k,Math.min(1,v)]));return{target:t,checks:bounded,overall:Object.values(bounded).reduce((a,b)=>a+(b as number),0)/Object.keys(bounded).length,ready:Object.values(bounded).every(v=>(v as number)>=1)}}
export const MATURE_CORPUS_PHASES=[
{phase:"A",target:100000,purpose:"validate decomposition and vocabulary discovery"},
{phase:"B",target:250000,purpose:"broad grammar and named-tradition coverage"},
{phase:"C",target:500000,purpose:"mature structural corpus"},
{phase:"D",target:750000,purpose:"rare structures, balance, saturation and holdout evaluation"}
] as const;
