import React,{useMemo,useState} from "react";
import {generatePatterns,type PatternMode} from "../../../packages/tesseract-engine/src/pattern-generator";
import {ASCEND_PALETTES} from "../../../packages/tesseract-engine/src/color-system";
import {Garment3D} from "./Garment3D";
import {synthesizeUniversal} from "../../../packages/glyph-engine/src/universal";
import {DEFAULT_GRAMMAR} from "../../../packages/glyph-engine/src/grammar";

type ProductId="mens-shirt"|"womens-shirt"|"diary";
type SizeId="XS"|"S"|"M"|"L"|"XL"|"XXL";
type FabricId="natural-linen"|"midnight-linen"|"black-linen";
type Step=1|2|3|4|5;

const products:{id:ProductId;name:string;subtitle:string}[]=[
 {id:"mens-shirt",name:"Men's Shirt",subtitle:"Modern linen cut"},
 {id:"womens-shirt",name:"Women's Shirt",subtitle:"Modern linen cut"},
 {id:"diary",name:"Heritage Diary",subtitle:"Hard cover / textile or leather"}
];
const sizes:SizeId[]=["XS","S","M","L","XL","XXL"];
const fabrics:{id:FabricId;name:string;hex:string}[]=[
 {id:"natural-linen",name:"Natural Linen",hex:"#ded1ba"},
 {id:"midnight-linen",name:"Midnight Navy",hex:"#0f1b2d"},
 {id:"black-linen",name:"Raven Black",hex:"#111111"}
];
const conceptOptions=["ancestry","freedom","protection","return","ascent","lineage","courage","transformation","healing","knowledge","spirit","earth","cosmos","choice","journey"];
const modes:PatternMode[]=["band","field","emblem","sleeve","cuff","collar"];

