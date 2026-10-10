import {assertVisualRequest,noveltyGate,type VisualCandidate,type VisualGenerationRequest,type VisualGeneratorProvider,type NoveltyEvidence} from "./visual-generator";
export type CorpusVisual={id:string;imageUri:string;rightsApproved:boolean;traditionId:string;community?:string;region?:string};
export type AcceptedVisual={candidate:VisualCandidate;novelty:NoveltyEvidence;segmentation:{maskUri:string;labels:string[]};depth:{depthUri:string}};
const cosine=(a:number[],b:number[])=>{if(a.length!==b.length||!a.length)return 0;let d=0,aa=0,bb=0;for(let i=0;i<a.length;i++){d+=a[i]!*b[i]!;aa+=a[i]!*a[i]!;bb+=b[i]!*b[i]!}return aa&&bb?d/Math.sqrt(aa*bb):0};
export async function generateAndCritiqueVisuals(provider:VisualGeneratorProvider,request:VisualGenerationRequest,corpus:CorpusVisual[],limit=.86):Promise<{accepted:AcceptedVisual[];rejected:NoveltyEvidence[]}>{
 assertVisualRequest(request);
 const sources=corpus.filter(x=>x.rightsApproved);
 if(!sources.length)throw new Error("No rights-approved visual corpus available");
 const sourceEmbeddings=await Promise.all(sources.map(async s=>({s,e:await provider.embed(s.imageUri)})));
 const candidates=await provider.generate(request);
 const accepted:AcceptedVisual[]=[],rejected:NoveltyEvidence[]=[];
 for(const candidate of candidates){
  const e=await provider.embed(candidate.imageUri);
  let nearest:{id?:string;score:number}={score:-1};
  for(const x of sourceEmbeddings){const score=cosine(e,x.e);if(score>nearest.score)nearest={id:x.s.id,score}}
  const novelty={...noveltyGate(candidate.id,nearest.score,0,limit),nearestSourceId:nearest.id};
  if(!novelty.passed){rejected.push(novelty);continue}
  const [segmentation,depth]=await Promise.all([provider.segment(candidate.imageUri),provider.estimateDepth(candidate.imageUri)]);
  accepted.push({candidate,novelty,segmentation,depth});
 }
 return {accepted,rejected};
}
