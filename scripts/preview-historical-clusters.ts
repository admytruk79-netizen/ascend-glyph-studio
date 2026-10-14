/** Research-only visualization of historical structural clusters. Not a learned image generator. */
import {readFile,mkdir,writeFile} from "node:fs/promises";
const root=process.env.MET_OUTPUT??"data/historical-baseline";
const model=JSON.parse(await readFile(root+"/model.json","utf8"));
if(model.schema!=="ascend.historical-image-baseline.v2"||!Array.isArray(model.centers)||model.centers.length<2)throw Error("Missing trained v2 structural centers");
const esc=(s:unknown)=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
const swatches:string[]=[];
for(let k=0;k<model.centers.length;k++){
 const v:number[]=model.centers[k];
 if(v.length!==33||v.some(n=>!Number.isFinite(n)))throw Error("Invalid feature vector for cluster "+k);
 const symmetry=(v[11]!+v[12]!)/2;
 const repetition=v.slice(13,17).reduce((a,b)=>a+b,0)/4;
 const grid=v.slice(17,33);
 const max=Math.max(...grid,0.001);
 const squares=grid.map((n,i)=>{
  const x=i%4,y=Math.floor(i/4),density=Math.max(0,Math.min(1,n/max));
  const cx=40+x*52+26,cy=45+y*52+26;
  const size=6+18*density;
  const mirror=symmetry>.7;
  const shape=mirror
   ? `<path d="M ${cx} ${cy-size} L ${cx+size} ${cy} L ${cx} ${cy+size} L ${cx-size} ${cy} Z" fill="none" stroke="#c9a227" stroke-width="${(1+3*density).toFixed(2)}"/>`
   : `<rect x="${cx-size/2}" y="${cy-size/2}" width="${size}" height="${size}" transform="rotate(45 ${cx} ${cy})" fill="#c9a227" opacity="${(0.2+0.8*density).toFixed(2)}"/>`;
  return shape;
 }).join("");
 swatches.push(`<g transform="translate(${(k%3)*300} ${Math.floor(k/3)*320})"><rect width="280" height="300" rx="14" fill="#0b2545"/><text x="20" y="28" fill="#f7eed7" font-size="15">Cluster ${k+1}</text>${squares}<text x="20" y="280" fill="#f7eed7" font-size="11">symmetry ${symmetry.toFixed(2)} · repetition ${repetition.toFixed(2)}</text></g>`);
}
const width=Math.min(3,model.centers.length)*300,height=Math.ceil(model.centers.length/3)*320;
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><title>${esc("Research-only structural cluster visualization")}</title><rect width="100%" height="100%" fill="#eee9df"/>${swatches.join("")}</svg>`;
await mkdir(root,{recursive:true});
await writeFile(root+"/cluster-preview.svg",svg);
console.log("STRUCTURAL CLUSTER PREVIEW",JSON.stringify({clusters:model.centers.length,path:root+"/cluster-preview.svg",note:"abstract feature visualization, not reconstructed historical motifs"}));
