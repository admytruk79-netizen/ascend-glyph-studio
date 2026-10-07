/**
 * Daily design queue: files new synthesis runs for the Tesseract worker so designs keep coming without anyone
 * asking, then wakes the worker (a free Render service sleeps when idle).
 *
 *   DATABASE_URL=... WORKER_URL=https://ascend-tesseract-worker.onrender.com npx tsx scripts/queue-daily-designs.mts
 *
 * Each day: three runs, concept groups rotating through the knowledge base (knowledge_concept), placements
 * rotating through the shirt (cuff, collar, band/hem, sleeve). Nothing is queued while earlier runs are still
 * waiting, so a stalled worker never builds up a backlog. Env: DESIGNS_PER_DAY (default 3).
 */
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL required");
const perDay = Number(process.env.DESIGNS_PER_DAY ?? 3);
const db = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, max: 2 });
db.on("error", () => {});

const pending = Number((await db.query(`select count(*) from synthesis_run where status in ('created','queued','running')`)).rows[0].count);
if (pending > 0) {
  console.log(JSON.stringify({ queued: 0, reason: `${pending} run(s) still waiting` }));
} else {
  const concepts: string[] = (await db.query(`select id from knowledge_concept order by id`)).rows.map((r: any) => r.id);
  const day = Math.floor(Date.now() / 86_400_000);
  const modes = ["cuff", "collar", "band", "sleeve"] as const;
  const rows = [];
  for (let k = 0; k < perDay; k++) {
    const n = day * perDay + k;
    // a group of four concepts, stepping through the list so every concept appears over the days
    const group = [0, 7, 13, 19].map((o) => concepts[(n * 3 + o) % concepts.length]!);
    const intent = {
      mode: modes[n % modes.length], placement: `${modes[n % modes.length]}-wrap`, materialId: "linen-woven", complexity: 0.72,
      concepts: group.map((id, i) => ({ id, weight: +(1 - i * 0.12).toFixed(2) })),
      heritage: ["ascend-core", "ukrainian-ornament"],
      constraints: { avoid: ["generic-mystical-symmetry", "diamond-saturation", "everything-flower", "fake-tribal"], preserve: ["void", "branch", "torus", "axis"] },
      origin: "daily-queue",
    };
    rows.push({ seed: `daily-${new Date().toISOString().slice(0, 10)}-${k + 1}`, intent });
  }
  for (const r of rows) await db.query(`insert into synthesis_run(id, seed, ontology_version_id, solver_version, intent, status) values (gen_random_uuid(), $1, 'ascend-heritage-0.1', '3.0.0-corpus-visual', $2::jsonb, 'queued')`, [r.seed, JSON.stringify(r.intent)]);
  console.log(JSON.stringify({ queued: rows.length, runs: rows.map((r) => ({ seed: r.seed, mode: r.intent.mode, concepts: r.intent.concepts.map((c) => c.id) })) }));
}
// (the pool stays open: it is reused below to watch the queue)

// wake the worker: a request to its URL starts a sleeping free instance; it then polls the queue itself
const worker = process.env.WORKER_URL;
if (worker) {
  for (let i = 0; i < 6; i++) {
    try { const res = await fetch(worker, { signal: AbortSignal.timeout(60_000) }); console.log(JSON.stringify({ wake: res.status })); if (res.ok) break; } catch (e) { console.log(JSON.stringify({ wakeRetry: String((e as Error).message).slice(0, 80) })); }
    await new Promise((r) => setTimeout(r, 20_000));
  }
}

// keep it awake until the queue is empty: a free instance sleeps 15 minutes after its last request, even mid-run
if (worker) {
  const until = Date.now() + Number(process.env.WAKE_MAX_MINUTES ?? 100) * 60_000;
  for (;;) {
    const left = Number((await db.query(`select count(*) from synthesis_run where status in ('created','queued','running')`)).rows[0].count);
    if (!left || Date.now() > until) { console.log(JSON.stringify({ queueEmpty: !left })); break; }
    await fetch(worker, { signal: AbortSignal.timeout(60_000) }).catch(() => {});
    await new Promise((r) => setTimeout(r, 240_000));
  }
}
const summary = (await db.query(`select disposition, count(*) n from synthesis_candidate where run_id in (select id from synthesis_run where created_at > now() - interval '1 day') group by 1`)).rows;
console.log("DESIGNS " + JSON.stringify(summary));
await db.end();
