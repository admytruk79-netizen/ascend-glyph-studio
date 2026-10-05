import { PhraseField } from "./phrase-field";

export type VoidForm = "axis" | "portal" | "wings" | "crown" | "seed" | "return-loop";
export interface VoidPoint { x:number; y:number; r:number }
export interface DualReadingField {
  sourceId:string; semanticChecksum:string; foregroundMacro:string;
  voidForm:VoidForm; voidPoints:VoidPoint[]; clearance:number;
}
const hash=(s:string)=>{let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};

export function extractNegativeSpace(f:PhraseField):DualReadingField {
  const h=hash(f.id+"|void");
  const forms:VoidForm[]=["axis","portal","wings","crown","seed","return-loop"];
  const voidForm=forms[h%forms.length]!;
  const voidPoints:VoidPoint[]=Array.from({length:36},(_,i)=>{
    const t=i/35,a=t*Math.PI*2;
    let x=50,y=50;
    if(voidForm==="axis"){x=50+Math.sin(a*3)*3;y=8+t*84}
    else if(voidForm==="portal"){x=50+28*Math.cos(Math.PI+t*Math.PI);y=82-54*Math.sin(t*Math.PI)}
    else if(voidForm==="wings"){x=50+34*Math.sin(a)*Math.sin(a);y=10+t*80}
    else if(voidForm==="crown"){x=12+t*76;y=55-22*Math.abs(Math.sin(a*1.5))}
    else if(voidForm==="seed"){x=50+18*Math.sin(a);y=50+30*Math.cos(a)}
    else{x=50+25*Math.sin(a);y=50+20*Math.sin(a*2)}
    return{x:Number(x.toFixed(2)),y:Number(y.toFixed(2)),r:Number((1.4+(i%4)*.28).toFixed(2))};
  });
  return{
    sourceId:f.id,semanticChecksum:f.semanticChecksum,foregroundMacro:f.macroForm,
    voidForm,voidPoints,clearance:Number((2.4+(h%12)/10).toFixed(1))
  };
}

export function renderVoidMask(d:DualReadingField):string {
  return `<mask id="asc-void"><rect width="100" height="100" fill="white"/>${d.voidPoints.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="${p.r+d.clearance}" fill="black"/>`).join("")}</mask>`;
}
