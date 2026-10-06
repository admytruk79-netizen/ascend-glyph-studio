/**
 * Reconnaissance for candidate sources before writing an adapter: prints
 * status, content type and the start of each response (robots.txt, sitemaps,
 * API samples, terms pages). Nothing is stored or crawled.
 */
import { USER_AGENT } from "./sources.ts";

const URLS = [
  "https://krovets.ua/robots.txt",
  "https://krovets.ua/sitemap.xml",
  "https://krovets.ua/en",
  "https://kyiv.ua.museum-digital.org/json/objects?s=" + encodeURIComponent("вишивка"),
  "https://ua.museum-digital.org/",
  "https://honchar.org.ua/robots.txt",
  "https://honchar.org.ua/en/collections/search",
  "https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true&q=embroidery",
  "https://collectionapi.metmuseum.org/public/collection/v1/objects/45734",
  "https://commons.wikimedia.org/w/api.php?action=query&format=json&list=categorymembers&cmtitle=Category:Embroidery_of_Ukraine&cmlimit=20&cmtype=subcat",
];

for (const url of URLS) {
  try {
    const r = await fetch(url, { headers: { "user-agent": USER_AGENT }, redirect: "follow", signal: AbortSignal.timeout(30_000) });
    const text = (await r.text()).replace(/\s+/g, " ");
    console.log(`PROBE ${r.status} ${r.headers.get("content-type") ?? "-"} ${url}\n  final: ${r.url}\n  ${text.slice(0, 1500)}\n`);
  } catch (e) {
    console.log(`PROBE ERROR ${url} ${(e as Error).message} ${String((e as any).cause?.code ?? "")}\n`);
  }
}
