/** Geometry in millimetres. x to the right, y down (SVG convention). */
export interface Pt { x: number; y: number }

export const dist = (a: Pt, b: Pt): number => Math.hypot(b.x - a.x, b.y - a.y);

export function polylineLength(path: Pt[]): number {
  let L = 0;
  for (let i = 1; i < path.length; i++) L += dist(path[i - 1]!, path[i]!);
  return L;
}

/** Point and unit tangent at arc length s along a polyline. */
export function sampleAt(path: Pt[], s: number): { p: Pt; t: Pt } {
  let acc = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!, b = path[i]!;
    const d = dist(a, b);
    if (d === 0) continue;
    if (acc + d >= s || i === path.length - 1) {
      const u = Math.min(1, Math.max(0, (s - acc) / d));
      return { p: { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u }, t: { x: (b.x - a.x) / d, y: (b.y - a.y) / d } };
    }
    acc += d;
  }
  const p = path[0]!;
  return { p: { ...p }, t: { x: 1, y: 0 } };
}

/** Evenly spaced points along a polyline: about `step` apart, always including both ends. */
export function resample(path: Pt[], step: number): Pt[] {
  const L = polylineLength(path);
  if (L === 0) return [{ ...path[0]! }];
  const n = Math.max(1, Math.ceil(L / step - 1e-9));
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) out.push(sampleAt(path, (L * i) / n).p);
  return out;
}

export function polygonArea(poly: Pt[]): number {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]!, q = poly[(i + 1) % poly.length]!;
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

export function bounds(points: Pt[]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

export const rotate = (p: Pt, ang: number): Pt => {
  const c = Math.cos(ang), s = Math.sin(ang);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
};

/** Inset a simple polygon by d (mm) using vertex-bisector offsets. Adequate for the gentle shapes used in bands. */
export function inset(poly: Pt[], d: number): Pt[] {
  const sign = polygonArea(poly) > 0 ? 1 : -1; // y-down: positive area = clockwise on screen
  const n = poly.length;
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = poly[(i - 1 + n) % n]!, p = poly[i]!, b = poly[(i + 1) % n]!;
    const e1 = norm({ x: p.x - a.x, y: p.y - a.y }), e2 = norm({ x: b.x - p.x, y: b.y - p.y });
    // inward normals for each edge
    const n1 = { x: -e1.y * sign, y: e1.x * sign }, n2 = { x: -e2.y * sign, y: e2.x * sign };
    const bis = norm({ x: n1.x + n2.x, y: n1.y + n2.y });
    const cosHalf = Math.max(0.25, bis.x * n1.x + bis.y * n1.y);
    out.push({ x: p.x + (bis.x * d) / cosHalf, y: p.y + (bis.y * d) / cosHalf });
  }
  return out;
}

export function norm(v: Pt): Pt {
  const l = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / l, y: v.y / l };
}

/** Shortest distance from point p to segment ab. */
export function pointSegDist(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const L2 = dx * dx + dy * dy;
  const u = L2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2));
  return Math.hypot(p.x - (a.x + u * dx), p.y - (a.y + u * dy));
}

export function pointInPolygon(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!, b = poly[j]!;
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
