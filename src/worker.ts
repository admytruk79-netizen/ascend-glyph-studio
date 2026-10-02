export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/health") {
      return Response.json({ ok: true, service: "ascend-glyph-studio", build: "0.1" });
    }
    return new Response(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ASCEND Glyph Studio</title></head><body><main><h1>ASCEND Glyph Studio</h1><p>Constructor infrastructure is live.</p></main></body></html>`,{headers:{"content-type":"text/html;charset=UTF-8"}});
  }
};
