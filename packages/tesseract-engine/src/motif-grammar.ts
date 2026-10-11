import type {Topology,TopologyNode,TopologyEdge} from "./topology";
import type {SashEvidenceGrammar} from "./sash-evidence-grammar";

export type MotifTransform="repeat"|"mirror"|"rotate"|"nest"|"alternate"|"interrupt"|"enclose"|"branch";

export interface MotifFamily{
  id:string;
  concepts:readonly string[];
  primitives:readonly string[];
  transforms:readonly MotifTransform[];
  /** Relative scales of the motif's internal elements, largest first. */
  scaleProfile:readonly number[];
  /** Internal relations between consecutive elements. */
  relations:readonly string[];
}

export interface MotifInstance{
  id:string;
  familyId:string;
  conceptId:string;
  nodeIds:string[];
  transform:MotifTransform;
  scale:number;
}

export interface MotifProgram{
  version:1;
  seed:string;
  families:string[];
  instances:MotifInstance[];
  evidence?:{grammarId:string;source:string};
}

/**
 * ASCEND-native motif families. Cultural research may influence how these
 * families are arranged, repeated and nested, but never substitutes historical
 * motif geometry for ASCEND geometry.
 */
export const ASCEND_MOTIF_FAMILIES:Record<string,MotifFamily>={
  "origin-seed":{
    id:"origin-seed",concepts:["origin","birth","renewal","seed"],
    primitives:["seed","axis"],transforms:["nest","repeat","interrupt"],
    scaleProfile:[1,.62],relations:["anchor"]
  },
  "lineage-root":{
    id:"lineage-root",concepts:["ancestors","ancestry","lineage","land","home","earth","grounding"],
    primitives:["axis","branch","seed"],transforms:["branch","mirror","alternate"],
    scaleProfile:[1,.72,.45],relations:["branch","anchor"]
  },
  "protected-core":{
    id:"protected-core",concepts:["protection","safety","home","containment"],
    primitives:["orbit","seed","axis"],transforms:["enclose","nest","alternate"],
    scaleProfile:[1,.56,.78],relations:["enclose","anchor"]
  },
  "ascent-path":{
    id:"ascent-path",concepts:["ascent","journey","will","courage","freedom","growth"],
    primitives:["axis","branch","radial-emission"],transforms:["branch","alternate","interrupt"],
    scaleProfile:[1,.68,.5],relations:["flow","branch"]
  },
  "choice-crossing":{
    id:"choice-crossing",concepts:["crossing","choice","transformation","knowledge","perception"],
    primitives:["crossing","opposition","seed"],transforms:["rotate","alternate","interrupt"],
    scaleProfile:[1,.72,.42],relations:["oppose","anchor"]
  },
  "return-orbit":{
    id:"return-orbit",concepts:["return","renewal","union","love","healing"],
    primitives:["orbit","seed","spatial-flow"],transforms:["rotate","nest","repeat"],
    scaleProfile:[1,.52,.76],relations:["return","flow"]
  },
  "spirit-radiance":{
    id:"spirit-radiance",concepts:["spirit","cosmos","light","fire","air"],
    primitives:["radial-emission","seed","axis"],transforms:["rotate","nest","interrupt"],
    scaleProfile:[1,.42,.7],relations:["radiate","anchor"]
  }
};

function hash(s:string){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function normalize(s:string){return s.toLowerCase().replace(/^.*:/,"").replace(/[^a-z0-9-]+/g,"-")}

export function motifFamilyForConcept(concept:string):MotifFamily{
 const c=normalize(concept);
 const families=Object.values(ASCEND_MOTIF_FAMILIES);
 return families.find(f=>f.concepts.some(x=>c.includes(x)||x.includes(c)))
   ?? families[hash(c)%families.length]!;
}

function relationForTransform(t:MotifTransform,base:string,index:number):string{
 if(t==="nest")return "nest";
 if(t==="mirror")return "mirror";
 if(t==="rotate")return "orbit";
 if(t==="alternate")return index%2?"oppose":"repeat";
 if(t==="interrupt")return index===0?base:"terminate";
 if(t==="enclose")return "enclose";
 if(t==="branch")return "branch";
 if(t==="repeat")return "repeat";
 return base;
}

function chooseTransform(f:MotifFamily,seed:string,index:number,g?:SashEvidenceGrammar):MotifTransform{
 const options=[...f.transforms];
 if(g){
   if(g.symmetry>.75&&!options.includes("mirror"))options.push("mirror");
   if(g.alternation>.65&&!options.includes("alternate"))options.push("alternate");
   if(g.scaleHierarchy>.8&&!options.includes("nest"))options.push("nest");
   if(g.croppedMotifAllowance>.35&&!options.includes("interrupt"))options.push("interrupt");
 }
 return options[hash(seed+":"+f.id+":"+index)%options.length]!;
}

/**
 * Expand semantic nodes into compact compound ASCEND motifs before recursive
 * octave development. The external semantic graph remains intact: incoming
 * edges land on the motif root; outgoing edges leave from its terminal node.
 */
export function applyMotifGrammar(
 topology:Topology,
 seed:string,
 options:{maxNodes?:number;sashGrammar?:SashEvidenceGrammar;complexity?:number}={}
):{topology:Topology;program:MotifProgram}{
 const maxNodes=Math.max(topology.nodes.length,Math.floor(options.maxNodes??48));
 const complexity=Math.max(0,Math.min(1,options.complexity??.65));
 const nodes:TopologyNode[]=[];
 const edges:TopologyEdge[]=[];
 const rootByOriginal=new Map<string,string>();
 const terminalByOriginal=new Map<string,string>();
 const instances:MotifInstance[]=[];
 const families=new Set<string>();

 for(let index=0;index<topology.nodes.length;index++){
  const source=topology.nodes[index]!;
  const family=motifFamilyForConcept(source.conceptId);
  families.add(family.id);
  const desired=complexity>.72?family.primitives.length:Math.min(2,family.primitives.length);
  const remaining=Math.max(1,maxNodes-nodes.length-(topology.nodes.length-index-1));
  const count=Math.max(1,Math.min(desired,remaining));
  const transform=chooseTransform(family,seed,index,options.sashGrammar);
  const ids:string[]=[];
  for(let j=0;j<count;j++){
    const form=family.primitives[j]!;
    const id=`${source.id}.m${j}`;
    ids.push(id);
    nodes.push({
      ...source,
      id,
      form,
      scale:Math.max(.5,source.scale*(family.scaleProfile[j]??.6))
    });
    if(j>0){
      const baseRelation=family.relations[j-1]??"flow";
      edges.push({
        from:ids[j-1]!,to:id,
        relation:relationForTransform(transform,baseRelation,j-1),
        weight:Math.max(.4,.86-j*.12)
      });
    }
  }
  rootByOriginal.set(source.id,ids[0]!);
  terminalByOriginal.set(source.id,ids.at(-1)!);
  instances.push({id:`motif:${source.id}`,familyId:family.id,conceptId:source.conceptId,nodeIds:ids,transform,scale:source.scale});
 }

 for(const e of topology.edges){
  const from=terminalByOriginal.get(e.from),to=rootByOriginal.get(e.to);
  if(from&&to)edges.push({...e,from,to});
 }

 return {
  topology:{nodes,edges},
  program:{
    version:1,seed,families:[...families],instances,
    evidence:options.sashGrammar?{
      grammarId:options.sashGrammar.id,
      source:options.sashGrammar.source.doi
    }:undefined
  }
 };
}
