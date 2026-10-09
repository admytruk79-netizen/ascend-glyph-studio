import {tesseractRoute} from "./tesseract-api";
interface Env { GLYPH_ASSETS: R2Bucket; STUDIO_ASSETS: {fetch(request:Request):Promise<Response>}; DATABASE_URL?: string }

const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{"cache-control":"no-store"}});
const deprecated=()=>json({error:"deprecated-architecture",message:"The immutable five-atlas glyph registry is retired. ASCEND Glyph Studio is research-driven: ROOTS → MEANING → GRAMMAR → FORM."},410);

export default {
 async fetch(request:Request,env:Env):Promise<Response>{
  const url=new URL(request.url);
  if(url.pathname==="/api/health") return json({ok:true,service:"ascend-glyph-studio",build:"0.5",architecture:"research-driven",pipeline:"ROOTS→MEANING→GRAMMAR→FORM",firstProduct:"diary"});
  if(url.pathname==="/api/research/status") return json({connected:Boolean(env.DATABASE_URL),mode:env.DATABASE_URL?"database":"unavailable",generationEnabled:Boolean(env.DATABASE_URL),policy:"fail-closed-no-synthetic-evidence"});
  if(url.pathname==="/api/glyphs"||url.pathname.startsWith("/api/glyphs/")) return deprecated();
  const tesseract=await tesseractRoute(request,url,env); if(tesseract)return tesseract;
  if(url.pathname.startsWith("/assets/")){const studio=await env.STUDIO_ASSETS.fetch(request);if(studio.ok)return studio;const key=url.pathname.slice(8),obj=await env.GLYPH_ASSETS.get(key);if(!obj)return new Response("Not found",{status:404});return new Response(obj.body,{headers:{"etag":obj.httpEtag,"content-type":obj.httpMetadata?.contentType||"application/octet-stream","cache-control":"public,max-age=31536000,immutable"}})}
  if(url.pathname.startsWith("/api/"))return json({error:"not-found"},404);
  return env.STUDIO_ASSETS.fetch(request);
 }
};
