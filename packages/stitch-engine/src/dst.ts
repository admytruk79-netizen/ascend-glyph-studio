/**
 * Tajima DST writer and reader. Units of 0.1 mm, y up in the file (our geometry is y down).
 * One record moves at most ±121 units (12.1 mm); longer moves are split into jumps.
 */
import type { Stitch } from "./stitches.js";

export type Cmd = "stitch" | "jump" | "trim" | "color" | "end";
export interface Command { cmd: Cmd; x: number; y: number; tie?: boolean; turn?: boolean }

const bit = (n: number) => 1 << n;

export function encodeRecord(dx: number, dy: number, kind: "stitch" | "jump" | "color"): [number, number, number] {
  if (!Number.isInteger(dx) || !Number.isInteger(dy) || Math.abs(dx) > 121 || Math.abs(dy) > 121) throw new Error(`dst: move out of range ${dx},${dy}`);
  let x = dx, y = dy;
  let b0 = 0, b1 = 0, b2 = 0;
  if (kind === "jump") b2 |= bit(7);
  if (kind === "color") b2 |= bit(7) | bit(6);
  if (x > 40) { b2 |= bit(2); x -= 81; }
  if (x < -40) { b2 |= bit(3); x += 81; }
  if (x > 13) { b1 |= bit(2); x -= 27; }
  if (x < -13) { b1 |= bit(3); x += 27; }
  if (x > 4) { b0 |= bit(2); x -= 9; }
  if (x < -4) { b0 |= bit(3); x += 9; }
  if (x > 1) { b1 |= bit(0); x -= 3; }
  if (x < -1) { b1 |= bit(1); x += 3; }
  if (x > 0) { b0 |= bit(0); x -= 1; }
  if (x < 0) { b0 |= bit(1); x += 1; }
  if (y > 40) { b2 |= bit(5); y -= 81; }
  if (y < -40) { b2 |= bit(4); y += 81; }
  if (y > 13) { b1 |= bit(5); y -= 27; }
  if (y < -13) { b1 |= bit(4); y += 27; }
  if (y > 4) { b0 |= bit(5); y -= 9; }
  if (y < -4) { b0 |= bit(4); y += 9; }
  if (y > 1) { b1 |= bit(7); y -= 3; }
  if (y < -1) { b1 |= bit(6); y += 3; }
  if (y > 0) { b0 |= bit(7); y -= 1; }
  if (y < 0) { b0 |= bit(6); y += 1; }
  b2 |= 0b11;
  return [b0, b1, b2];
}

export function decodeRecord(b0: number, b1: number, b2: number): { dx: number; dy: number; kind: "stitch" | "jump" | "color" | "end" } {
  if (b2 === 0xf3) return { dx: 0, dy: 0, kind: "end" };
  const t = (b: number, n: number) => ((b >> n) & 1);
  const dx = t(b0, 0) - t(b0, 1) + 9 * (t(b0, 2) - t(b0, 3)) + 3 * (t(b1, 0) - t(b1, 1)) + 27 * (t(b1, 2) - t(b1, 3)) + 81 * (t(b2, 2) - t(b2, 3));
  const dy = t(b0, 7) - t(b0, 6) + 9 * (t(b0, 5) - t(b0, 4)) + 3 * (t(b1, 7) - t(b1, 6)) + 27 * (t(b1, 5) - t(b1, 4)) + 81 * (t(b2, 5) - t(b2, 4));
  const kind = t(b2, 7) && t(b2, 6) ? "color" : t(b2, 7) ? "jump" : "stitch";
  return { dx, dy, kind };
}

export interface DstOptions { label?: string }

/**
 * Encode absolute commands (mm, y down) to DST. Absolute positions are rounded once, so rounding never drifts.
 * A trim is written as three short jumps (+1/−1/0 pattern widely read as a trim by Tajima-compatible machines).
 */
export function writeDst(commands: Command[], o: DstOptions = {}): Uint8Array {
  const recs: number[] = [];
  let cx = 0, cy = 0; // current position in file units (y up)
  let stitches = 0, colors = 0;
  let minX = 0, maxX = 0, minY = 0, maxY = 0;
  const move = (tx: number, ty: number, kind: "stitch" | "jump") => {
    let dx = tx - cx, dy = ty - cy;
    // split long moves into jumps so the final record lands exactly
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 121));
    if (steps > 1 && kind === "stitch") throw new Error(`dst: stitch longer than 12.1 mm (${(Math.hypot(dx, dy) / 10).toFixed(1)} mm)`);
    for (let s = 1; s <= steps; s++) {
      const nx = cx + Math.round((dx * s) / steps) - Math.round((dx * (s - 1)) / steps);
      const ny = cy + Math.round((dy * s) / steps) - Math.round((dy * (s - 1)) / steps);
      recs.push(...encodeRecord(nx - cx, ny - cy, kind));
      cx = nx; cy = ny;
    }
    if (kind === "stitch") stitches++;
    minX = Math.min(minX, cx); maxX = Math.max(maxX, cx); minY = Math.min(minY, cy); maxY = Math.max(maxY, cy);
  };
  for (const c of commands) {
    const tx = Math.round(c.x * 10), ty = -Math.round(c.y * 10);
    switch (c.cmd) {
      case "stitch": move(tx, ty, "stitch"); break;
      case "jump": move(tx, ty, "jump"); break;
      case "trim": recs.push(...encodeRecord(2, 2, "jump"), ...encodeRecord(-4, -4, "jump"), ...encodeRecord(2, 2, "jump")); break;
      case "color": recs.push(...encodeRecord(0, 0, "color")); colors++; break;
      case "end": break;
    }
  }
  recs.push(0, 0, 0xf3);
  const pad = (v: number, w: number) => String(v).padStart(w, " ");
  const label = (o.label ?? "ASCEND").slice(0, 16).padEnd(16, " ");
  const header =
    `LA:${label}\r` + `ST:${pad(stitches + recs.length / 3 - stitches, 7)}\r` + `CO:${pad(colors, 3)}\r` +
    `+X:${pad(maxX, 5)}\r-X:${pad(-minX, 5)}\r+Y:${pad(maxY, 5)}\r-Y:${pad(-minY, 5)}\r` +
    `AX:+${pad(cx, 5)}\rAY:+${pad(cy, 5)}\rMX:+${pad(0, 5)}\rMY:+${pad(0, 5)}\rPD:******\r\x1a`;
  const out = new Uint8Array(512 + recs.length);
  out.fill(0x20, 0, 512);
  for (let i = 0; i < header.length; i++) out[i] = header.charCodeAt(i);
  out.set(recs, 512);
  return out;
}

/** Read a DST back to absolute commands (mm, y down). Used for round-trip tests and previews. */
export function readDst(buf: Uint8Array): { label: string; commands: Command[] } {
  const head = String.fromCharCode(...buf.subarray(0, 512));
  const label = (/LA:(.{0,16})/.exec(head)?.[1] ?? "").trim();
  const commands: Command[] = [];
  let x = 0, y = 0;
  for (let i = 512; i + 2 < buf.length; i += 3) {
    const r = decodeRecord(buf[i]!, buf[i + 1]!, buf[i + 2]!);
    if (r.kind === "end") { commands.push({ cmd: "end", x: x / 10, y: -y / 10 }); break; }
    x += r.dx; y += r.dy;
    commands.push({ cmd: r.kind === "color" ? "color" : r.kind, x: x / 10, y: -y / 10 });
  }
  return { label, commands };
}

export const stitchesToCommands = (s: Stitch[]): Command[] => s.map((p) => ({ cmd: "stitch" as const, x: p.x, y: p.y }));
