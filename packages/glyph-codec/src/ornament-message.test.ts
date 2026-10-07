import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { decodeOrnamentScans, decodeText, encodeText, fromColumns, layoutOrnamentMessage, ornamentMessageSvg, readColumns, reverseScan, toColumns } from "./ornament-message.ts";

const MSG = "Сила роду — у нитці";

async function raster(svg: string, width = 2400, rotate = 0) {
  const { data, info } = await sharp(Buffer.from(svg), { density: 300 }).resize({ width }).rotate(rotate).flatten({ background: "#efe9dc" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

test("text → bytes → sprigs → bytes → text (6-bit Ukrainian alphabet keeps it short)", () => {
  const code = encodeText(MSG);
  assert.ok(code.length <= 1 + 15 + 8, `code ${code.length} bytes`);
  const cols = toColumns(code);
  const { bytes, erasures } = fromColumns(cols, code.length);
  assert.equal(erasures.length, 0);
  assert.equal(decodeText(bytes).text, MSG.toLowerCase());
  assert.equal(decodeText(fromColumns(toColumns(encodeText("ASCEND 2026")), encodeText("ASCEND 2026").length).bytes).text, "ASCEND 2026");
});

test("reads the message back from a rendered band", async () => {
  const band = layoutOrnamentMessage(MSG, { length: 1000 });
  assert.ok(band.repeats >= 1.5, `repeats ${band.repeats}`);
  const { data, w, h } = await raster(ornamentMessageSvg(band.objects, band.width, band.height), 6000);
  const cols = readColumns(data, w, h);
  assert.equal(cols.length, band.columns.length);
  const r = decodeOrnamentScans([cols]);
  assert.equal(r?.text, MSG.toLowerCase());
});

test("survives wear: a stretch of the band missing", async () => {
  const band = layoutOrnamentMessage(MSG, { length: 1000 });
  const svg = ornamentMessageSvg(band.objects, band.width, band.height).replace("</svg>", `<rect x="300" y="0" width="60" height="${band.height}" fill="#efe9dc"/></svg>`);
  const { data, w, h } = await raster(svg, 6000);
  assert.equal(decodeOrnamentScans([readColumns(data, w, h)])?.text, MSG.toLowerCase());
});

test("reads a photo taken upside down", async () => {
  const band = layoutOrnamentMessage(MSG, { length: 1000 });
  const { data, w, h } = await raster(ornamentMessageSvg(band.objects, band.width, band.height), 6000, 180);
  const cols = readColumns(data, w, h);
  const r = decodeOrnamentScans([cols]) ?? decodeOrnamentScans([reverseScan(cols)]);
  assert.equal(r?.text, MSG.toLowerCase());
});

test("collects pinpoints from two partial scans that each miss part of the message", async () => {
  const band = layoutOrnamentMessage(MSG, { length: 1000 });
  const per = band.columns.findIndex((c, i) => i > 0 && c.kind === "sync");
  const svg = ornamentMessageSvg(band.objects, band.width, band.height);
  const { data, w, h } = await raster(svg, 6000);
  const all = readColumns(data, w, h);
  // scan A sees the first 60% of repeat 1, scan B the last 60% of repeat 2 (with its sync)
  const a = all.slice(0, Math.floor(per * 0.6));
  const bb = [all[per]!, ...Array.from({ length: Math.floor(per * 0.4) - 1 }, () => null), ...all.slice(per + Math.floor(per * 0.4), per * 2)];
  assert.equal(decodeOrnamentScans([a])?.text === MSG.toLowerCase(), false, "one partial scan is not enough");
  assert.equal(decodeOrnamentScans([a, bb])?.text, MSG.toLowerCase());
});

test("one photo that starts mid-repeat: the stretch before the marker ends a repeat", async () => {
  const band = layoutOrnamentMessage(MSG, { length: 1000 });
  const per = band.columns.findIndex((c, i) => i > 0 && c.kind === "sync");
  const { data, w, h } = await raster(ornamentMessageSvg(band.objects, band.width, band.height), 6000);
  const all = readColumns(data, w, h);
  // 45% of a repeat before the marker, 70% after it: neither half alone is a full repeat
  const scan = all.slice(per - Math.floor(per * 0.45), per + Math.floor(per * 0.7));
  assert.equal(decodeOrnamentScans([scan])?.text, MSG.toLowerCase());
});
