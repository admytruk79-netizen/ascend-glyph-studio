/**
 * Message ⇄ band symbols. Codeword = public layer (7 B) ‖ sealed secret (2 B ciphertext + 8 B tag),
 * protected by Reed–Solomon parity. Each byte becomes four 2-bit motif symbols, interleaved so that
 * neighbouring motifs belong to different bytes (a seam or a worn patch damages many bytes by one
 * symbol each, not one byte completely). Frame: start marker, calibration (0,1,2,3), data, end marker.
 */
import { rsDecode, rsEncode } from "./rs.js";
import { decodePublic, decodeSecret, encodePublic, encodeSecret, FORMAT_VERSION, type PublicLayer, type SecretLayer } from "./payload.js";
import { deriveNonce, openSecret, sealSecret } from "./crypto.js";

export type Symbol = 0 | 1 | 2 | 3;
export type BandSymbol = Symbol | "start" | "end";
export const PUBLIC_BYTES = 7;
export const SEALED_BYTES = 10;
export const DATA_BYTES = PUBLIC_BYTES + SEALED_BYTES;
export const CALIBRATION: Symbol[] = [0, 1, 2, 3];

export interface CodecOptions { parity?: number }
const parityOf = (o?: CodecOptions) => o?.parity ?? 12;

export async function encodeMessage(pub: Omit<PublicLayer, "version">, secret: SecretLayer, unitKey: CryptoKey, o?: CodecOptions): Promise<{ codeword: Uint8Array; record: Uint8Array; symbols: BandSymbol[] }> {
  const p: PublicLayer = { version: FORMAT_VERSION, ...pub };
  const pubBytes = encodePublic(p);
  const sealed = await sealSecret(unitKey, await deriveNonce(p.keyId, p.serial), encodeSecret(secret), pubBytes);
  if (sealed.length !== SEALED_BYTES) throw new Error("codec: unexpected sealed length");
  const record = new Uint8Array(DATA_BYTES);
  record.set(pubBytes, 0);
  record.set(sealed, PUBLIC_BYTES);
  const codeword = rsEncode(record, parityOf(o));
  return { codeword, record, symbols: ["start", ...CALIBRATION, ...interleave(codeword), "end"] };
}

export function interleave(codeword: Uint8Array): Symbol[] {
  const N = codeword.length;
  const out: Symbol[] = new Array(N * 4);
  for (let i = 0; i < N; i++) for (let k = 0; k < 4; k++) out[k * N + i] = ((codeword[i]! >> (6 - 2 * k)) & 3) as Symbol;
  return out;
}

/** Inverse of interleave; a byte with any unreadable symbol (null) becomes an erasure. */
export function deinterleave(symbols: (Symbol | null)[]): { bytes: Uint8Array; erasures: number[] } {
  if (symbols.length % 4) throw new Error("codec: data length is not a multiple of 4 symbols");
  const N = symbols.length / 4;
  const bytes = new Uint8Array(N);
  const erasures: number[] = [];
  for (let i = 0; i < N; i++) {
    let v = 0, lost = false;
    for (let k = 0; k < 4; k++) {
      const s = symbols[k * N + i];
      if (s === null || s === undefined) lost = true;
      v = (v << 2) | (s ?? 0);
    }
    bytes[i] = v;
    if (lost) erasures.push(i);
  }
  return { bytes, erasures };
}

export type ReadResult =
  | { status: "ok"; public: PublicLayer; secret?: SecretLayer; secretStatus: "decrypted" | "no-key" | "not-readable"; corrected: number; record: Uint8Array }
  | { status: "not-readable"; reason: string };

/**
 * Read a band. Symbols may be null where the classifier was unsure. The band may be read in either
 * direction (the start/end markers tell which). Without a matching key, only the public layer is returned.
 * Never returns a guessed value: any failure is reported as not readable.
 */
export async function readBand(band: (BandSymbol | null)[], keys: Map<number, CryptoKey>, o?: CodecOptions): Promise<ReadResult> {
  let s = [...band];
  const iS = s.indexOf("start"), iE = s.indexOf("end");
  if (iS < 0 || iE < 0) return { status: "not-readable", reason: "frame markers not found" };
  if (iE < iS) { s = s.reverse(); }
  const a = s.indexOf("start"), b = s.indexOf("end");
  const inner = s.slice(a + 1, b);
  const calib = inner.slice(0, 4);
  if (calib.some((c, i) => c !== null && c !== CALIBRATION[i])) return { status: "not-readable", reason: "calibration motifs do not match (classifier out of calibration)" };
  const data = inner.slice(4);
  if (data.some((c) => c === "start" || c === "end")) return { status: "not-readable", reason: "unexpected marker inside data" };
  const N = DATA_BYTES + parityOf(o);
  if (data.length !== N * 4) return { status: "not-readable", reason: `expected ${N * 4} data motifs, found ${data.length}` };
  let decoded: { message: Uint8Array; corrected: number };
  try {
    const { bytes, erasures } = deinterleave(data as (Symbol | null)[]);
    decoded = rsDecode(bytes, parityOf(o), erasures);
  } catch (e) {
    return { status: "not-readable", reason: `error correction failed: ${(e as Error).message}` };
  }
  const record = decoded.message;
  const pubBytes = record.slice(0, PUBLIC_BYTES);
  const pub = decodePublic(pubBytes);
  if (pub.version !== FORMAT_VERSION) return { status: "not-readable", reason: `unknown format version ${pub.version}` };
  const key = keys.get(pub.keyId);
  if (!key) return { status: "ok", public: pub, secretStatus: "no-key", corrected: decoded.corrected, record };
  try {
    const plain = await openSecret(key, await deriveNonce(pub.keyId, pub.serial), record.slice(PUBLIC_BYTES), pubBytes);
    return { status: "ok", public: pub, secret: decodeSecret(plain), secretStatus: "decrypted", corrected: decoded.corrected, record };
  } catch {
    return { status: "ok", public: pub, secretStatus: "not-readable", corrected: decoded.corrected, record };
  }
}
