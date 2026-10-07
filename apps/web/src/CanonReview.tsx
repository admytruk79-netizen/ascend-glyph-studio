import React,{useEffect,useState} from "react";

type Evidence={id:string;source_key:string;title?:string|null;creator?:string|null;date_label?:string|null;tradition?:string|null;region?:string|null;material?:string|null;technique?:string|null;image_url?:string|null;source_url?:string|null;rights?:string|null;cultural_access?:string|null;reliability?:number|null};
type CanonRow={
 id:string;support:number;status:string;review_state:string;nearest_reference_distance:number|string;
 traditions:unknown[];sources:unknown[];reviewer_note?:string|null;reviewed_at?:string|null;evidence?:Evidence[];
};

const WORKER="https://ascend-tesseract-worker.onrender.com";

export function CanonReview(){
 const [rows,setRows]=useState<CanonRow[]>([]);
 const [error,setError]=useState("");
 useEffect(()=>{fetch(WORKER+"/canon",{cache:"no-store"}).then(r=>{if(!r.ok)throw new Error(String(r.status));return r.json()}).then(setRows).catch(e=>setError(String(e.message||e)))},[]);
 return <section className="canonReview">
  <div className="canonReviewHead">
   <div><div className="eyebrow">CORPUS CANON</div><h2>Human review</h2><p>Corpus-discovered canonical form proposals. Approval is controlled; this view is read-only.</p></div>
   <div className="canonStats"><strong>{rows.length}</strong><span>proposals</span><strong>{rows.filter(x=>x.review_state==="approved").length}</strong><span>approved</span></div>
  </div>
  {error&&<p className="canonError">Canon feed unavailable: {error}</p>}
  <div className="canonGrid">
   {rows.map(r=><article className={"canonCard "+r.review_state} key={r.id}>
    <div className="canonSvg"><img src={WORKER+"/canon/"+encodeURIComponent(r.id)+".svg"} alt={r.id}/></div>
    <div className="canonMeta">
     <strong>{r.id}</strong><span className="canonState">{r.review_state}</span>
     <dl><dt>Support</dt><dd>{r.support.toLocaleString()}</dd><dt>Traditions</dt><dd>{Array.isArray(r.traditions)?r.traditions.length:0}</dd><dt>Sources</dt><dd>{Array.isArray(r.sources)?r.sources.length:0}</dd><dt>Nearest ref.</dt><dd>{Number(r.nearest_reference_distance).toFixed(3)}</dd></dl>
     {r.reviewer_note&&<p>{r.reviewer_note}</p>}
     {!!r.evidence?.length&&<div className="canonEvidence">
      {r.evidence.slice(0,6).map(e=><figure key={e.id}>
       {e.image_url?<img src={e.image_url} alt={e.title||e.tradition||"Corpus evidence"} loading="lazy"/>:<div className="evidenceBlank"/>}
       <figcaption><strong>{e.tradition||"Unknown tradition"}</strong><span>{[e.region,e.material,e.technique].filter(Boolean).join(" · ")||e.source_key}</span><small>{e.title||e.date_label||e.source_key}</small></figcaption>
      </figure>)}
     </div>}
    </div>
   </article>)}
  </div>
 </section>;
}
