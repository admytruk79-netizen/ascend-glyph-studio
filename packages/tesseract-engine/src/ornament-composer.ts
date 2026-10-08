import type {MotifGrammar,MotifInstance,MotifPart} from "./motif-grammar";

/** Constraint-based ornamental composition using canonical motif parts, not graph strokes. */
export type OrnamentPlan={columns:number;rows:number;cellSize01:number;mirrorAlternate:boolean;focalFamilyId?:string;seed:number;maxInstances?:number;detailLayers?:number};
export type OrnamentResult={grammar:MotifGrammar;placed:number;rejected:number;violations:string[]};
const hash=(n:number)=>((Math.imul(n,1664525)+1013904223)>>>0)/4294967296;
const choose=(parts:MotifPart[],n:number)=>parts[Math.floor(hash(n)*parts.length)]!;
export function composeOrnament(source:MotifGrammar,plan:OrnamentPlan):OrnamentResult{
 const columns=Math.max(1,Math.floor(plan.columns)),rows=Math.max(1,Math.floor(plan.rows));
 const maxInstances=Math.max(1,Math.floor(plan.maxInstances??10000));
 const families=source.parts.filter(p=>p.role!=="connector");
 if(!families.length)return {grammar:{...source,instances:[],links:[],repeatCells:[]},placed:0,rejected:0,violations:["no-motif-parts"]};
 const instances:MotifInstance[]=[];let rejected=0;
 const focal=families.find(p=>p.familyId===plan.focalFamilyId)??families.find(p=>p.role==="core");
 const spacingX=1/columns,spacingY=1/rows;
 for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
  if(instances.length>=maxInstances){rejected++;continue}
  const central=Math.abs(col-(columns-1)/2)<.51&&Math.abs(row-(rows-1)/2)<.51;
  const part=central&&focal?focal:choose(families,plan.seed+row*columns+col);
  const mirror=plan.mirrorAlternate&&(col+row)%2===1;
  const size=Math.min(spacingX/Math.max(.1,part.geometry.aspect),spacingY)*.78;
  instances.push({id:"ornament:"+row+":"+col,partId:part.id,x01:(col+.5)*spacingX,y01:(row+.5)*spacingY,scale:size,rotationDeg:mirror?180:0,mirrorX:mirror,layer:central?2:1});
 }
 // Hierarchical satellites sit within their parent cell rather than being scattered.
 const layers=Math.max(0,Math.min(5,Math.floor(plan.detailLayers??2)));
 const fillers=source.parts.filter(p=>p.role==="filler"||p.role==="satellite");
 const anchors=[...instances];
 for(const anchor of anchors){
  if(!fillers.length)break;
  for(let depth=1;depth<=layers;depth++){
   const count=depth*4;
   for(let j=0;j<count;j++){
    if(instances.length>=maxInstances){rejected++;continue}
    const p=choose(fillers,plan.seed+depth*113+j*31+anchor.id.length);
    const angle=2*Math.PI*j/count+depth*Math.PI/count;
    const radial=Math.min(spacingX,spacingY)*(.13+.06*depth);
    const x=anchor.x01+Math.cos(angle)*radial,y=anchor.y01+Math.sin(angle)*radial;
    if(x<0||x>1||y<0||y>1){rejected++;continue}
    const size=Math.min(spacingX/Math.max(.1,p.geometry.aspect),spacingY)*(.24/(depth+1));
    instances.push({id:anchor.id+":detail:"+depth+":"+j,partId:p.id,x01:x,y01:y,scale:size,rotationDeg:360*j/count,mirrorX:plan.mirrorAlternate&&j%2===1,layer:anchor.layer+depth});
   }
  }
 }
 const links=instances.filter(i=>i.id.includes(":detail:")).map(i=>({from:i.id.split(":detail:")[0]!,to:i.id,relation:"surround" as const,weight:1}));
 const cells=Array.from({length:rows},(_,row)=>({id:"repeat-row:"+row,instanceIds:instances.filter(i=>i.id.startsWith("ornament:"+row+":")).map(i=>i.id),axis:"horizontal" as const,period01:spacingX,mirrorAlternate:plan.mirrorAlternate}));
 return {grammar:{...source,id:source.id+":ornament:"+plan.seed,instances,links,repeatCells:cells},placed:instances.length,rejected,violations:rejected?["instance-budget-exceeded"]:[]};
}
