import React,{useEffect,useMemo,useState} from "react";

const WORKER="https://ascend-tesseract-worker.onrender.com";
const DEFAULT_RUN="8150f384-229e-4a67-ace2-5aae59aacaf4";

type Candidate={
 ordinal:number;score:number;disposition:string;pattern_id?:string;lineage_id?:string;
 feedback_pass:number;raster?:{quality?:number;coverage?:number;clutter?:number;flags?:string[]};
 final_critique?:{score?:number;quality?:number;originality?:number;genericRisk?:number;derivativeRisk?:number;flags?:string[]};
 svgUrl:string;
};
type Review={run:{id:string;solver_version:string;status:string;seed:string;intent:any};candidates:Candidate[]};

export function RunReview(){
 const [runId,setRunId]=useState(DEFAULT_RUN),[data,setData]=useState<Review|null>(null),[error,setError]=useState("");
 const load=(id=runId)=>{setError("");setData(null);fetch(WORKER+"/runs/"+encodeURIComponent(id),{cache:"no-store"}).then(r=>{if(!r.ok)throw new Error(String(r.status));return r.json()}).then(setData).catch(e=>setError(String(e.message||e)))};
 useEffect(()=>{load(DEFAULT_RUN)},[]);
 const stats=useMemo(()=>{const xs=data?.candidates??[],ok=xs.filter(x=>x.disposition==="candidate");return{total:xs.length,ok:ok.length,quality:ok.length?ok.reduce((s,x)=>s+Number(x.raster?.quality||0),0)/ok.length:0,clutter:ok.length?ok.reduce((s,x)=>s+Number(x.raster?.clutter||0),0)/ok.length:0}},[data]);
 return <section className="runReview">
  <div className="runReviewHead">
   <div><div className="eyebrow">TESSERACT RUN REVIEW</div><h2>Exact persisted candidates</h2><p>Inspect the persisted SVGs and automated visual results. Visual acceptance does not certify embroidery or approve production.</p></div>
   <div className="runStats"><strong>{stats.ok}/{stats.total}</strong><span>visually accepted</span><strong>{stats.quality.toFixed(3)}</strong><span>avg raster</span><strong>{stats.clutter.toFixed(3)}</strong><span>avg clutter</span></div>
  </div>
  <div className="runLookup"><input value={runId} onChange={e=>setRunId(e.target.value)} aria-label="Synthesis run ID"/><button onClick={()=>load()}>Load run</button></div>
  {error&&<p className="canonError">Run unavailable: {error}</p>}
  {data&&<><div className="runSummary"><strong>{data.run.solver_version}</strong><span>{data.run.status}</span><span>{data.run.seed}</span></div>
  <div className="runGrid">{data.candidates.map(c=><article className={"runCard "+(c.disposition==="candidate"?"accepted":"rejected")} key={c.ordinal}>
   <div className="runSvg"><img src={WORKER+c.svgUrl} alt={"Tesseract candidate "+(c.ordinal+1)} loading="lazy"/></div>
   <div className="runMeta"><div><strong>#{c.ordinal+1}</strong><span>{c.disposition==="candidate"?"Visually accepted":c.disposition}</span></div>
    <dl><dt>Raster quality</dt><dd>{Number(c.raster?.quality||0).toFixed(3)}</dd><dt>Clutter</dt><dd>{Number(c.raster?.clutter||0).toFixed(3)}</dd><dt>Coverage</dt><dd>{Number(c.raster?.coverage||0).toFixed(3)}</dd><dt>Final score</dt><dd>{Number(c.final_critique?.score||0).toFixed(2)}</dd><dt>Originality</dt><dd>{Number(c.final_critique?.originality||0).toFixed(3)}</dd><dt>Feedback pass</dt><dd>{c.feedback_pass}</dd></dl>
    {!!c.raster?.flags?.length&&<p>{c.raster.flags.join(" · ")}</p>}{!!c.final_critique?.flags?.length&&<p>{c.final_critique.flags.join(" · ")}</p>}
   </div>
  </article>)}</div></>}
 </section>;
}

