import React,{useMemo,useState} from "react";
import {generateCandidates} from "../../../packages/glyph-engine/src/candidates";
import type {EngineIntent} from "../../../packages/glyph-engine/src/core";
import {analyzeComposition} from "../../../packages/glyph-engine/src/composition-analysis";
import {analyzeSpatial} from "../../../packages/glyph-engine/src/spatial-analysis";

const meanings=["lineage","freedom","guardian","journey","transformation","protection","belonging","ascent"];
const zones={cover:{widthMm:148,heightMm:210,safeInsetMm:12,role:"hero-cover"},spine:{widthMm:18,heightMm:210,safeInsetMm:3,role:"spine"},border:{widthMm:148,heightMm:210,safeInsetMm:8,role:"frame"},divider:{widthMm:148,heightMm:210,safeInsetMm:14,role:"divider"},emblem:{widthMm:36,heightMm:36,safeInsetMm:4,role:"mark"}} as const;
type Zone=keyof typeof zones;

export default function GlyphStudio(){
 const [selectedMeanings,setMeanings]=useState(["lineage","journey"]);
 const [zone,setZone]=useState<Zone>("cover");const [seed,setSeed]=useState("ascend-diary-001");const [density,setDensity]=useState<EngineIntent["density"]>("balanced");const [revision,setRevision]=useState(0);
 const evidenceAvailable=false; // fail closed until the real research API is connected; never fabricate evidence in the browser.
 const result=useMemo(()=>{if(!evidenceAvailable)return null;const z=zones[zone];const intent:EngineIntent={seed:`${seed}:${revision}`,meanings:selectedMeanings,principleIds:[],density,symmetry:"bilateral",product:{kind:"diary",zones:[{id:zone,...z}]}};const c=generateCandidates(intent,8)[0];if(!c)return null;return{candidate:c,composition:analyzeComposition(c),spatial:analyzeSpatial(c.zones[0]!,z.widthMm,z.heightMm,z.safeInsetMm)}},[seed,revision,selectedMeanings,zone,density,evidenceAvailable]);
 const toggle=(m:string)=>setMeanings(xs=>xs.includes(m)?xs.length>1?xs.filter(x=>x!==m):xs:[...xs,m]);
 return <main className="studioApp"><header className="topbar"><div><div className="eyebrow">ASCEND · RESEARCH ENGINE</div><h1>Glyph Studio</h1><p>ROOTS → MEANING → GRAMMAR → FORM</p></div><button className="generate" disabled={!evidenceAvailable} onClick={()=>setRevision(x=>x+1)}>Generate diary family</button></header>
 <section className="workspace"><aside className="controls"><h2>Meaning</h2><div className="chips">{meanings.map(m=><button key={m} className={selectedMeanings.includes(m)?"chip active":"chip"} onClick={()=>toggle(m)}>{m}</button>)}</div><h2>Diary zone</h2><div className="chips">{(Object.keys(zones) as Zone[]).map(z=><button key={z} className={zone===z?"chip active":"chip"} onClick={()=>setZone(z)}>{z}</button>)}</div><h2>Density</h2><select value={density} onChange={e=>setDensity(e.target.value as EngineIntent["density"])}><option>restrained</option><option>balanced</option><option>complex</option></select><h2>Seed</h2><input value={seed} onChange={e=>setSeed(e.target.value)}/></aside>
 <section className="previewColumn"><div className="analysisPanel"><h2>Research gate</h2>{!evidenceAvailable?<><p><strong>Generation locked.</strong></p><p>No synthetic evidence is permitted. Connect the verified Neon research snapshot to enable synthesis.</p></>:result?<><div dangerouslySetInnerHTML={{__html:result.candidate.zones[0]!.svg}}/><p>Composition {result.composition.score.toFixed(2)} · spatial {result.spatial.score.toFixed(2)} · symmetry {result.spatial.symmetry.toFixed(2)} · negative space {result.composition.negativeSpace.toFixed(2)}</p></>:<p>No eligible candidate.</p>}</div></section>
 <aside className="variants"><h2>Production target</h2><p>A5 diary family</p><p>Cover · spine · border · divider · emblem</p><h2>Required gates</h2><p>Evidence · provenance · cultural review · originality · manufacturing · human approval</p></aside></section></main>
}