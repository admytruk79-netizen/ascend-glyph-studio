/**
 * Builds the offline ornament reader: apps/web/public/reader/index.html (one self-contained page, no network)
 * and apps/web/public/reader/sw.js (caches the page so it opens offline after the first visit).
 *
 *   npx tsx scripts/build-ornament-reader.mts
 *
 * The page bundles the same reader the tests exercise (packages/glyph-codec/src/ornament-message.ts).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { build } from "esbuild";

const js = (await build({ entryPoints: ["packages/glyph-codec/src/reader-page.ts"], bundle: true, minify: true, format: "iife", platform: "browser", target: "es2020", write: false })).outputFiles[0]!.text;
if (/\bfetch\(|XMLHttpRequest|WebSocket/.test(js)) throw new Error("reader bundle must not use the network");

const html = `<!doctype html>
<html lang="uk"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#13131e"><title>ASCEND · читач орнаменту</title>
<style>
:root{--ground:#13131e;--ink:#efe9dc;--accent:#cc662b;--muted:#a393c5}
*{box-sizing:border-box}html,body{margin:0;height:100%;background:var(--ground);color:var(--ink);font:16px/1.4 system-ui,sans-serif}
main{display:flex;flex-direction:column;height:100%;padding:12px 16px env(safe-area-inset-bottom)}
h1{font-size:15px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;margin:4px 0 10px;color:var(--muted)}
.view{position:relative;flex:1;min-height:200px;border-radius:12px;overflow:hidden;background:#000}
video{width:100%;height:100%;object-fit:cover}
.guide{position:absolute;left:4%;right:4%;top:50%;transform:translateY(-50%);height:min(30%,16vw);border:2px solid var(--accent);border-radius:6px;box-shadow:0 0 0 999px rgba(0,0,0,.35)}
#hint{margin:10px 0 4px;color:var(--muted);font-size:14px}#status{font-size:12px;color:var(--muted);opacity:.8}
#message{font-size:28px;line-height:1.25;margin:12px 0;min-height:1.25em;color:var(--ink)}
.found #message{color:#fff}.found .guide{border-color:#4f6b3a}
.row{display:flex;gap:10px;margin:8px 0 6px}
label.btn,button{flex:1;display:inline-flex;align-items:center;justify-content:center;padding:12px;border-radius:10px;border:1px solid var(--muted);background:transparent;color:var(--ink);font:inherit}
label.btn{background:var(--accent);border-color:var(--accent);color:#13131e;font-weight:600}input[type=file]{display:none}
</style></head>
<body><main>
<h1>ASCEND · читач орнаменту</h1>
<div class="view"><video id="video" playsinline muted></video><div class="guide"></div></div>
<div id="message" aria-live="polite"></div>
<div id="hint">Opening the camera…</div><div id="status"></div>
<div class="row"><label class="btn">Take a photo<input id="photo" type="file" accept="image/*" capture="environment"></label><button id="again" type="button">Read again</button></div>
</main>
<script>${js.replace(/<\/script/gi, "<\\/script")}</script>
</body></html>
`;

const sw = `// Caches the ornament reader so it opens with no connection after the first visit.
const C = "ascend-reader-v1";
self.addEventListener("install", (e) => e.waitUntil(caches.open(C).then((c) => c.addAll(["./", "./index.html"])).then(() => self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => { if (new URL(e.request.url).pathname.includes("/reader/")) e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request))); });
`;

mkdirSync("apps/web/public/reader", { recursive: true });
writeFileSync("apps/web/public/reader/index.html", html);
writeFileSync("apps/web/public/reader/sw.js", sw);
console.log(JSON.stringify({ html: html.length, js: js.length }));
