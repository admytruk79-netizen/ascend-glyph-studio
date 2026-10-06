/**
 * Reconnaissance for candidate sources before writing an adapter: prints
 * status, content type and the start of each response (robots.txt, sitemaps,
 * API samples, terms pages). Nothing is stored or crawled.
 */
import { USER_AGENT } from "./sources.ts";

const URLS = [
  "https://krovets.ua/en/terms-of-use",
  "https://kyiv.ua.museum-digital.org/json/object/12655",
  "https://kyiv.ua.museum-digital.org/json/objects?s=" + encodeURIComponent("вишивка") + "&startwert=24",
  "https://collectionapi.metmuseum.org/public/collection/v1.1/search?hasImages=true&q=embroidery&offset=0&limit=5",
  "https://krovets.ua/sitemap.xml",
  "https://kyiv.ua.museum-digital.org/json/objects?s=" + encodeURIComponent("вишивка"),
  "https://ua.museum-digital.org/",
  "https://honchar.org.ua/robots.txt",
  "https://honchar.org.ua/en/collections/search",
  "https://commons.wikimedia.org/w/api.php?action=query&format=json&list=categorymembers&cmtitle=Category:Ukrainian_embroidery_by_region&cmlimit=50&cmtype=subcat",
];

for (const url of URLS) {
  try {
    const r = await fetch(url, { headers: { "user-agent": USER_AGENT }, redirect: "follow", signal: AbortSignal.timeout(30_000) });
    let text = (await r.text()).replace(/\s+/g, " ");
    const html = (r.headers.get("content-type") ?? "").includes("html");
    // For HTML pages print readable text (terms, descriptions) rather than markup.
    if (html) text = text.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    const limit = url.includes("terms-of-use") ? 6000 : url.includes("sitemap") ? 4000 : 1500;
    console.log(`PROBE ${r.status} ${r.headers.get("content-type") ?? "-"} ${url}\n  final: ${r.url}\n  ${text.slice(0, limit)}\n`);
  } catch (e) {
    console.log(`PROBE ERROR ${url} ${(e as Error).message} ${String((e as any).cause?.code ?? "")}\n`);
  }
}
