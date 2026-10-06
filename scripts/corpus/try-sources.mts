/**
 * Live check of adapters: pulls a small sample from each selected source (first query and one more),
 * runs the acceptance gates and prints counts and examples. Nothing is stored.
 * Env: TRY_SOURCES (comma list), TRY_LIMIT (candidates per query, default 40).
 */
import { ADAPTERS, USER_AGENT } from "./sources.ts";
import { gate } from "./gates.ts";

const want = (process.env.TRY_SOURCES ?? "loc,ia,finna,commons").split(",").map((s) => s.trim());
const limit = Number(process.env.TRY_LIMIT ?? 40);
const fetchJson = async (url: string, headers: Record<string, string> = {}) => {
  const r = await fetch(url, { headers: { "user-agent": USER_AGENT, accept: "application/json", ...headers }, signal: AbortSignal.timeout(45_000) });
  if (!r.ok) throw new Error(`${r.status} ${url.slice(0, 120)}`);
  return r.json();
};

for (const a of ADAPTERS.filter((x) => want.includes(x.source))) {
  const queries = (a.queries ?? []).filter((_, i, arr) => i === 0 || i === Math.floor(arr.length / 2) || arr[i]!.tradition !== arr[i - 1]?.tradition).slice(0, 5);
  for (const q of queries) {
    const counts: Record<string, number> = {};
    const examples: string[] = [];
    let n = 0;
    const t0 = Date.now();
    try {
      for await (const c of a.search(q, fetchJson)) {
        n++;
        const g = gate(c);
        const k = g.accepted ? "accepted" : `rejected:${(g as any).reason}`;
        counts[k] = (counts[k] ?? 0) + 1;
        if (examples.length < 3) examples.push(`${k} | ${c.title?.slice(0, 60)} | ${c.culture ?? "-"} | ${c.rights?.slice(0, 50)} | ${c.image?.slice(0, 90)}`);
        if (n >= limit) break;
      }
      console.log(`TRY ${a.source} "${q.q}" [${q.tradition}] n=${n} ${JSON.stringify(counts)} ${Date.now() - t0}ms\n  ${examples.join("\n  ")}`);
    } catch (e) {
      console.log(`TRY ${a.source} "${q.q}" ERROR ${(e as Error).message}`);
    }
  }
}
