import type {Topology,TopologyNode,TopologyEdge,OctaveStage} from "./topology";

export type OctaveBudget={
 enabled?:boolean;
 minFeatureMm?:number;
 usableAreaMm2?:number;
 maxEstimatedStitches?:number;
};

export type RecursiveGrammarOptions={
 depth?:number;
 maxNodes?:number;
 mutationRate?:number;
 maxBranching?:number;
 octave?:OctaveBudget;
};

const expandable=new Set(["seed","bifurcation","branch","orbit","axis","mutation","enclosure"]);
const OCTAVE:OctaveStage[]=["do","re","mi","fa","sol","la","si","do2"];

function hash(s:string){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function childForms(form:string):string[]{
 switch(form){
  case "seed":return ["axis","seed"];
  case "axis":return ["bifurcation","seed"];
  case "bifurcation":case "branch":return ["seed","axis","orbit"];
  case "orbit":return ["seed","axis","orbit"];
  case "enclosure":return ["void","seed","orbit"];
  case "mutation":return ["axis","bifurcation"];
  default:return [];
 }
}
function relation(parent:string,child:string,i:number){
 if(parent==="orbit")return "orbit";
 if(parent==="enclosure")return "enclose";
 if(child==="bifurcation")return "branch";
 if(child==="seed")return i?"repeat":"anchor";
 return "flow";
}

function familyExponent(form:string){return form==="void"?2:1}
function footprintMm2(scale:number,minFeature:number){
 const d=Math.max(8,minFeature*8)*Math.max(.5,scale);
 return d*d;
}
function estimatedStitches(form:string,scale:number,minFeature:number){
 const d=Math.max(8,minFeature*8)*Math.max(.5,scale);
 if(familyExponent(form)===2){
  // fill proxy: area divided by ~0.43 mm rows and ~3.2 mm stitch progression
  return Math.max(12,Math.round((d*d)/(.43*3.2)));
 }
 if(form==="enclosure"||form==="seed"||form==="mutation"){
  // satin proxy: centreline circumference/spacing plus underlay allowance
  return Math.max(12,Math.round((Math.PI*d)/.4*1.65));
 }
 // run proxy
 return Math.max(6,Math.round((Math.PI*d)/2.5));
}

function nextStage(stage:OctaveStage|undefined):OctaveStage{
 const i=stage?OCTAVE.indexOf(stage):-1;
 return OCTAVE[Math.min(OCTAVE.length-1,i+1)]!;
}
function isShockTransition(stage:OctaveStage|undefined){
 return stage==="mi"||stage==="si";
}

export function estimateRecursiveProduction(t:Topology,opt:RecursiveGrammarOptions={}){
 const minFeature=opt.octave?.minFeatureMm??1;
 const areaMm2=t.nodes.reduce((n,x)=>n+footprintMm2(x.scale,minFeature),0);
 const stitches=t.nodes.reduce((n,x)=>n+estimatedStitches(x.form,x.scale,minFeature),0);
 return {areaMm2,estimatedStitches:stitches};
}

export function expandRecursiveGrammar(base:Topology,seed:string,opt:RecursiveGrammarOptions={}):Topology{
 const depth=Math.max(0,Math.min(4,opt.depth??2));
 const maxNodes=Math.max(base.nodes.length,opt.maxNodes??48);
 const mutation=opt.mutationRate??.22;
 const maxBranching=Math.max(1,Math.floor(opt.maxBranching??5));
 const octaveEnabled=opt.octave?.enabled??false;
 const minFeature=opt.octave?.minFeatureMm??1;
 const areaCap=opt.octave?.usableAreaMm2??Infinity;
 const stitchCap=opt.octave?.maxEstimatedStitches??Infinity;

 const nodes:TopologyNode[]=base.nodes.map((n,i)=>({...n,octaveStage:n.octaveStage??(octaveEnabled?(OCTAVE[Math.min(i,OCTAVE.length-1)]):undefined),octaveDepth:n.octaveDepth??0}));
 const edges:TopologyEdge[]=base.edges.map(e=>({...e}));
 let areaUsed=nodes.reduce((n,x)=>n+footprintMm2(x.scale,minFeature),0);
 let stitchUsed=nodes.reduce((n,x)=>n+estimatedStitches(x.form,x.scale,minFeature),0);
 let frontier=nodes.map(n=>({node:n,level:0}));

 function canAdd(form:string,scale:number){
  return nodes.length<maxNodes
    && areaUsed+footprintMm2(scale,minFeature)<=areaCap
    && stitchUsed+estimatedStitches(form,scale,minFeature)<=stitchCap;
 }
 function addNode(parent:TopologyNode,form:string,index:number,level:number,stage:OctaveStage,octaveDepth:number){
  const scale=Math.max(1,parent.scale-1);
  if(!canAdd(form,scale))return undefined;
  const node:TopologyNode={
   id:`${parent.id}.r${level}.${index}`,
   conceptId:parent.conceptId,form,scale,octaveStage:stage,octaveDepth
  };
  nodes.push(node);
  edges.push({from:parent.id,to:node.id,relation:relation(parent.form,form,index),weight:Math.max(.32,.72-(level-1)*.12)});
  areaUsed+=footprintMm2(scale,minFeature);
  stitchUsed+=estimatedStitches(form,scale,minFeature);
  return node;
 }

 while(frontier.length&&nodes.length<maxNodes){
  const current=frontier.shift()!;
  if(current.level>=depth||!expandable.has(current.node.form))continue;
  const forms=childForms(current.node.form);
  if(!forms.length)continue;

  if(octaveEnabled){
   const shock=isShockTransition(current.node.octaveStage);
   const stage=nextStage(current.node.octaveStage);
   const roll=(hash(seed+current.node.id+":"+current.level)%1000)/1000;
   const raw=forms[hash(seed+"primary"+current.node.id)%forms.length]!;
   const form=roll<mutation
    ?(["seed","axis","orbit","bifurcation","void"][hash(seed+"m"+current.node.id)%5]!)
    :raw;
   const primary=addNode(current.node,form,0,current.level+1,stage,current.node.octaveDepth??0);
   if(primary)frontier.push({node:primary,level:current.level+1});

   // Only octave shock transitions may open subordinate branches.
   if(shock){
    const branchLimit=Math.min(maxBranching,3);
    for(let i=1;i<branchLimit;i++){
     const branchRoll=(hash(seed+"shock"+current.node.id+":"+i)%1000)/1000;
     if(branchRoll>.58+mutation*.5)continue;
     const branchForm=forms[i%forms.length]!;
     const child=addNode(current.node,branchForm,i,current.level+1,"do",(current.node.octaveDepth??0)+1);
     if(child)frontier.push({node:child,level:current.level+1});
    }
   }
   continue;
  }

  const chosen=forms.slice(0,maxBranching);
  const next:{node:TopologyNode;level:number}[]=[];
  chosen.forEach((raw,i)=>{
   if(nodes.length>=maxNodes)return;
   const roll=(hash(seed+current.node.id+":"+current.level+":"+i)%1000)/1000;
   if(i>0&&roll>.55+mutation)return;
   const form=roll<mutation?(["seed","axis","orbit","bifurcation","void"][hash(seed+"m"+current.node.id+i)%5]!):raw;
   const node=addNode(current.node,form,i,current.level+1,nextStage(current.node.octaveStage),current.node.octaveDepth??0);
   if(node)next.push({node,level:current.level+1});
  });
  frontier.push(...next);
 }
 return {nodes,edges};
}

export function grammarComplexity(t:Topology){
 const forms=new Set(t.nodes.map(n=>n.form)).size,relations=new Set(t.edges.map(e=>e.relation)).size;
 const recursive=t.nodes.filter(n=>n.id.includes(".r")).length;
 const octaveDepth=Math.max(0,...t.nodes.map(n=>n.octaveDepth??0));
 return {nodes:t.nodes.length,edges:t.edges.length,forms,relations,recursive,octaveDepth,score:forms*1.5+relations+Math.sqrt(Math.max(0,recursive))*2};
}
