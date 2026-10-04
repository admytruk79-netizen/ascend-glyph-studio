import type {Topology} from "./topology";
import type {ObjectiveVector} from "./pareto";
import {genomeFromTopology} from "./genome";
import {projectSemanticGeometry} from "./semantic-projector";

export type SpecimenCandidate={lineageId:string;topology:Topology;objectives:ObjectiveVector;score?:number};
export type SpecimenSheet={svg:string;width:number;height:number;count:number};

const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&apos;"}[c]!));
const body=(svg:string)=>svg.replace(/^<svg[^>]*>/,"").replace(/<\/svg>$/,"");
const objectiveSummary=(o:ObjectiveVector)=>Object.entries(o).map(([k,v])=>`${k}:${v.toFixed(2)}`).join(" | ");

export function renderLineageSpecimenSheet(candidates:SpecimenCandidate[],opts?:{columns?:number;cellWidth?:number;cellHeight?:number;padding?:number}):SpecimenSheet{
 const columns=Math.max(1,opts?.columns??3),cellWidth=opts?.cellWidth??420,cellHeight=opts?.cellHeight??250,padding=opts?.padding??24;
 const rows=Math.max(1,Math.ceil(candidates.length/columns)),width=columns*cellWidth,height=rows*cellHeight;
 const cells=candidates.map((c,i)=>{
  const col=i%columns,row=Math.floor(i/columns),x=col*cellWidth,y=row*cellHeight;
  const innerW=cellWidth-padding*2,innerH=cellHeight-72;
  const genome=genomeFromTopology(`specimen:${c.lineageId}:${i}`,c.topology);
  const projection=projectSemanticGeometry(genome,innerW,innerH);
  return `<g transform="translate(${x} ${y})" data-lineage="${esc(c.lineageId)}">
   <rect x="8" y="8" width="${cellWidth-16}" height="${cellHeight-16}" rx="10" fill="none" stroke="currentColor" stroke-opacity=".18"/>
   <text x="${padding}" y="29" font-family="ui-monospace,monospace" font-size="12" fill="currentColor">${esc(c.lineageId)}</text>
   <g transform="translate(${padding} 42)">${body(projection.svg)}</g>
   <text x="${padding}" y="${cellHeight-18}" font-family="ui-monospace,monospace" font-size="8.5" fill="currentColor" opacity=".72">${esc(objectiveSummary(c.objectives))}</text>
  </g>`;
 }).join("");
 return {svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" data-tesseract="lineage-specimens"><g fill="none" stroke="currentColor">${cells}</g></svg>`,width,height,count:candidates.length};
}