export default function GlyphStudio(){
 const [step,setStep]=useState<Step>(1);
 const [product,setProduct]=useState<ProductId>("mens-shirt");
 const [size,setSize]=useState<SizeId>("M");
 const [fabric,setFabric]=useState<FabricId>("natural-linen");
 const [concepts,setConcepts]=useState(["ancestry","freedom","protection"]);
 const [mode,setMode]=useState<PatternMode>("band");
 const [paletteId,setPaletteId]=useState("underdog-heritage");
 const [seed,setSeed]=useState("ascend-001");
 const [complexity,setComplexity]=useState(.68);
 const [revision,setRevision]=useState(0);
 const [selected,setSelected]=useState(0);
 const [cart,setCart]=useState(false);

 const patterns=useMemo(()=>generatePatterns({seed:seed+":"+revision,concepts,paletteId,mode,complexity,variations:12,width:960,height:260}),[seed,revision,concepts,paletteId,mode,complexity]);
 const active=patterns[Math.min(selected,Math.max(0,patterns.length-1))];
 const universal=useMemo(()=>synthesizeUniversal({seed:seed+":"+revision,meanings:concepts,principleIds:["verified-research"],density:complexity<.34?"restrained":complexity>.7?"complex":"balanced",symmetry:"bilateral"},DEFAULT_GRAMMAR),[seed,revision,concepts,complexity]);
 const activeFabric=fabrics.find(x=>x.id===fabric)!;
 const toggleConcept=(c:string)=>setConcepts(xs=>xs.includes(c)?xs.length>1?xs.filter(x=>x!==c):xs:xs.length<6?[...xs,c]:xs);

 const next=()=>setStep(s=>Math.min(5,s+1) as Step);
 const back=()=>setStep(s=>Math.max(1,s-1) as Step);

 return <main className="studioApp">
  <header className="topbar">
   <div><div className="eyebrow">ASCEND</div><h1>Glyph Studio</h1><small>Universal engine · {universal.id}</small></div>
   <div className="topActions"><span className="liveBadge">LIVE GENERATOR</span><button className="cartBtn" onClick={()=>setCart(v=>!v)}>Cart {cart?"1":"0"}</button></div>
  </header>

  <div className="stepper">
   {(["Choose","Fit","Material","Pattern","Review"] as const).map((label,i)=><button key={label} onClick={()=>setStep((i+1) as Step)} className={step===i+1?"step active":step>i+1?"step done":"step"}><b>{String(i+1).padStart(2,"0")}</b><span>{label}</span></button>)}
  </div>

  <section className="workspace">
   <aside className="controls">
    {step===1&&<><h2>Choose product</h2><div className="productCards">{products.map(p=><button key={p.id} className={product===p.id?"productCard active":"productCard"} onClick={()=>setProduct(p.id)}><strong>{p.name}</strong><small>{p.subtitle}</small></button>)}</div></>}
    {step===2&&<><h2>Choose size</h2><div className="sizeGrid">{sizes.map(s=><button key={s} onClick={()=>setSize(s)} className={size===s?"size active":"size"}>{s}</button>)}</div><p className="hint">Production sizing will use the garment specification, not visual scaling.</p></>}
    {step===3&&<><h2>Material & base colour</h2><div className="fabricList">{fabrics.map(f=><button key={f.id} onClick={()=>setFabric(f.id)} className={fabric===f.id?"fabric active":"fabric"}><i style={{background:f.hex}}/><span>{f.name}</span></button>)}</div><h2>Pattern palette</h2><select value={paletteId} onChange={e=>setPaletteId(e.target.value)}>{Object.values(ASCEND_PALETTES).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></>}
    {step===4&&<><h2>Meaning</h2><div className="chips">{conceptOptions.map(c=><button key={c} className={concepts.includes(c)?"chip active":"chip"} onClick={()=>toggleConcept(c)}>{c}</button>)}</div><h2>Placement</h2><div className="chips">{modes.map(m=><button key={m} className={mode===m?"chip active":"chip"} onClick={()=>{setMode(m);setSelected(0)}}>{m}</button>)}</div><h2>Complexity</h2><input type="range" min="0" max="1" step=".01" value={complexity} onChange={e=>setComplexity(+e.target.value)}/><button className="generate wide" onClick={()=>{setRevision(x=>x+1);setSelected(0)}}>Generate new family</button><h2>Seed</h2><input value={seed} onChange={e=>setSeed(e.target.value)}/></>}
    {step===5&&<><h2>Review design</h2><dl className="summary"><dt>Product</dt><dd>{products.find(p=>p.id===product)?.name}</dd><dt>Size</dt><dd>{size}</dd><dt>Material</dt><dd>{activeFabric.name}</dd><dt>Placement</dt><dd>{mode}</dd><dt>Palette</dt><dd>{ASCEND_PALETTES[paletteId]?.name}</dd><dt>Lineage</dt><dd>{active?.lineageId??"—"}</dd></dl><button className="generate wide" onClick={()=>setCart(true)}>Add configured piece to cart</button></>}
    <div className="navButtons"><button disabled={step===1} onClick={back}>Back</button><button disabled={step===5} onClick={next}>Continue</button></div>
   </aside>

   <section className="previewColumn">
    <div className="productStage">
     {product==="diary"?<div className="diary3d" style={{background:activeFabric.hex}}><div className={"diaryPattern "+mode} dangerouslySetInnerHTML={{__html:active?.svg??""}}/><div className="diaryBrand">ASCEND</div></div>:
     <Garment3D svg={active?.svg??""} fabric={activeFabric.hex} mode={mode}/>} 
    </div>
    <div className="meta"><strong>{active?.lineageId??"No lineage"}</strong><span>universal rules {universal.recipe.ruleIds.length} · seed {universal.seed}</span><span>{active?("score "+active.score.toFixed(1)+" · novelty "+active.novelty.toFixed(2)):""}</span></div>
    <div className="selectionStrip"><span>{products.find(p=>p.id===product)?.name}</span><span>{size}</span><span>{activeFabric.name}</span><span>{mode}</span></div>
   </section>

   <aside className="variants">
    <h2>Generated families</h2>
    <p className="hint">Every variant is generated from the selected meanings, ASCEND source geometry and the current evolution seed.</p>
    <div className="variantGrid">{patterns.map((p,i)=><button key={p.id} className={i===selected?"variant selected":"variant"} onClick={()=>setSelected(i)}><div className="thumb" dangerouslySetInnerHTML={{__html:p.svg}}/><small>{p.lineageId}</small></button>)}</div>
   </aside>
  </section>

  {cart&&<div className="cartDrawer"><button className="close" onClick={()=>setCart(false)}>×</button><div className="eyebrow">CONFIGURED PIECE</div><h2>{products.find(p=>p.id===product)?.name}</h2><p>{size} · {activeFabric.name} · {mode}</p><div className="cartPreview" dangerouslySetInnerHTML={{__html:active?.svg??""}}/><p className="hint">Checkout/payment connection is the next commerce layer; configuration is preserved in this session.</p></div>}
 </main>
}