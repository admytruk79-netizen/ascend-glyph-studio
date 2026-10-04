import { createHash } from "node:crypto";
import { buildDiaryManifest, DiarySynthesisInput } from "./diary";

export interface DiaryVectorCandidate {
  manifest: ReturnType<typeof buildDiaryManifest>;
  manifestSha256: string;
  viewBox: "0 0 210 297";
  paths: string[];
  svg: string;
}

const esc=(v:string)=>v.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"}[c]!));
function stable(v:unknown):string{
 if(Array.isArray(v)) return "["+v.map(stable).join(",")+"]";
 if(v&&typeof v==="object") return "{"+Object.entries(v as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>JSON.stringify(k)+":"+stable(x)).join(",")+"}";
 return JSON.stringify(v);
}
function hashSeed(seed:string){let h=2166136261;for(const ch of seed){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed:string){let x=hashSeed(seed)||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296}}
const line=(pts:{x:number;y:number}[])=>"M"+pts.map(v=>`${v.x.toFixed(2)},${v.y.toFixed(2)}`).join(" L");

export function synthesizeDiaryVector(input:DiarySynthesisInput):DiaryVectorCandidate{
 const manifest=buildDiaryManifest(input);
 const manifestJson=stable(manifest);
 const manifestSha256=createHash("sha256").update(manifestJson).digest("hex");
 const random=rng(manifest.seed), density=manifest.density==="restrained"?3:manifest.density==="complex"?7:5;
 const cx=105,cy=148.5,paths:string[]=[];
 const rise=55+random()*22,spread=34+random()*18;
 paths.push(line([{x:cx,y:cy+rise},{x:cx,y:cy-rise}]));
 for(let i=1;i<=density;i++){
  const t=i/(density+1),y=cy+rise-2*rise*t,w=spread*(.35+.65*Math.sin(Math.PI*t)),notch=6+random()*10;
  const left=[{x:cx,y:y-notch},{x:cx-w,y},{x:cx,y:y+notch}]; paths.push(line(left));
  if(manifest.symmetry==="bilateral")paths.push(line(left.map(v=>({x:2*cx-v.x,y:v.y}))));
 }
 const inset=14+random()*5;paths.push(`M${inset.toFixed(2)},${inset.toFixed(2)} H${(210-inset).toFixed(2)} V${(297-inset).toFixed(2)} H${inset.toFixed(2)} Z`);
 const metadata=esc(JSON.stringify({manifestSha256,seed:manifest.seed,version:manifest.version}));
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 297" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" stroke-linejoin="miter"><metadata>${metadata}</metadata>${paths.map(d=>`<path d="${d}"/>`).join("")}</svg>`;
 return{manifest,manifestSha256,viewBox:"0 0 210 297",paths,svg};
}
