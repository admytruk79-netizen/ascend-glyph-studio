import React,{useMemo,useState} from "react";
import {generatePatterns,type PatternMode} from "../../../packages/tesseract-engine/src/pattern-generator";
import {ASCEND_PALETTES} from "../../../packages/tesseract-engine/src/color-system";

const conceptOptions=["ancestry","freedom","protection","return","ascent","lineage","courage","transformation","healing","knowledge","spirit","earth","cosmos","choice","journey"];
const modes:PatternMode[]=["band","field","emblem","sleeve","cuff","collar"];

export default function GlyphStudio(){
 const [concepts,setConcepts]=useState(["ancestry","freedom","protection"]);
 const [mode,setMode]=useState<PatternMode>("band");
 const [paletteId,setPaletteId]=useState("underdog-heritage");
 const [seed,setSeed]=useState("ascend-001");
 const [complexity,setComplexity]=useState(.68);
 const [revision,setRevision]=useState(0);
 const patterns=useMemo(()=>generatePatterns({seed:seed+":"+revision,concepts,paletteId,mode,complexity,variations:12,width:960,height:260}),[seed,revision,concepts,paletteId,mode,complexity]);
 const [selected,setSelected]=useState(0);
 const active=patterns[Math.min(selected,Math.max(0,patterns.length-1))];
 const toggleConcept=(c:string)=>setConcepts(xs=>xs.includes(c)?xs.length>1?xs.filter(x=>x!==c):xs:xs.length<6?[...xs,c]:xs);

 return <main className="studioApp">
  <header className="topbar"><div><div className="eyebrow">ASCEND</div><h1>Glyph Studio</h1></div><button className="generate" onClick={()=>{setRevision(x=>x+1);setSelected(0)}}>Generate new family</button></header>
  <section className="workspace">
   <aside className="controls">
    <h2>Meaning</h2><div className="chips">{conceptOptions.map(c=><button key={c} className={concepts.includes(c)?"chip active":"chip"} onClick={()=>toggleConcept(c)}>{c}</button>)}</div>
    <h2>Pattern type</h2><div className="chips">{modes.map(m=><button key={m} className={mode===m?"chip active":"chip"} onClick={()=>{setMode(m);setSelected(0)}}>{m}</button>)}</div>
    <h2>Palette</h2><select value={paletteId} onChange={e=>{setPaletteId(e.target.value);setSelected(0)}}>{Object.values(ASCEND_PALETTES).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
    <h2>Complexity</h2><input type="range" min="0" max="1" step=".01" value={complexity} onChange={e=>setComplexity(+e.target.value)}/>
    <h2>Seed</h2><input value={seed} onChange={e=>setSeed(e.target.value)}/>
   </aside>
   <section className="previewColumn">
    <div className="shirtStage"><div className="shirt3d"><div className="neck"/><div className="placket"/><div className={"patternZone "+mode} dangerouslySetInnerHTML={{__html:active?.svg??""}}/></div></div>
    <div className="meta"><strong>{active?.lineageId??"No lineage"}</strong><span>{active?("score "+active.score.toFixed(1)+" · novelty "+active.novelty.toFixed(2)):""}</span></div>
   </section>
   <aside className="variants"><h2>Pattern families</h2><div className="variantGrid">{patterns.map((p,i)=><button key={p.id} className={i===selected?"variant selected":"variant"} onClick={()=>setSelected(i)}><div className="thumb" dangerouslySetInnerHTML={{__html:p.svg}}/><small>{p.lineageId}</small></button>)}</div></aside>
  </section>
 </main>
}
