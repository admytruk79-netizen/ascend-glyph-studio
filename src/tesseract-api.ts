export type RunRequest={concepts:{id:string;weight:number}[];traditions?:{id:string;weight:number}[];materialId?:string;zoneId?:string;seed?:string};
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{"cache-control":"no-store"}});
export function validateRunRequest(x:any):RunRequest{
 if(!x||!Array.isArray(x.concepts)||x.concepts.length===0)throw new Error("concepts-required");
 const concepts=x.concepts.slice(0,12).map((c:any)=>({id:String(c.id||"").trim().toLowerCase(),weight:Math.max(0,Math.min(1,Number(c.weight??1)))})).filter((c:any)=>c.id);
 if(!concepts.length)throw new Error("concepts-required");
 return {concepts,traditions:Array.isArray(x.traditions)?x.traditions.slice(0,8):undefined,materialId:x.materialId?String(x.materialId):undefined,zoneId:x.zoneId?String(x.zoneId):undefined,seed:x.seed?String(x.seed):undefined};
}
export async function tesseractRoute(request:Request,url:URL,env:any):Promise<Response|null>{
 if(url.pathname==="/api/tesseract/status"&&request.method==="GET")
  return json({ok:true,engine:"tesseract-v2",solver:"2.0.0-alpha.1",mode:env.DATABASE_URL?"database-worker":"runtime-not-bound"});
 if(url.pathname==="/api/tesseract/run"&&request.method==="POST"){
  if(!env.DATABASE_URL)return json({error:"database-runtime-not-bound",next:"Bind DATABASE_URL secret to enable durable run execution."},503);
  try{const intent=validateRunRequest(await request.json());return json({accepted:true,intent,seed:intent.seed??crypto.randomUUID(),note:"Runtime binding present; durable adapter can claim and execute this intent."},202)}
  catch(e){return json({error:e instanceof Error?e.message:"invalid-request"},400)}
 }
 return null;
}
