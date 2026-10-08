import pg from "pg";
const {Pool}=pg;
const url=process.env.DATABASE_URL;if(!url)throw new Error("DATABASE_URL required");
const pool=new Pool({connectionString:url,ssl:{rejectUnauthorized:false}});
const FEATURES=["svgQuality","originality","genericRisk","derivativeRisk","rasterQuality","rasterBalance","novelty","baseScore"] as const;
function vec(row:any){
 const s=row.state||{},f=s.finalCritique||{},r=s.raster||{},cx=row.complexity||{};
 return [
  Number(f.quality||0),Number(f.originality||0),Number(f.genericRisk||0),Number(f.derivativeRisk||0),
  Number(r.quality||0),Number(r.balance||0),Number(cx.novelty||0),Number(row.score||0)/100
 ];
}
const q=await pool.query(`
 select p.winner,
 l.id left_id,l.state left_state,l.complexity left_complexity,l.score left_score,
 r.id right_id,r.state right_state,r.complexity right_complexity,r.score right_score
 from design_preference p
 join synthesis_candidate l on l.id=p.left_candidate_id
 join synthesis_candidate r on r.id=p.right_candidate_id
 where p.winner in ('left','right')
 order by p.created_at
`);
if(q.rows.length<8){console.log(JSON.stringify({trained:false,pairs:q.rows.length,need:8}));await pool.end();process.exit(0)}
const data=q.rows.map((x:any)=>{
 const l=vec({state:x.left_state,complexity:x.left_complexity,score:x.left_score});
 const r=vec({state:x.right_state,complexity:x.right_complexity,score:x.right_score});
 const d=l.map((v:number,i:number)=>v-r[i]!);
 return {x:d,y:x.winner==="left"?1:0};
});
const mean=FEATURES.map((_,i)=>data.reduce((s,d)=>s+d.x[i]!,0)/data.length);
const sd=FEATURES.map((_,i)=>Math.sqrt(data.reduce((s,d)=>s+(d.x[i]!-mean[i]!)**2,0)/data.length)||1);
for(const d of data)d.x=d.x.map((v:number,i:number)=>(v-mean[i]!)/sd[i]!);
let w=new Array(FEATURES.length).fill(0),b=0;
const lr=.06,l2=.015;
for(let epoch=0;epoch<700;epoch++){
 let gw=new Array(w.length).fill(0),gb=0;
 for(const d of data){
  const z=w.reduce((s,v,i)=>s+v*d.x[i]!,b),p=1/(1+Math.exp(-Math.max(-20,Math.min(20,z)))),e=p-d.y;
  for(let i=0;i<w.length;i++)gw[i]+=e*d.x[i]!;gb+=e;
 }
 for(let i=0;i<w.length;i++)w[i]-=lr*(gw[i]/data.length+l2*w[i]);b-=lr*gb/data.length;
}
let correct=0,loss=0;
for(const d of data){const z=w.reduce((s,v,i)=>s+v*d.x[i]!,b),p=1/(1+Math.exp(-z));correct+=(p>=.5?1:0)===d.y?1:0;loss+=-(d.y*Math.log(p+1e-9)+(1-d.y)*Math.log(1-p+1e-9))}
const metrics={accuracy:+(correct/data.length).toFixed(3),logLoss:+(loss/data.length).toFixed(4),mean,sd};
await pool.query(`insert into preference_model(id,version,feature_order,weights,bias,pair_count,metrics,built_at)
 values('preference-latest',$1,$2,$3,$4,$5,$6::jsonb,now())
 on conflict(id) do update set version=excluded.version,feature_order=excluded.feature_order,weights=excluded.weights,bias=excluded.bias,pair_count=excluded.pair_count,metrics=excluded.metrics,built_at=now()`,
 ["pairwise-logistic/0.1",FEATURES,w,b,data.length,JSON.stringify(metrics)]);
console.log(JSON.stringify({trained:true,pairs:data.length,accuracy:metrics.accuracy,weights:Object.fromEntries(FEATURES.map((f,i)=>[f,+w[i]!.toFixed(3)]))}));
await pool.end();
