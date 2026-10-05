import React,{useMemo,useState} from "react";
import {generatePatterns,type PatternMode} from "../../../packages/tesseract-engine/src/pattern-generator";
import {deriveAuditedGrammar,type PrincipleSignal,type EvidenceObservation} from "../../../packages/glyph-engine/src/grammar";
import {generateCandidates} from "../../../packages/glyph-engine/src/candidates";
import type {EngineIntent} from "../../../packages/glyph-engine/src/core";
import {analyzeComposition} from "../../../packages/glyph-engine/src/composition-analysis";
import {analyzeSpatial} from "../../../packages/glyph-engine/src/spatial-analysis";
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
 const principles:PrincipleSignal[]=concepts.map((c,i)=>({id:`ui-${c}`,kind:c,label:`${c} rhythm axis border path`,confidence:.82,culturalAccess:"open",abstraction:{concept:c}}));
 const observations:EvidenceObservation[]=principles.flatMap((p,i)=>[{principleId:p.id,sourceId:`ui-source-${i}-a`,region:"research",period:"corpus",confidence:.82,stance:"supports" as const,culturalAccess:"open"},{principleId:p.id,sourceId:`ui-source-${i}-b`,region:"research-2",period:"corpus-2",confidence:.8,stance:"supports" as const,culturalAccess:"open"}]);
 const analytical=useMemo(()=>{try{const grammar=deriveAuditedGrammar(principles,observations);const intent:EngineIntent={seed:seed+":"+revision,meanings:concepts,principleIds:principles.map(p=>p.id),product:{kind:"diary",zones:[{id:"cover",widthMm:148,heightMm:210,safeInsetMm:12,role:"hero-cover"}]},density:complexity<.35?"restrained":complexity>.7?"complex":"balanced",symmetry:"bilateral"};const candidate=generateCandidates(intent,1,grammar)[0];if(!candidate)return null;const composition=analyzeComposition(candidate),spatial=analyzeSpatial(candidate.zones[0],148,210,12);return{candidate,composition,spatial,grammar}}catch{return null}},[seed,revision,concepts,complexity]);
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
    <div className="meta"><strong>{active?.lineageId??"No lineage"}</strong><span>{active?("score "+active.score.toFixed(1)+" · novelty "+active.novelty.toFixed(2)):""}</span></div><div className="analysisPanel"><h2>Analytical engine</h2>{analytical?<><div dangerouslySetInnerHTML={{__html:analytical.candidate.zones[0].svg}}/><p>Evidence rules {analytical.grammar.rules.length} · composition {analytical.composition.score.toFixed(2)} · spatial {analytical.spatial.score.toFixed(2)} · symmetry {analytical.spatial.symmetry.toFixed(2)} · negative space {analytical.composition.negativeSpace.toFixed(2)}</p></>:<p>No evidence-qualified analysis.</p>}</div>
   </section>
   <aside className="variants"><h2>Pattern families</h2><div className="variantGrid">{patterns.map((p,i)=><button key={p.id} className={i===selected?"variant selected":"variant"} onClick={()=>setSelected(i)}><div className="thumb" dangerouslySetInnerHTML={{__html:p.svg}}/><small>{p.lineageId}</small></button>)}</div></aside>
  </section>
 </main>
}
