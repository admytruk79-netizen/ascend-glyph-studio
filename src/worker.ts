interface Env { GLYPH_ASSETS: R2Bucket }

const families={earth:9,water:5,fire:6,air:6,spirit:6} as const;

export default {
 async fetch(request:Request,env:Env):Promise<Response>{
  const url=new URL(request.url);
  if(url.pathname==="/api/health") return Response.json({ok:true,service:"ascend-glyph-studio",build:"0.2",storage:"r2"});
  if(url.pathname==="/api/glyphs") return Response.json({count:32,families,geometry:"immutable"});
  if(url.pathname.startsWith("/assets/")){
   const key=url.pathname.slice(8),obj=await env.GLYPH_ASSETS.get(key);
   if(!obj)return new Response("Not found",{status:404});
   return new Response(obj.body,{headers:{"etag":obj.httpEtag,"content-type":obj.httpMetadata?.contentType||"application/octet-stream","cache-control":"public,max-age=31536000,immutable"}});
  }
  return new Response(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ASCEND Glyph Studio</title><style>body{font-family:system-ui;background:#f5f2ea;color:#181713;margin:0;display:grid;place-items:center;min-height:100vh}main{max-width:720px;padding:32px}small{opacity:.55}</style></head><body><main><small>BUILD 0.2</small><h1>ASCEND Glyph Studio</h1><p>Five atlases. One living glyph language.</p><p>32 immutable source glyph records · Cloudflare Worker · R2 asset route ready.</p></main></body></html>`,{headers:{"content-type":"text/html;charset=UTF-8"}});
 }
};
