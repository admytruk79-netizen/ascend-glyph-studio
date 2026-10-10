/** Author geometry interpreted from the original drawings, never museum motif copies. */
export type AuthorFamily = "seed-current" | "horizon-orbit" | "root-peak";
export type AuthorLayout = "band" | "panel" | "emblem";
export type AuthorColorway = "blue-ember" | "pencil" | "ink";
export type AuthorRecipe = {
  version: "ascend-author-ornament/1";
  family: AuthorFamily; layout: AuthorLayout; colorway: AuthorColorway;
  widthMm: number; heightMm: number; repeat: number; detail: 1 | 2 | 3; variation: number;
};
export const AUTHOR_FAMILIES: {id: AuthorFamily; name: string; description: string; sources: string[]}[] = [
  {id:"seed-current",name:"Seed & Current",description:"Nested concave stars held by a continuous branching stem.",sources:["originals/drawings/pencil/sheet-coloured-stars-branches-flowers.jpg","originals/drawings/pencil/sheet-blue-stars-and-branches.jpg"]},
  {id:"horizon-orbit",name:"Horizon & Orbit",description:"Tapered openings, an off-centre ember and an interrupted orbit.",sources:["originals/drawings/illustrations/06.jpg"]},
  {id:"root-peak",name:"Root & Peak",description:"Unequal rising peaks connected to a spreading root.",sources:["originals/drawings/illustrations/05.jpg"]}
];
export const AUTHOR_COLORWAYS: Record<AuthorColorway,{name:string;primary:string;secondary:string;accent:string}> = {
  "blue-ember":{name:"Blue & ember",primary:"#3d4088",secondary:"#a393c5",accent:"#cc662b"},
  pencil:{name:"Coloured pencil",primary:"#3f8f9a",secondary:"#5b7f3a",accent:"#c23b2e"},
  ink:{name:"One-colour ink",primary:"#252638",secondary:"#252638",accent:"#252638"}
};
const f=(n:number)=>Number(n.toFixed(3));
const stroke=(d:string,color:string,w=1)=>`<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
function motif(r:AuthorRecipe,x:number,y:number,size:number,index:number){
  const c=AUTHOR_COLORWAYS[r.colorway];let body="";
  if(r.family==="seed-current"){
    const shape="M0 -20 Q4 -4 16 0 Q4 4 0 23 Q-4 4 -16 0 Q-4 -4 0 -20Z";
    body=stroke(shape,c.primary,1.7);
    if(r.detail>=2)body+=`<g transform="scale(.67)">${stroke(shape,c.secondary,1.9)}</g>`;
    if(r.detail===3)body+=`<g transform="scale(.4)">${stroke(shape,c.primary,2)}</g>`;
    body+=`<path d="M0 -4 L3 0 L0 5 L-3 0Z" fill="${c.accent}"/>`;
    for(let i=0;i<8;i++){
      const a=(i+.5)*Math.PI/4;const rad=24+(index+r.variation)%3;
      body+=stroke(`M${f(Math.cos(a)*rad)} ${f(Math.sin(a)*rad)} q${f(Math.cos(a)*4-Math.sin(a)*2)} ${f(Math.sin(a)*4+Math.cos(a)*2)} ${f(Math.cos(a)*8)} ${f(Math.sin(a)*8)}`,i%2?c.secondary:c.accent,1.3);
    }
  }else if(r.family==="horizon-orbit"){
    body=stroke("M-29 0 Q-8 -27 29 0 Q2 23 -29 0Z",c.primary,1.7);
    if(r.detail>=2)body+=stroke("M-21 0 Q-5 -17 20 0 Q1 14 -21 0Z",c.secondary,1.2);
    body+=stroke("M-14 5 L-5 -4 L1 2 L10 -10 L20 5",c.primary,1.2)+`<circle cx="-6" cy="-6" r="3.4" fill="${c.accent}"/>`;
    if(r.detail===3)body+=stroke("M21 -25 A30 30 0 1 0 26 19",c.secondary,1.1);
  }else{
    body=stroke("M-26 10 L-6 -22 L1 -5 L12 -16 L26 10",c.primary,1.8)+stroke("M-6 -22 L-6 16 M-6 16 Q-15 23 -25 25 M-6 16 Q-1 24 9 27 M-6 16 Q3 18 22 23",c.secondary,1.3);
    body+=`<circle cx="17" cy="-18" r="3.8" fill="${c.accent}"/>`;
    if(r.detail>=2)body+=stroke("M-23 10 L-14 10 M8 10 L25 10",c.secondary,1.2);
    if(r.detail===3)body+=stroke("M-6 16 Q-17 16 -29 20 M-6 16 Q-4 29 -6 31",c.primary,1.2);
  }
  return `<g data-role="motif" transform="translate(${f(x)} ${f(y)}) scale(${f(size/64)})">${body}</g>`;
}
function current(r:AuthorRecipe,y:number,start:number,end:number,cells:number,space:number){
  const c=AUTHOR_COLORWAYS[r.colorway];const pitch=(end-start)/cells;let body="";
  for(let i=0;i<cells;i++){
    const x=start+i*pitch;
    body+=stroke(`M${f(x)} ${f(y)} C${f(x+pitch/3)} ${f(y-Math.min(pitch*.13,space*.1))} ${f(x+pitch*2/3)} ${f(y+Math.min(pitch*.13,space*.1))} ${f(x+pitch)} ${f(y)}`,c.secondary,.8);
    for(const [phase,side] of [[.27,-1],[.72,1]]){
      const bx=x+pitch*phase;const tip=bx+pitch*.2;const by=y+side*Math.min(pitch*.18,space*.12);
      body+=stroke(`M${f(bx)} ${f(y)} Q${f(bx+pitch*.06)} ${f(by)} ${f(tip)} ${f(by)} Q${f(bx+pitch*.15)} ${f(y+side*Math.min(pitch*.02,space*.02))} ${f(bx)} ${f(y)}`,c.secondary,.55);
    }
  }
  return `<g data-role="separator">${body}</g>`;
}
export function validateAuthorRecipe(r:AuthorRecipe):void{
  if(r.version!=="ascend-author-ornament/1"||!AUTHOR_FAMILIES.some(x=>x.id===r.family)||!["band","panel","emblem"].includes(r.layout)||!Object.hasOwn(AUTHOR_COLORWAYS,r.colorway))throw new Error("Unsupported author recipe");
  if(!Number.isFinite(r.widthMm)||!Number.isFinite(r.heightMm)||r.widthMm<40||r.widthMm>400||r.heightMm<30||r.heightMm>500)throw new Error("Dimensions outside supported preview range");
  if(!Number.isInteger(r.repeat)||r.repeat<3||r.repeat>8||(r.layout==="panel"&&r.repeat>4)||![1,2,3].includes(r.detail)||!Number.isInteger(r.variation)||r.variation<0||r.variation>1000)throw new Error("Invalid composition controls");
}
export function composeAuthorOrnament(r:AuthorRecipe):{id:string;svg:string;recipe:AuthorRecipe;sources:string[];status:"prototype"}{
  validateAuthorRecipe(r);const w=r.widthMm,h=r.heightMm;let body="";
  if(r.layout==="band"){
    const pitch=w/r.repeat;const size=Math.min(pitch*.78,h*.66);
    for(let i=0;i<r.repeat;i++)body+=motif(r,(i+.5)*pitch,h*.38,size,i);
    body+=current(r,h*.74,0,w,r.repeat,h);
  }else if(r.layout==="panel"){
    const cols=Math.min(r.repeat,4);const rows=Math.max(2,Math.min(5,Math.round(h/w*cols)));
    const pitch=w/cols;const rowHeight=h/rows;const size=Math.min(pitch*.75,rowHeight*.65);
    for(let row=0;row<rows;row++){
      for(let col=0;col<cols;col++)body+=motif(r,(col+.5)*pitch,(row+.35)*rowHeight,size,row*cols+col);
      body+=current(r,(row+.76)*rowHeight,0,w,cols,rowHeight);
    }
  }else{
    const size=Math.min(w,h)*.72;body+=motif(r,w/2,h*.46,size,0);
    body+=current(r,h*.84,w*.12,w*.88,3,h);
  }
  const recipe={...r};const serial=JSON.stringify([r.version,r.family,r.layout,r.colorway,w,h,r.repeat,r.detail,r.variation]);let hash=2166136261;for(const ch of serial)hash=Math.imul(hash^ch.charCodeAt(0),16777619);
  const id="author-"+(hash>>>0).toString(16).padStart(8,"0");
  const name=AUTHOR_FAMILIES.find(x=>x.id===r.family)!;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}" role="img"><title>ASCEND ${name.name.replace(/&/g,"&amp;")}</title><desc>Original geometric interpretation. ${w} by ${h} millimetres. Prototype, not a validated stitch file.</desc>${body}</svg>`;
  return {id,svg,recipe,sources:[...name.sources],status:"prototype"};
}
