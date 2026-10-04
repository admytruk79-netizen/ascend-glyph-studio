import {tesseractRoute} from "./tesseract-api";
interface Env { GLYPH_ASSETS: R2Bucket; DATABASE_URL?: string }

const families={earth:9,water:5,fire:6,air:6,spirit:6} as const;
const fireNames=["Rising Rays","Split Chevrons","Central Core","Expanding Lines","Ascending Path","Ignition Point"];

function registry(){
 return Object.entries(families).flatMap(([family,count])=>Array.from({length:count},(_,i)=>({
  id:`${family}-${String(i+1).padStart(2,"0")}`,
  family,sourceIndex:i+1,
  displayName:family==="fire"?fireNames[i]:null,
  immutable:true,sourceVersion:1,
  assetKey:`glyphs/${family}/${family}-${String(i+1).padStart(2,"0")}/v1.svg`
 })));
}

export default {
 async fetch(request:Request,env:Env):Promise<Response>{
  const url=new URL(request.url);
  if(url.pathname==="/api/health") return Response.json({ok:true,service:"ascend-glyph-studio",build:"0.4",storage:"r2",tesseract:"v2"});\n  const tesseract=await tesseractRoute(request,url,env); if(tesseract)return tesseract;
  if(url.pathname==="/api/glyphs") return Response.json({count:32,families,glyphs:registry()});
  if(url.pathname.startsWith("/api/glyphs/")){
   const id=url.pathname.split("/").pop()!,g=registry().find(x=>x.id===id);
   if(!g)return Response.json({error:"glyph-not-found"},{status:404});
   const obj=await env.GLYPH_ASSETS.get(g.assetKey);
   if(!obj)return Response.json({error:"asset-not-uploaded",glyph:g},{status:404});
   return new Response(obj.body,{headers:{"content-type":"image/svg+xml","etag":obj.httpEtag,"cache-control":"public,max-age=31536000,immutable"}});
  }
  if(url.pathname.startsWith("/assets/")){
   const key=url.pathname.slice(8),obj=await env.GLYPH_ASSETS.get(key);
   if(!obj)return new Response("Not found",{status:404});
   return new Response(obj.body,{headers:{"etag":obj.httpEtag,"content-type":obj.httpMetadata?.contentType||"application/octet-stream","cache-control":"public,max-age=31536000,immutable"}});
  }
  return new Response(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ASCEND Glyph Studio</title><style>body{font-family:system-ui;background:#f5f2ea;color:#181713;margin:0;display:grid;place-items:center;min-height:100vh}main{max-width:720px;padding:32px}small{opacity:.55}</style></head><body><main><small>BUILD 0.4</small><h1>ASCEND Glyph Studio</h1><p>Five atlases. One living glyph language.</p><p>32 immutable source records · R2 registry connected.</p></main></body></html>`,{headers:{"content-type":"text/html;charset=UTF-8"}});
 }
};
