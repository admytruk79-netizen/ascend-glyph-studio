/**
 * Order → production files. The order page sends Stripe a code (the checkout's client_reference_id):
 *
 *   <design-id>_<size>[_<message hex>]      e.g. 01-ascend-roots_M_1b0a0f00...
 *
 * where the message is each character's index in the reader alphabet (UA6), two hex digits each.
 *
 *   npx tsx scripts/orders/production-pack.mts <order-code> [out-dir=orders/<code>]
 *
 * Writes the band's machine file and stitch preview, and, when there is a message, the hidden-message band
 * (verified by reading it back from its own stitch preview), plus order.json and a short work sheet.
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { UA6 } from "../../packages/glyph-codec/src/ornament-message.ts";

const code = process.argv[2];
if (!code) { console.error("usage: production-pack.mts <order-code> [out-dir]"); process.exit(1); }
const [design, size, hex = ""] = code.split("_");
const bands = JSON.parse(readFileSync("originals/designs/rich-bands/bands-board.json", "utf8")) as { id: string; name: string; stitches: number; minutes: number; colors: number }[];
const band = bands.find((b) => b.id === design);
if (!band) throw new Error(`unknown design ${design}`);
if (!["XS", "S", "M", "L", "XL", "XXL"].includes(size ?? "")) throw new Error(`unknown size ${size}`);
if (hex.length % 2 || /[^0-9a-f]/.test(hex)) throw new Error("bad message code");
const message = (hex.match(/../g) ?? []).map((h) => { const c = UA6[parseInt(h, 16)]; if (c === undefined) throw new Error("bad message code"); return c; }).join("");

const out = process.argv[3] ?? join("orders", code.slice(0, 60));
mkdirSync(out, { recursive: true });
for (const f of [`${design}.dst`, `${design}-stitches.svg`, `${design}-board.svg`]) copyFileSync(join("originals/designs/rich-bands", f), join(out, f));

let msg: { verified: boolean; sizeMm: number[]; stitches: number; minutes: number; repeats: number } | null = null;
if (message) {
  const dir = join(out, "hidden-message"); mkdirSync(dir, { recursive: true });
  try { msg = JSON.parse(execFileSync("npx", ["tsx", "scripts/originals/ornament-message-band.mts", dir, message, "340"], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] })); }
  catch { throw new Error(`hidden-message band for «${message}» did not verify: do not sew it, contact the customer`); }
}

const order = { code, design: band.id, designName: band.name, size, message: message || null, files: { band: `${design}.dst`, message: msg ? "hidden-message/band.dst" : null }, band: { stitches: band.stitches, minutes: band.minutes, colors: band.colors }, hiddenMessage: msg };
writeFileSync(join(out, "order.json"), JSON.stringify(order, null, 2));
writeFileSync(join(out, "WORK-SHEET.md"), `# Order ${code}

- **Shirt:** ASCEND linen, size **${size}**, pre-washed linen, medium cut-away stabiliser, 40 wt thread, 75/11 sharp needle.
- **Band «${band.name}»:** \`${design}.dst\`, 250 × 60 mm, ${band.stitches.toLocaleString("en")} stitches, about ${Math.round(band.minutes)} min, ${band.colors} colours. Cuff or yoke; the band repeats a whole number of times, so the seam falls on a unit boundary.
${msg ? `- **Hidden message «${message}»:** \`hidden-message/band.dst\`, ${msg.sizeMm.join(" × ")} mm, ${msg.stitches.toLocaleString("en")} stitches, about ${Math.round(msg.minutes)} min. Hem, border frame 360 × 100. Read it back with the phone reader before shipping.` : "- **Hidden message:** none."}
`);
console.log(JSON.stringify(order, null, 1));
