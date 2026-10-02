import React,{useMemo,useState} from "react";
import {families,initialStudioState,Family,CompositionMode} from "./studio-model";
import {solve} from "../../../packages/tesseract-engine/src/solver";
import {project} from "../../../packages/glyph-engine/src/project";
import {heroShirtZones} from "../../../packages/garment-spec/src/hero-shirt-zones";

const counts:Record<Family,number>={earth:9,water:5,fire:6,air:6,spirit:6};
const fireNames=["Rising Rays","Split Chevrons","Central Core","Expanding Lines","Ascending Path","Ignition Point"];
const zones=Object.keys(heroShirtZones) as (keyof typeof heroShirtZones)[];
const familyOf=(id:string)=>id.split("-")[0] as Family;
function glyphLabel(f:Family,i:number){if(f==="fire")return fireNames[i]||`Fire ${i+1}`;return `${f[0].toUpperCase()+f.slice(1)} ${String(i+1).padStart(2,"0")}`}

export default function GlyphStudio(){
 const [state,setState]=useState(initialStudioState);
 const glyphs=useMemo(()=>Array.from({length:counts[state.family]},(_,i)=>({id:`${state.family}-${String(i+1).padStart(2,"0")}`,label:glyphLabel(state.family,i)})),[state.family]);
 const generated=useMemo(()=>{
  if(state.selectedGlyphIds.length<2)return [];
  return solve({seed:state.seed,glyphs:state.selectedGlyphIds.slice(0,5).map(glyphId=>({glyphId,family:familyOf(glyphId)})),zoneId:state.zoneId,materialId:"linen-180-development",parameters:{groundedExpansive:state.groundedExpansive,orderedOrganic:state.orderedOrganic,minimalComplex:state.minimalComplex,quietCeremonial:state.quietCeremonial},variations:8})
   .map(s=>({state:s,design:project(s,heroShirtZones[state.zoneId as keyof typeof heroShirtZones],state.mode)}));
 },[state]);
 const active=generated[state.variation%Math.max(1,generated.length)];
 const toggle=(id:string)=>setState(s=>({...s,variation:0,selectedGlyphIds:s.selectedGlyphIds.includes(id)?s.selectedGlyphIds.filter(x=>x!==id):s.selectedGlyphIds.length<5?[...s.selectedGlyphIds,id]:s.selectedGlyphIds}));
 const slider=(key:"groundedExpansive"|"orderedOrganic"|"minimalComplex"|"quietCeremonial",value:number)=>setState(s=>({...s,[key]:value,variation:0}));
 return <main className="studio">
  <aside className="panel"><h1>ASCEND Glyph Studio</h1><p className="muted">Five atlases. One living glyph language.</p>
   <nav className="families">{families.map(f=><button key={f} className={state.family===f?"active":""} onClick={()=>setState(s=>({...s,family:f}))}>{f}</button>)}</nav>
   <section className="glyphGrid">{glyphs.map(g=><button key={g.id} className={state.selectedGlyphIds.includes(g.id)?"glyph selected":"glyph"} onClick={()=>toggle(g.id)}><span className="glyphSlot">{g.id}</span><small>{g.label}</small></button>)}</section>
  </aside>
  <section className="canvas">
   <div className="shirt" aria-label="linen shirt preview"><div className="collar"/><div className="placket"/>
    <div className="zone">{active?<svg viewBox={`0 0 ${heroShirtZones[state.zoneId as keyof typeof heroShirtZones].width} ${heroShirtZones[state.zoneId as keyof typeof heroShirtZones].height}`} aria-label="Tesseract projection">{active.design.placements.map(p=><g key={p.glyphId+p.z} transform={`translate(${p.x} ${p.y}) rotate(${p.rotation}) scale(${p.mirrorX?-p.scale:p.scale} ${p.scale})`}><text textAnchor="middle" fontSize="12">{p.glyphId}</text></g>)}</svg>:state.selectedGlyphIds.length<2?"Select 2–5 glyphs":"Generating…"}</div>
   </div>
   <div className="status">{active?`Tesseract · score ${active.state.score} · ${active.state.productionStatus}`:"Source geometry verification required"} · {state.selectedGlyphIds.length} selected</div>
   {generated.length>0&&<div className="variations">{generated.map((_,i)=><button key={i} className={i===state.variation?"active":""} onClick={()=>setState(s=>({...s,variation:i}))}>V{i+1}</button>)}</div>}
  </section>
  <aside className="panel controls"><h2>Composition</h2>
   {(["emblem","border","path","field","composition"] as CompositionMode[]).map(m=><button key={m} className={state.mode===m?"active":""} onClick={()=>setState(s=>({...s,mode:m,variation:0}))}>{m}</button>)}
   <h2>Placement</h2><select value={state.zoneId} onChange={e=>setState(s=>({...s,zoneId:e.target.value,variation:0}))}>{zones.map(z=><option key={z}>{z}</option>)}</select>
   <h2>Tesseract</h2>
   <label>Grounded ↔ Expansive<input type="range" min="0" max="1" step=".01" value={state.groundedExpansive} onChange={e=>slider("groundedExpansive",+e.target.value)}/></label>
   <label>Ordered ↔ Organic<input type="range" min="0" max="1" step=".01" value={state.orderedOrganic} onChange={e=>slider("orderedOrganic",+e.target.value)}/></label>
   <label>Minimal ↔ Complex<input type="range" min="0" max="1" step=".01" value={state.minimalComplex} onChange={e=>slider("minimalComplex",+e.target.value)}/></label>
   <label>Quiet ↔ Ceremonial<input type="range" min="0" max="1" step=".01" value={state.quietCeremonial} onChange={e=>slider("quietCeremonial",+e.target.value)}/></label>
   <label>Seed<input value={state.seed} onChange={e=>setState(s=>({...s,seed:e.target.value,variation:0}))}/></label>
   <p className="muted">Preview currently shows placement IDs until source SVGs pass atlas verification. The engine will not substitute invented geometry.</p>
  </aside>
 </main>
}