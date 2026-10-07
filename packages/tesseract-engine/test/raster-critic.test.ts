import { describe, it, expect } from "vitest";
import { critiqueRaster, overdrawFromGray } from "../src/raster-critic";

const W = 960, H = 260, ground = `<rect width="100%" height="100%" fill="#0F1B2D"/>`;
const svg = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">${ground}${body}</svg>`;

describe("raster critic", () => {
  it("reads overdraw depth back from equal faint layers", () => {
    // pixels after 1, 2 and 4 layers at opacity 0.25
    const g = [1, 2, 4].map((n) => Math.round(255 * Math.pow(0.75, n)));
    const r = overdrawFromGray(g, g.length);
    expect(r.ink).toBe(1);
    expect(r.depthShare(2)).toBeCloseTo(2 / 3);
    expect(r.deep).toBeCloseTo(2 / 3);
    expect(r.depthShare(4)).toBeCloseTo(1 / 3);
  });

  it("passes a clean band of separate solid motifs", async () => {
    let body = "";
    for (let i = 0; i < 12; i++) { const cx = 40 + i * 80; body += `<path d="M${cx} 70 L${cx + 26} 130 L${cx} 190 L${cx - 26} 130 Z" fill="#C9A227"/><circle cx="${cx}" cy="130" r="8" fill="#B33A2B"/>`; }
    const r = await critiqueRaster(svg(body));
    expect(r.survive).toBe(true);
    expect(r.overdraw).toBeLessThan(0.12); // a seed laid on each rhomb is intended overlap
  });

  it("fails crossed-circle chains stacked six times (the old master-composition tangle), even with opacity", async () => {
    let ring = "";
    for (let i = 0; i < 60; i++) { const x = 30 + i * 15, y = 60 + 12 * Math.sin(i / 3); ring += `<circle cx="${x}" cy="${y}" r="18" stroke="#F2E8D5" stroke-width="2.6" fill="none"/><path d="M${x - 22} ${y} H${x + 22} M${x} ${y - 22} V${y + 22}" stroke="#F2E8D5" stroke-width="2.6"/>`; }
    const layers = [0, 1, 2, 3, 4, 5].map((k) => `<g opacity="${(0.9 - k * 0.12).toFixed(2)}" transform="translate(${k * 6} ${k * 22})">${ring}</g>`).join("");
    const r = await critiqueRaster(svg(layers));
    expect(r.flags).toContain("raster-tangle");
    expect(r.survive).toBe(false);
  });

  it("flags a band whose ornament leaves most of its length empty", async () => {
    const r = await critiqueRaster(svg(`<path d="M40 80 L120 80 L120 180 L40 180 Z" fill="#C9A227"/>`));
    expect(r.flags).toContain("raster-unused-field");
  });
});
