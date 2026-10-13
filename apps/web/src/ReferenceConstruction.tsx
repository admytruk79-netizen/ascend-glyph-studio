import React,{useMemo,useState} from 'react';
import {generateReferenceBand} from '../../../packages/tesseract-engine/src/reference-band-template';
export function ReferenceConstruction(){
 const [width,setWidth]=useState(250),[height,setHeight]=useState(60),[complexity,setComplexity]=useState(.7),[seed,setSeed]=useState('reference-001');
 const [placement,setPlacement]=useState<'band'|'collar'|'cuff'>('cuff');
 const result=useMemo(()=>{try{return {pattern:generateReferenceBand({widthMm:width,heightMm:height,complexity,seed,placement}),error:''};}
  catch(e){const code=e instanceof Error?e.message:'';return {pattern:null,error:code.includes('capacity')||code.includes('border-space')?'Increase the width or height to fit three separated bands.':'Enter a width of 80–600 mm, a height of 40–160 mm and a seed.'};}},[width,height,complexity,seed,placement]);
 const p=result.pattern;
 const download=()=>{if(!p)return;const url=URL.createObjectURL(new Blob([p.svg],{type:'image/svg+xml'})),a=document.createElement('a');a.href=url;a.download='ascend-reference-band.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 return <section className="workspace">
  <aside className="controls"><h2>Framed repeat band</h2><p className="hint">A central band of ASCEND glyphs with two smaller framing bands.</p>
   <label>Placement<select value={placement} onChange={e=>setPlacement(e.target.value as typeof placement)}><option value="cuff">Cuff</option><option value="collar">Collar</option><option value="band">Hem band</option></select></label>
   <label>Width (mm)<input type="number" min="80" max="600" value={Number.isFinite(width)?width:''} onChange={e=>setWidth(e.target.valueAsNumber)}/></label>
   <label>Height (mm)<input type="number" min="40" max="160" value={Number.isFinite(height)?height:''} onChange={e=>setHeight(e.target.valueAsNumber)}/></label>
   <label>Complexity<input type="range" min="0" max="1" step=".01" value={complexity} onChange={e=>setComplexity(+e.target.value)}/></label>
   <label>Seed<input value={seed} onChange={e=>setSeed(e.target.value)}/></label>
   <button className="generate wide" onClick={()=>setSeed(s=>s+'+')}>Generate another arrangement</button>
   <button className="generate wide" disabled={!p} onClick={download}>Download reference SVG</button>
  </aside>
  <section className="previewColumn"><h2>Construction preview</h2>
   {p?<><div className="referenceBandPreview" dangerouslySetInnerHTML={{__html:p.svg}}/><p>{p.widthMm} × {p.heightMm} mm · {p.columns} repeat cells per band</p></>:<p role="alert">{result.error}</p>}
   <p className="hint">Reference design. The SVG contains geometry, not a machine stitch file. Stitch count is unavailable until digitization; fabric, machine and sew-out checks are still required.</p>
  </section>
  <aside className="variants"><h2>Source and status</h2><p className="hint">Contemporary ASCEND composition using unchanged canonical glyphs. Framing and scale choices are informed by your Ukrainian reference study and the separately attributed Norwegian placket study.</p>
   <p className="hint">This is an authored template. Experimental learned models are not active here.</p>
   <a href="https://clevelandart.org/art/1924.629" target="_blank" rel="noreferrer">Norwegian source record</a>
  </aside>
 </section>;
}
