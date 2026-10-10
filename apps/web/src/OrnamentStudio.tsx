import React,{useMemo,useState} from "react";
import {AUTHOR_FAMILIES,AUTHOR_COLORWAYS,composeAuthorOrnament,validateAuthorRecipe,type AuthorRecipe,type AuthorFamily,type AuthorLayout,type AuthorColorway} from "../../../packages/tesseract-engine/src/author-ornament";
import "./ornament-studio.css";

type Product="shirt"|"diary";
type Placement="cuff"|"collar"|"chest"|"cover";
type Saved={product:Product;placement:Placement;ground:string;size:string;recipe:AuthorRecipe};
const DEFAULT:Saved={product:"shirt",placement:"cuff",ground:"#efe9dc",size:"M",recipe:{version:"ascend-author-ornament/1",family:"seed-current",layout:"band",colorway:"blue-ember",widthMm:240,heightMm:60,repeat:6,detail:2,variation:0}};
const KEY="ascend-author-composition-v1";
const GROUNDS=[{name:"Natural linen",hex:"#efe9dc"},{name:"Midnight linen",hex:"#13131e"},{name:"Warm sand",hex:"#d7c4a6"}];
function restore():Saved{
  try{const value=JSON.parse(localStorage.getItem(KEY)||"null") as Saved;
    if(!value||!["shirt","diary"].includes(value.product)||!["cuff","collar","chest","cover"].includes(value.placement)||!GROUNDS.some(g=>g.hex===value.ground)||!["XS","S","M","L","XL","XXL"].includes(value.size))return DEFAULT;
    if((value.product==="diary")!==(value.placement==="cover"))return DEFAULT;
    validateAuthorRecipe(value.recipe);return value;
  }catch{return DEFAULT;}
}
function download(name:string,text:string,type:string){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function dimensions(p:Placement){return p==="cuff"?{widthMm:240,heightMm:60}:p==="collar"?{widthMm:180,heightMm:40}:p==="chest"?{widthMm:140,heightMm:180}:{widthMm:140,heightMm:200};}

export default function OrnamentStudio({onResearch}:{onResearch:()=>void}){
  const [state,setState]=useState<Saved>(restore);const [notice,setNotice]=useState("");const [view,setView]=useState<"product"|"artwork">("product");
  const piece=useMemo(()=>composeAuthorOrnament(state.recipe),[state.recipe]);
  const family=AUTHOR_FAMILIES.find(x=>x.id===state.recipe.family)!;
  const update=(patch:Partial<AuthorRecipe>)=>{setNotice("");setState(s=>({...s,recipe:{...s.recipe,...patch}}));};
  const place=(placement:Placement)=>{setNotice("");setState(s=>({...s,placement,product:placement==="cover"?"diary":"shirt",recipe:{...s.recipe,...dimensions(placement),layout:placement==="cuff"||placement==="collar"?"band":"panel",repeat:placement==="cuff"?6:placement==="collar"?5:3}}));};
  const sourceURL=(p:string)=>"https://github.com/admytruk79-netizen/ascend-glyph-studio/blob/tesseract-staging/"+p;
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state));setNotice("Saved on this device. Your artwork and settings will return when you reopen the Studio.");}catch{setNotice("Device storage is unavailable. Download the specification to keep your design.");}};
  const exportSpec=()=>download(piece.id+".json",JSON.stringify({schema:"ascend-composition-spec/1",designId:piece.id,...state,sources:piece.sources,sourceInterpretation:"original-geometric-abstraction",validation:{status:"prototype",sewOutValidated:false},svg:piece.svg},null,2),"application/json");
  const previews=AUTHOR_FAMILIES.map(f=>({family:f,piece:composeAuthorOrnament({...state.recipe,family:f.id,layout:"band",widthMm:180,heightMm:50,repeat:4})}));
  return <main className="ornamentApp">
    <header className="ornamentHeader"><a className="ornamentWordmark" href="#">ASCEND<span>PERSONAL ORNAMENT STUDIO</span></a><button className="quietButton" onClick={onResearch}>Research & generated runs</button></header>
    <div className="ornamentIntro"><div><span className="ornamentEyebrow">YOUR DRAWINGS. YOUR COMPOSITION.</span><h1>Make it your own.</h1><p>Choose a family, compose its rhythm, and see it on your piece.</p></div><span className="prototypeTag">Design prototype</span></div>
    <div className="ornamentWorkspace">
      <aside className="ornamentControls">
        <section><h2><b>01</b> Choose your piece</h2><div className="choicePair"><button aria-pressed={state.product==="shirt"} onClick={()=>place("cuff")}>Linen shirt</button><button aria-pressed={state.product==="diary"} onClick={()=>place("cover")}>Diary cover</button></div>
          <label htmlFor="ornament-placement">Placement</label><select id="ornament-placement" value={state.placement} onChange={e=>place(e.target.value as Placement)}>{(state.product==="shirt"?["cuff","collar","chest"]:["cover"]).map(x=><option key={x} value={x}>{x[0].toUpperCase()+x.slice(1)}</option>)}</select>
          {state.product==="shirt"&&<><label htmlFor="ornament-size">Size preference</label><select id="ornament-size" value={state.size} onChange={e=>{setNotice("");setState(s=>({...s,size:e.target.value}));}}>{["XS","S","M","L","XL","XXL"].map(x=><option key={x}>{x}</option>)}</select></>}
        </section>
        <section><h2><b>02</b> Choose a family</h2><div className="authorFamilies">{previews.map(({family:f,piece:p})=><button key={f.id} aria-pressed={state.recipe.family===f.id} onClick={()=>update({family:f.id as AuthorFamily})}><span className="familyArtwork" dangerouslySetInnerHTML={{__html:p.svg}}/><strong>{f.name}</strong><small>{f.description}</small></button>)}</div></section>
        <section><h2><b>03</b> Compose the rhythm</h2><label htmlFor="ornament-layout">Composition</label><select id="ornament-layout" value={state.recipe.layout} onChange={e=>update({layout:e.target.value as AuthorLayout,repeat:e.target.value==="panel"?3:6})}><option value="band">Motif row + flowing separator</option><option value="panel">Layered rows + separators</option><option value="emblem">One focal motif + branch</option></select>
          {state.recipe.layout!=="emblem"&&<><label htmlFor="ornament-repeat">{state.recipe.layout==="panel"?"Columns":"Motifs per repeat"}<output>{state.recipe.repeat}</output></label><input id="ornament-repeat" type="range" min="3" max={state.recipe.layout==="panel"?4:8} step="1" value={state.recipe.repeat} onChange={e=>update({repeat:Number(e.target.value)})}/></>}
          <label htmlFor="ornament-detail">Detail</label><select id="ornament-detail" value={state.recipe.detail} onChange={e=>update({detail:Number(e.target.value) as 1|2|3})}><option value="1">Essential</option><option value="2">Layered</option><option value="3">Elaborate</option></select>
          {state.recipe.family==="seed-current"&&<button className="quietButton fullWidth" onClick={()=>update({variation:(state.recipe.variation+1)%1001})}>Vary the star accents</button>}
        </section>
        <section><h2><b>04</b> Ground & thread colours</h2><div className="groundChoices">{GROUNDS.map(g=><button key={g.hex} aria-label={g.name} title={g.name} aria-pressed={state.ground===g.hex} style={{background:g.hex}} onClick={()=>{setNotice("");setState(s=>({...s,ground:g.hex}));}}/>)}</div><label htmlFor="ornament-colorway">Colourway</label><select id="ornament-colorway" value={state.recipe.colorway} onChange={e=>update({colorway:e.target.value as AuthorColorway})}>{Object.entries(AUTHOR_COLORWAYS).map(([id,c])=><option key={id} value={id}>{c.name}</option>)}</select><div className="threadSwatches">{["primary","secondary","accent"].map(key=><span key={key}><i style={{background:AUTHOR_COLORWAYS[state.recipe.colorway][key as "primary"|"secondary"|"accent"]}}/>{key}</span>)}</div></section>
      </aside>
      <section className="ornamentPreview">
        <div className="previewToolbar"><span>{family.name}</span><div><button aria-pressed={view==="product"} onClick={()=>setView("product")}>On your piece</button><button aria-pressed={view==="artwork"} onClick={()=>setView("artwork")}>Exact artwork</button></div></div>
        <div className="authorProductStage">
          {view==="artwork"?<div className="exactArtwork" style={{background:state.ground,aspectRatio:String(state.recipe.widthMm/state.recipe.heightMm)}} dangerouslySetInnerHTML={{__html:piece.svg}}/>:state.product==="diary"?<div className="authorDiary" style={{background:state.ground}}><div className="authorDiaryMark">ASCEND</div><div className="coverOrnament" dangerouslySetInnerHTML={{__html:piece.svg}}/></div>:<svg className="authorShirt" viewBox="0 0 500 580" aria-label={"Shirt with "+family.name+" on the "+state.placement}>
            <defs><clipPath id="shirt-outline"><path d="M150 45 L200 20 Q250 65 300 20 L350 45 L450 150 L400 210 L340 160 L340 535 L160 535 L160 160 L100 210 L50 150Z"/></clipPath><pattern id="linen-texture" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0 0H5 M0 0V5" stroke="#ffffff" strokeOpacity=".15" strokeWidth=".6"/></pattern></defs>
            <g clipPath="url(#shirt-outline)"><rect width="500" height="580" fill={state.ground}/><rect width="500" height="580" fill="url(#linen-texture)"/>
            {state.placement==="cuff"?<><g transform="translate(58 132) rotate(45 35 16)"><svg width="90" height="30" viewBox={`0 0 ${state.recipe.widthMm} ${state.recipe.heightMm}`} dangerouslySetInnerHTML={{__html:piece.svg.replace(/^.*?<desc>.*?<\/desc>/," ").replace(/<\/svg>$/,"")}}/></g><g transform="translate(352 132) rotate(-45 35 16)"><svg width="90" height="30" viewBox={`0 0 ${state.recipe.widthMm} ${state.recipe.heightMm}`} dangerouslySetInnerHTML={{__html:piece.svg.replace(/^.*?<desc>.*?<\/desc>/," ").replace(/<\/svg>$/,"")}}/></g></>:<g transform={state.placement==="collar"?"translate(194 36)":"translate(181 164)"}><svg width={state.placement==="collar"?112:138} height={state.placement==="collar"?30:177} viewBox={`0 0 ${state.recipe.widthMm} ${state.recipe.heightMm}`} dangerouslySetInnerHTML={{__html:piece.svg.replace(/^.*?<desc>.*?<\/desc>/," ").replace(/<\/svg>$/,"")}}/></g>}
            </g><path d="M200 20 Q250 65 300 20 M250 50 V485 M160 160V535 M340 160V535" fill="none" stroke="#857660" strokeOpacity=".45" strokeWidth="1.5"/>
          </svg>}
        </div>
        <div className="artworkDimensions"><strong>{state.recipe.widthMm} × {state.recipe.heightMm} mm</strong><span>Artwork dimensions · product view is illustrative</span></div>
        <div className="authorReview"><h2>Your composition</h2><dl><dt>Family</dt><dd>{family.name}</dd><dt>Placement</dt><dd>{state.placement}</dd><dt>Colourway</dt><dd>{AUTHOR_COLORWAYS[state.recipe.colorway].name}</dd><dt>Source</dt><dd>Oleksandr’s original drawings</dd></dl><p>Original geometric interpretations. Embroidery digitisation and a physical sew-out are required before production.</p><div className="reviewActions"><button className="primaryButton" onClick={save}>Save composition</button><button className="quietButton" onClick={()=>download(piece.id+".svg",piece.svg,"image/svg+xml")}>Download SVG</button><button className="quietButton" onClick={exportSpec}>Download specification</button></div><p role="status" aria-live="polite">{notice}</p><details><summary>Original sources & design record</summary>{piece.sources.map(p=><a key={p} href={sourceURL(p)} target="_blank" rel="noreferrer">{p.split("/").at(-1)}</a>)}<code>{piece.id}</code><p>Dimensions and colours are saved with the exact SVG. No museum motif is used in these family shapes.</p></details></div>
      </section>
    </div>
    <footer className="ornamentFooter">ASCEND author geometry · Composition approach informed by <a href="https://vytvory.ua/uk/about" target="_blank" rel="noreferrer">Vytvory</a></footer>
  </main>;
}
