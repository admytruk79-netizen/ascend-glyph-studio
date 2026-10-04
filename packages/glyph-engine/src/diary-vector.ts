import { buildDiaryManifest, DiarySynthesisInput } from "./diary";

export interface Point { x:number; y:number }
export interface DiaryVectorCandidate {
  manifest: ReturnType<typeof buildDiaryManifest>;
  viewBox: string;
  paths: string[];
  svg: string;
}

function hashSeed(seed:string){ let h=2166136261; for(const ch of seed){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)} return h>>>0 }
function rng(seed:string){let x=hashSeed(seed)||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296}}
const p=(pts:Point[])=>"M"+pts.map(v=>`${v.x.toFixed(2)},${v.y.toFixed(2)}`).join(" L");

export function synthesizeDiaryVector(input:DiarySynthesisInput):DiaryVectorCandidate{
 const manifest=buildDiaryManifest(input), random=rng(manifest.seed);
 const density=manifest.density==="restrained"?3:manifest.density==="complex"?7:5;
 const cx=105, cy=148.5, paths:string[]=[];
 const rise=55+random()*22, spread=34+random()*18;
 paths.push(p([{x:cx,y:cy+rise},{x:cx,y:cy-rise}]));
 for(let i=1;i<=density;i++){
   const t=i/(density+1), y=cy+rise-(2*rise*t), w=spread*(0.35+0.65*Math.sin(Math.PI*t));
   const notch=6+random()*10;
   const left=[{x:cx,y:y-notch},{x:cx-w,y},{x:cx,y:y+notch}];
   paths.push(p(left));
   if(manifest.symmetry==="bilateral") paths.push(p(left.map(v=>({x:2*cx-v.x,y:v.y}))));
 }
 const borderInset=14+random()*5;
 paths.push(`M${borderInset},${borderInset} H${210-borderInset} V${297-borderInset} H${borderInset} Z`);
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 297" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" stroke-linejoin="miter">${paths.map(d=>`<path d="${d}"/>`).join("")}</svg>`;
 return {manifest,viewBox:"0 0 210 297",paths,svg};
}
