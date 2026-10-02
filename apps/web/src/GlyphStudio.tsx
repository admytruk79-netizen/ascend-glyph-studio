import React,{useMemo,useState} from "react";
import {families,initialStudioState,Family} from "./studio-model";

const counts:Record<Family,number>={earth:9,water:5,fire:6,air:6,spirit:6};
const fireNames=["Rising Rays","Split Chevrons","Central Core","Expanding Lines","Ascending Path","Ignition Point"];
const zones=["collar","left-cuff","right-cuff","placket","chest","upper-sleeve","back-yoke"];

function glyphLabel(f:Family,i:number){
 if(f==="fire") return fireNames[i]||`Fire ${i+1}`;
 return `${f[0].toUpperCase()+f.slice(1)} ${String(i+1).padStart(2,"0")}`;
}

export default function GlyphStudio(){
 const [state,setState]=useState(initialStudioState);
 const glyphs=useMemo(()=>Array.from({length:counts[state.family]},(_,i)=>({id:`${state.family}-${String(i+1).padStart(2,"0")}`,label:glyphLabel(state.family,i)})),[state.family]);
 const toggle=(id:string)=>setState(s=>({...s,selectedGlyphIds:s.selectedGlyphIds.includes(id)?s.selectedGlyphIds.filter(x=>x!==id):[...s.selectedGlyphIds,id]}));
 return <main className="studio">
  <aside className="panel">
   <h1>ASCEND Glyph Studio</h1><p className="muted">Five atlases. One living glyph language.</p>
   <nav className="families">{families.map(f=><button className={state.family===f?"active":""} onClick={()=>setState(s=>({...s,family:f}))}>{f}</button>)}</nav>
   <section className="glyphGrid">{glyphs.map(g=><button className={state.selectedGlyphIds.includes(g.id)?"glyph selected":"glyph"} onClick={()=>toggle(g.id)}><span className="glyphSlot">{g.id}</span><small>{g.label}</small></button>)}</section>
  </aside>
  <section className="canvas">
   <div className="shirt" aria-label="linen shirt preview"><div className="collar"/><div className="placket"/><div className="zone">{state.selectedGlyphIds.length?state.selectedGlyphIds.join(" · "):"Select glyphs"}</div></div>
   <div className="status">Source geometry locked · {state.selectedGlyphIds.length} selected</div>
  </section>
  <aside className="panel controls">
   <h2>Composition</h2>
   {(["emblem","border","path","field","composition"] as const).map(m=><button className={state.mode===m?"active":""} onClick={()=>setState(s=>({...s,mode:m}))}>{m}</button>)}
   <h2>Placement</h2><select value={state.zoneId} onChange={e=>setState(s=>({...s,zoneId:e.target.value}))}>{zones.map(z=><option>{z}</option>)}</select>
   <p className="muted">Transforms operate on instances only. Canonical source paths remain immutable.</p>
  </aside>
 </main>
}