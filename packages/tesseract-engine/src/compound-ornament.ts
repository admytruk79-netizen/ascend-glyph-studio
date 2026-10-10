/** Hierarchical textile ornaments: compound units, not isolated line primitives.
 * An original ASCEND-style construction grammar; does not reproduce a source motif.
 * SVG geometry is a design preview, not a stitch file or loom instruction.
 */
export type CompoundKind="branching-garden"|"interlaced-rosette"|"stepped-medallion";
const fmt=(n:number)=>Number(n.toFixed(2));
const group=(body:string,transform:string)=>`<g transform="${transform}">${body}</g>`;
function leaf(x:number,y:number,s:number,angle:number){
 return group(`<path d="M0 0 Q${fmt(s*.6)} ${fmt(-s*.9)} ${fmt(s*1.7)} 0 Q${fmt(s*.6)} ${fmt(s*.9)} 0 0Z" fill="#a72f2a" stroke="#202d42" stroke-width="1.4"/><path d="M0 0 L${fmt(s*1.55)} 0" stroke="#e2b45b" stroke-width="1"/>`,`translate(${x} ${y}) rotate(${angle})`);
}
function rosette(cx:number,cy:number,r:number,n=8){
 const petals=Array.from({length:n},(_,i)=>group(`<path d="M0 0 Q${fmt(r*.33)} ${fmt(-r*.9)} 0 ${fmt(-r)} Q${fmt(-r*.33)} ${fmt(-r*.9)} 0 0Z" fill="${i%2?"#bd4e36":"#263c5d"}" stroke="#d5a553" stroke-width="1.6"/>`,`translate(${cx} ${cy}) rotate(${i*360/n})`)).join("");
 return `<g>${petals}<circle cx="${cx}" cy="${cy}" r="${fmt(r*.24)}" fill="#e1b65d" stroke="#202d42" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="${fmt(r*.09)}" fill="#202d42"/></g>`;
}
function garden(cx:number,cy:number,s:number){
 let b=`<path d="M${cx} ${fmt(cy+s*.9)} Q${fmt(cx-s*.1)} ${cy} ${cx} ${fmt(cy-s*.9)}" fill="none" stroke="#263c5d" stroke-width="5" stroke-linecap="round"/>`;
 for(let level=0;level<3;level++){
  const y=cy+s*.45-level*s*.43,reach=s*(.53-level*.08);
  for(const side of [-1,1]){
   b+=`<path d="M${cx} ${fmt(y+s*.11)} Q${fmt(cx+side*reach*.4)} ${fmt(y-s*.12)} ${fmt(cx+side*reach)} ${fmt(y-s*.26)}" fill="none" stroke="#263c5d" stroke-width="3"/>`;
   b+=leaf(cx+side*reach*.65,y-s*.19,s*.11,side===1?-20:200);
   b+=rosette(cx+side*reach,y-s*.26,s*.15,8);
  }
 }
 b+=rosette(cx,cy-s*.84,s*.27,10);
 return b;
}
function interlace(cx:number,cy:number,s:number){
 let b="";
 for(let ring=0;ring<3;ring++){
  const radius=s*(.25+ring*.19);
  const pts=Array.from({length:8},(_,i)=>{const a=(i*45-90)*Math.PI/180;return [fmt(cx+Math.cos(a)*radius),fmt(cy+Math.sin(a)*radius)]});
  b+=`<polygon points="${pts.map(p=>p.join(",")).join(" ")}" fill="none" stroke="${ring%2?"#a72f2a":"#263c5d"}" stroke-width="${fmt(5-ring)}"/>`;
  for(let i=0;i<8;i++){const p=pts[i],q=pts[(i+3)%8];b+=`<path d="M${p[0]} ${p[1]} L${q[0]} ${q[1]}" stroke="#d5a553" stroke-width="1.1" opacity=".7"/>`;}
 }
 b+=rosette(cx,cy,s*.22,8);
 return b;
}
function stepped(cx:number,cy:number,s:number){
 let b="";
 for(let layer=0;layer<4;layer++){
  const d=s*(.7-layer*.14),step=d/4;
  const pts=[[-d,0],[-d,-step],[-d+step,-step],[-d+step,-2*step],[-d+2*step,-2*step],[-d+2*step,-3*step],[0,-3*step],[0,-d],[d,0],[0,d],[-d,0]];
  const top=pts.map(([x,y])=>`${fmt(cx+x)},${fmt(cy+y)}`).join(" ");
  b+=`<polygon points="${top}" fill="none" stroke="${layer%2?"#a72f2a":"#263c5d"}" stroke-width="${fmt(5-layer*.7)}"/>`;
 }
 b+=rosette(cx,cy,s*.19,8);
 return b;
}
export function compoundOrnament(kind:CompoundKind,cx:number,cy:number,scale:number){
 return kind==="branching-garden"?garden(cx,cy,scale):kind==="interlaced-rosette"?interlace(cx,cy,scale):stepped(cx,cy,scale);
}
export function composeCompoundTextileSvg(engineSvg:string,seed:string){
 if(!engineSvg.includes("</svg>"))throw new Error("Expected Tesseract SVG");
 const key=Array.from(seed).reduce((a,c)=>(Math.imul(a^c.charCodeAt(0),16777619)>>>0),2166136261);
 const kinds:CompoundKind[]=["branching-garden","interlaced-rosette","stepped-medallion"];
 const focal=kinds[key%3]!;
 const border=Array.from({length:6},(_,i)=>{
  const x=110+i*196;
  return compoundOrnament(kinds[(key+i+1)%3]!,x,100,52)+compoundOrnament(kinds[(key+i+1)%3]!,x,1100,52);
 }).join("");
 const side=Array.from({length:4},(_,i)=>{
  const y=290+i*205;
  return compoundOrnament(kinds[(key+i+2)%3]!,80,y,46)+compoundOrnament(kinds[(key+i+2)%3]!,1120,y,46);
 }).join("");
 const centerpiece=compoundOrnament(focal,600,600,270);
 const layer=`<g data-compound-grammar="ascend-original" data-focal="${focal}" aria-label="Original hierarchical compound ornament">${border}${side}${centerpiece}</g>`;
 // Only use with 1200 x 1200 engine viewBox, as configured by the tri-culture CLI.
 return engineSvg.replace("</svg>",layer+"</svg>");
}
