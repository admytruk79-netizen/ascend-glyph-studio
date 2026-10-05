import {tesseractRoute} from "./tesseract-api";
interface Env {
 GLYPH_ASSETS: R2Bucket;
 DATABASE_URL?: string;
 NEON_AI_GATEWAY_TOKEN?: string;
 NEON_AI_GATEWAY_BASE_URL?: string;
 AI_MODEL?: string;
}

const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{"cache-control":"no-store"}});
const deprecated=()=>json({error:"deprecated-architecture",message:"The immutable five-atlas glyph registry is retired. ASCEND Glyph Studio is research-driven: ROOTS → MEANING → GRAMMAR → FORM."},410);

async function aiRoute(request:Request,url:URL,env:Env):Promise<Response|null>{
 if(!url.pathname.startsWith("/api/ai/")) return null;
 const configured=Boolean(env.NEON_AI_GATEWAY_TOKEN&&env.NEON_AI_GATEWAY_BASE_URL);
 if(url.pathname==="/api/ai/status"){
  return json({configured,provider:"neon-ai-gateway",model:env.AI_MODEL||"gpt-5-6-sol"});
 }
 if(url.pathname!=="/api/ai/chat") return json({error:"not-found"},404);
 if(request.method!=="POST") return json({error:"method-not-allowed"},405);
 if(!configured) return json({error:"ai-gateway-unavailable",message:"Configure NEON_AI_GATEWAY_TOKEN and NEON_AI_GATEWAY_BASE_URL on the Worker."},503);
 let body:{message?:unknown;messages?:unknown;model?:unknown};
 try{body=await request.json()}catch{return json({error:"invalid-json"},400)}
 const messages=Array.isArray(body.messages)
  ? body.messages
  : typeof body.message==="string"
   ? [{role:"user",content:body.message}]
   : null;
 if(!messages||messages.length===0) return json({error:"messages-required"},400);
 if(messages.length>32) return json({error:"too-many-messages"},400);
 const normalized=messages.map((m:unknown)=>{
  if(!m||typeof m!=="object") return null;
  const v=m as {role?:unknown;content?:unknown};
  if(!["system","user","assistant"].includes(String(v.role))||typeof v.content!=="string"||v.content.length>20000) return null;
  return {role:String(v.role),content:v.content};
 });
 if(normalized.some(m=>!m)) return json({error:"invalid-message"},400);
 const model=typeof body.model==="string"&&body.model.length<100?body.model:(env.AI_MODEL||"gpt-5-6-sol");
 const base=env.NEON_AI_GATEWAY_BASE_URL!.replace(/\/$/,"");
 const upstream=await fetch(`${base}/v1/chat/completions`,{
  method:"POST",
  headers:{authorization:`Bearer ${env.NEON_AI_GATEWAY_TOKEN}`,"content-type":"application/json"},
  body:JSON.stringify({model,messages:normalized,temperature:0.2})
 });
 const raw=await upstream.text();
 if(!upstream.ok) return json({error:"ai-gateway-error",status:upstream.status,detail:raw.slice(0,1000)},502);
 let data:any; try{data=JSON.parse(raw)}catch{return json({error:"invalid-ai-response"},502)}
 return json({model:data.model||model,message:data.choices?.[0]?.message?.content||"",usage:data.usage||null});
}

export default {
 async fetch(request:Request,env:Env):Promise<Response>{
  const url=new URL(request.url);
  if(url.pathname==="/api/health") return json({ok:true,service:"ascend-glyph-studio",build:"0.6",architecture:"research-driven",pipeline:"ROOTS→MEANING→GRAMMAR→FORM",firstProduct:"diary",ai:"neon-ai-gateway"});
  if(url.pathname==="/api/research/status") return json({connected:Boolean(env.DATABASE_URL),mode:env.DATABASE_URL?"database":"unavailable",generationEnabled:Boolean(env.DATABASE_URL),policy:"fail-closed-no-synthetic-evidence"});
  const ai=await aiRoute(request,url,env); if(ai)return ai;
  if(url.pathname==="/api/glyphs"||url.pathname.startsWith("/api/glyphs/")) return deprecated();
  const tesseract=await tesseractRoute(request,url,env); if(tesseract)return tesseract;
  if(url.pathname.startsWith("/assets/")){const key=url.pathname.slice(8),obj=await env.GLYPH_ASSETS.get(key);if(!obj)return new Response("Not found",{status:404});return new Response(obj.body,{headers:{"etag":obj.httpEtag,"content-type":obj.httpMetadata?.contentType||"application/octet-stream","cache-control":"public,max-age=31536000,immutable"}})}
  return new Response(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ASCEND Glyph Studio</title><style>body{font-family:system-ui;background:#f5f2ea;color:#181713;margin:0;display:grid;place-items:center;min-height:100vh}main{max-width:760px;padding:32px}small{opacity:.55}</style></head><body><main><small>BUILD 0.6 · RESEARCH ENGINE + NEON AI</small><h1>ASCEND Glyph Studio</h1><p>ROOTS → MEANING → GRAMMAR → FORM</p><p>Evidence-driven synthesis · deterministic geometry · provenance · cultural review · production validation.</p></main></body></html>`,{headers:{"content-type":"text/html;charset=UTF-8"}});
 }
};