export type NewGlyphStatus="candidate"|"originality-review"|"cultural-review"|"manufacturing-review"|"approved";
export interface NewGlyphCandidate{id:string;version:1;seed:string;primitiveChain:string[];relations:string[];intendedMeanings:string[];researchPrinciples:string[];status:NewGlyphStatus;provenance:{kind:"original-synthesis";legacyAtlasRequired:false;copiedHistoricalMotif:false}}
const P=["axis","branch","enclosure","step","pulse","arc","chevron","band","lattice","meander","rosette"];
const R=["frame","repeat","alternate","mirror","branch","transition","center","contain","offset","interrupt"];
const hash=(s:string)=>{let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
export function generateNewGlyphVocabulary(seed:string,count=108):NewGlyphCandidate[]{if(count<1||count>10000)throw new Error("count must be 1-10000");return Array.from({length:count},(_,i)=>{const id=`asc-new-${String(i+1).padStart(3,"0")}`,h=hash(seed+"|"+id),n=3+h%5,m=2+(h>>>5)%4;return{id,version:1,seed:`${seed}|${id}`,primitiveChain:Array.from({length:n},(_,j)=>P[(h+j*7)%P.length]),relations:Array.from({length:m},(_,j)=>R[(h+j*3)%R.length]),intendedMeanings:[],researchPrinciples:[],status:"candidate",provenance:{kind:"original-synthesis",legacyAtlasRequired:false,copiedHistoricalMotif:false}}})}
const esc=(s:string)=>s.replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"}[x]!));
export function renderNewGlyphSvg(g:NewGlyphCandidate):string{
 const h=hash(g.seed),cx=50,cy=50,stroke=3+(h%2),parts:string[]=[];
 const add=(d:string)=>parts.push(`<path d="${d}" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="square" stroke-linejoin="miter"/>`);
 g.primitiveChain.forEach((p,i)=>{const k=i+1,a=10+((h>>>i)%18),y=15+k*11;
  if(p==="axis")add(`M50 10V90`);
  else if(p==="branch")add(`M50 ${y}L${50-a} ${y+10}M50 ${y}L${50+a} ${y+10}`);
  else if(p==="enclosure")add(`M${50-a} ${cy-a}L50 ${cy-a-8}L${50+a} ${cy-a}L${50+a} ${cy+a}L50 ${cy+a+8}L${50-a} ${cy+a}Z`);
  else if(p==="step")add(`M${18+i*3} ${80-i*4}H${35+i*2}V${65-i*4}H${50+i*2}`);
  else if(p==="pulse")add(`M15 ${y}H35L43 ${y-9}L51 ${y+9}L59 ${y-9}L67 ${y}H85`);
  else if(p==="arc")add(`M${50-a} ${y}Q50 ${y-18} ${50+a} ${y}`);
  else if(p==="chevron")add(`M${50-a} ${y}L50 ${y-12}L${50+a} ${y}`);
  else if(p==="band")add(`M15 ${y}H85M15 ${y+7}H85`);
  else if(p==="lattice")add(`M25 ${y-10}L45 ${y+10}L65 ${y-10}L85 ${y+10}M15 ${y+10}L35 ${y-10}L55 ${y+10}L75 ${y-10}`);
  else if(p==="meander")add(`M15 ${y}H30V${y-10}H45V${y}H60V${y+10}H75V${y}H85`);
  else {add(`M50 ${y-12}L56 ${y-4}L68 ${y}L56 ${y+4}L50 ${y+12}L44 ${y+4}L32 ${y}L44 ${y-4}Z`)}
 });
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" data-ascend-id="${esc(g.id)}"><metadata>${esc(JSON.stringify({id:g.id,version:g.version,provenance:g.provenance,primitives:g.primitiveChain,relations:g.relations}))}</metadata><g vector-effect="non-scaling-stroke">${parts.join("")}</g></svg>`;
}
export function renderNewGlyphSvgSet(seed:string,count=108){return generateNewGlyphVocabulary(seed,count).map(g=>({id:g.id,svg:renderNewGlyphSvg(g)}))}
