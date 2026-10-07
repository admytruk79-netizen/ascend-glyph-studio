/**
 * Reed–Solomon over GF(256) (primitive polynomial 0x11d, first consecutive root α^0), with errors and
 * erasures. With p parity bytes it corrects e errors and f erasures whenever 2e + f ≤ p.
 * Follows the classic Berlekamp–Massey / Chien / Forney construction.
 */
const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]!;
}
const mul = (a: number, b: number) => (a && b ? EXP[LOG[a]! + LOG[b]!]! : 0);
const div = (a: number, b: number) => { if (!b) throw new Error("gf div by 0"); return a ? EXP[(LOG[a]! + 255 - LOG[b]!) % 255]! : 0; };
const pow = (a: number, n: number) => EXP[((LOG[a]! * n) % 255 + 255) % 255]!;
const inv = (a: number) => EXP[255 - LOG[a]!]!;

// Polynomials as arrays, highest degree first.
const pScale = (p: number[], x: number) => p.map((c) => mul(c, x));
function pAdd(p: number[], q: number[]): number[] {
  const r = new Array(Math.max(p.length, q.length)).fill(0);
  for (let i = 0; i < p.length; i++) r[i + r.length - p.length] = p[i];
  for (let i = 0; i < q.length; i++) r[i + r.length - q.length] ^= q[i]!;
  return r;
}
function pMul(p: number[], q: number[]): number[] {
  const r = new Array(p.length + q.length - 1).fill(0);
  for (let j = 0; j < q.length; j++) for (let i = 0; i < p.length; i++) r[i + j] ^= mul(p[i]!, q[j]!);
  return r;
}
function pEval(p: number[], x: number): number {
  let y = p[0]!;
  for (let i = 1; i < p.length; i++) y = mul(y, x) ^ p[i]!;
  return y;
}

function generator(nsym: number): number[] {
  let g = [1];
  for (let i = 0; i < nsym; i++) g = pMul(g, [1, pow(2, i)]);
  return g;
}

export function rsEncode(msg: Uint8Array, nsym: number): Uint8Array {
  if (msg.length + nsym > 255) throw new Error("rs: codeword longer than 255");
  const gen = generator(nsym);
  const out = new Array(msg.length + nsym).fill(0);
  for (let i = 0; i < msg.length; i++) out[i] = msg[i];
  for (let i = 0; i < msg.length; i++) {
    const c = out[i];
    if (c) for (let j = 1; j < gen.length; j++) out[i + j] ^= mul(gen[j]!, c);
  }
  for (let i = 0; i < msg.length; i++) out[i] = msg[i];
  return Uint8Array.from(out);
}

function syndromes(msg: number[], nsym: number): number[] {
  const s = [0];
  for (let i = 0; i < nsym; i++) s.push(pEval(msg, pow(2, i)));
  return s; // s[0] is a padding 0, as in the reference construction
}

function erasureLocator(pos: number[]): number[] {
  let loc = [1];
  for (const p of pos) loc = pMul(loc, pAdd([1], [pow(2, p), 0]));
  return loc;
}

function errorEvaluator(synd: number[], errLoc: number[], nsym: number): number[] {
  const prod = pMul(synd, errLoc);
  return prod.slice(prod.length - (nsym + 1));
}

function correctErrata(msg: number[], synd: number[], errPos: number[]): number[] {
  const coefPos = errPos.map((p) => msg.length - 1 - p);
  const errLoc = erasureLocator(coefPos);
  const errEval = errorEvaluator([...synd].reverse(), errLoc, errLoc.length - 1).reverse();
  const X = coefPos.map((p) => pow(2, -(255 - p)));
  const E = new Array(msg.length).fill(0);
  X.forEach((Xi, i) => {
    const XiInv = inv(Xi);
    let denom = 1;
    X.forEach((Xj, j) => { if (j !== i) denom = mul(denom, 1 ^ mul(XiInv, Xj)); });
    const y = mul(pEval([...errEval].reverse(), XiInv), 1); // fcr = 0
    const magnitude = mul(Xi, y);
    E[errPos[i]!] = div(magnitude, denom);
  });
  return pAdd(msg, E);
}

function findErrorLocator(synd: number[], nsym: number, eraseCount: number): number[] {
  let errLoc = [1], oldLoc = [1];
  const syndShift = synd.length > nsym ? synd.length - nsym : 0;
  for (let i = 0; i < nsym - eraseCount; i++) {
    const K = i + syndShift;
    let delta = synd[K]!;
    for (let j = 1; j < errLoc.length; j++) delta ^= mul(errLoc[errLoc.length - 1 - j]!, synd[K - j]!);
    oldLoc = [...oldLoc, 0];
    if (delta !== 0) {
      if (oldLoc.length > errLoc.length) {
        const newLoc = pScale(oldLoc, delta);
        oldLoc = pScale(errLoc, inv(delta));
        errLoc = newLoc;
      }
      errLoc = pAdd(errLoc, pScale(oldLoc, delta));
    }
  }
  while (errLoc.length && errLoc[0] === 0) errLoc.shift();
  const errs = errLoc.length - 1;
  if ((errs - eraseCount) * 2 + eraseCount > nsym) throw new Error("rs: too many errors");
  return errLoc;
}

function findErrors(errLoc: number[], n: number): number[] {
  const errs = errLoc.length - 1;
  const pos: number[] = [];
  for (let i = 0; i < n; i++) if (pEval(errLoc, pow(2, i)) === 0) pos.push(n - 1 - i);
  if (pos.length !== errs) throw new Error("rs: could not locate errors");
  return pos;
}

function forneySyndromes(synd: number[], pos: number[], n: number): number[] {
  const erasePos = pos.map((p) => n - 1 - p);
  const fsynd = synd.slice(1);
  for (const p of erasePos) {
    const x = pow(2, p);
    for (let j = 0; j < fsynd.length - 1; j++) fsynd[j] = mul(fsynd[j]!, x) ^ fsynd[j + 1]!;
  }
  return fsynd;
}

/**
 * Decode a codeword. `erasures` are indexes known to be unreadable (e.g. worn motifs).
 * Returns the message bytes and how many bytes were corrected; throws when the damage is beyond capacity.
 */
export function rsDecode(code: Uint8Array, nsym: number, erasures: number[] = []): { message: Uint8Array; corrected: number } {
  if (erasures.length > nsym) throw new Error("rs: too many erasures");
  let msg = Array.from(code);
  for (const e of erasures) msg[e] = 0;
  let synd = syndromes(msg, nsym);
  if (Math.max(...synd) === 0) return { message: Uint8Array.from(msg.slice(0, msg.length - nsym)), corrected: erasures.length };
  const fsynd = forneySyndromes(synd, erasures, msg.length);
  const errLoc = findErrorLocator(fsynd, nsym, erasures.length);
  const errPos = findErrors([...errLoc].reverse(), msg.length);
  msg = correctErrata(msg, synd, [...erasures, ...errPos]);
  synd = syndromes(msg, nsym);
  if (Math.max(...synd) > 0) throw new Error("rs: could not correct");
  return { message: Uint8Array.from(msg.slice(0, msg.length - nsym)), corrected: erasures.length + errPos.length };
}
