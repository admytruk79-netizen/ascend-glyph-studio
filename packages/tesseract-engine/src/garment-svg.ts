import type {GarmentAtlas} from "./garment-atlas";
import {atlasPoint} from "./garment-atlas";
import type {GarmentTrajectory} from "./garment-trajectory";
export type GarmentSvg={svg:string;width:number;height:number;trajectoryCount:number};
function esc(s:string){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&apos;"}[c]!))}
function curve(points:{x:number;y:number}[]){if(points.length<2)return "";let d=`M ${points[0]!.x.toFixed(2)} ${points[0]!.y.toFixed(2)}`;for(let i=1;i<points.length;i++){const a=points[i-1]!,b=points[i]!,mx=(a.x+b.x)/2;d+=` C ${mx.toFixed(2)} ${a.y.toFixed(2)}, ${mx.toFixed(2)} ${b.y.toFixed(2)}, ${b.x.toFixed(2)} ${b.y.toFixed(2)}`}return d}
export function renderGarmentAtlasSvg(a:GarmentAtlas,ts:GarmentTrajectory[]):GarmentSvg{
 const guides=a.zones.map(z=>`<rect data-zone="${esc(z.zone.id)}" x="${z.rect.x}" y="${z.rect.y}" width="${z.rect.width}" height="${z.rect.height}" fill="none" stroke="currentColor" stroke-opacity=".12"/>`).join("");
 const paths=ts.map(t=>{const pts=t.points.map(p=>atlasPoint(a,p.zoneId,p.x01,p.y01)).filter((p):p is {x:number;y:number}=>!!p);return `<path id="${esc(t.id)}" data-relation="${esc(t.relation)}" data-zones="${esc(t.zones.join(","))}" d="${curve(pts)}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`}).join("");
 return {svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${a.width} ${a.height}" data-ascend="garment-atlas"><g data-layer="zone-guides">${guides}</g><g data-layer="semantic-trajectories">${paths}</g></svg>`,width:a.width,height:a.height,trajectoryCount:ts.length};
}
