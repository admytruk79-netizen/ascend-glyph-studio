export type RunRequest={concepts:{id:string;weight:number}[];traditions?:{id:string;weight:number}[];materialId?:string;zoneId?:string;seed?:string};
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{"cache-control":"no-store"}});
export function validateRunRequest(x:any):RunRequest{
 if(!x||!Array.isArray(x.concepts)||x.concepts.length===0)throw new Error("concepts-required");
 const concepts=x.concepts.slice(0,12).map((c:any)=>({id:String(c.id||"").trim().toLowerCase(),weight:Math.max(0,Math.min(1,Number(c.weight??1)))})).filter((c:any)=>c.id);
 if(!concepts.length)throw new Error("concepts-required");
 return {concepts,traditions:Array.isArray(x.traditions)?x.traditions.slice(0,8):undefined,materialId:x.materialId?String(x.materialId):undefined,zoneId:x.zoneId?String(x.zoneId):undefined,seed:x.seed?String(x.seed):undefined};
}
async function sql(databaseUrl:string,query:string,params:unknown[]=[]){
 const endpoint=databaseUrl.replace(/^postgres(?:ql)?:\/\/[^@]+@([^/]+)\/.+$/,"https://$1/sql");
 const auth=databaseUrl.match(/^postgres(?:ql)?:\/\/([^:]+):([^@]+)@/);
 if(!auth)throw new Error("invalid-database-url");
 const response=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/json","neon-connection-string":databaseUrl},body:JSON.stringify({query,params})});
 if(!response.ok)throw new Error("database-request-failed:"+response.status);
 return response.json() as Promise<any>;
}
async function queueRun(databaseUrl:string,intent:RunRequest,seed:string){
 const q=`insert into synthesis_run(id,seed,ontology_version_id,solver_version,intent,status)
 select gen_random_uuid(),$1,id,'2.1.0-rich-runtime',$2::jsonb,'queued'
 from ontology_version order by created_at desc limit 1
 returning id,seed,status,created_at`;
 const result=await sql(databaseUrl,q,[seed,JSON.stringify(intent)]);
 const row=result?.rows?.[0]??result?.[0];
 if(!row)throw new Error("ontology-version-missing");
 return row;
}
export async function tesseractRoute(request:Request,url:URL,env:any):Promise<Response|null>{
 if(url.pathname==="/api/tesseract/status"&&request.method==="GET")
  return json({ok:true,engine:"tesseract-v2",solver:"2.1.0-rich-runtime",mode:env.DATABASE_URL?"database-worker":"runtime-not-bound"});
 if(url.pathname==="/api/tesseract/run"&&request.method==="POST"){
  if(!env.DATABASE_URL)return json({error:"database-runtime-not-bound",next:"Bind DATABASE_URL secret to enable durable run execution."},503);
  try{
   const intent=validateRunRequest(await request.json()),seed=intent.seed??crypto.randomUUID();
   const run=await queueRun(env.DATABASE_URL,intent,seed);
   return json({accepted:true,runId:run.id,seed:run.seed,status:run.status,createdAt:run.created_at},202);
  }catch(e){return json({error:e instanceof Error?e.message:"invalid-request"},400)}
 }
 return null;
}
