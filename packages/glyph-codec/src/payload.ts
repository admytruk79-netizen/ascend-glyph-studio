/**
 * Payload layouts (docs/SECURE-GLYPH-CODE.md §1).
 *
 * Public layer, 56 bits = 7 bytes:  version(4) keyId(4) serial(32) signatureRef(16)
 * Secret plaintext, 16 bits = 2 bytes: bloodGroup(2) rh(1) flags(8) reserved(5)
 *
 * No name, unit or position is ever encoded; the public layer identifies the item only.
 */
import { BitReader, BitWriter } from "./bits.js";

export const FORMAT_VERSION = 1;

export interface PublicLayer { version: number; keyId: number; serial: number; signatureRef: number }

export const BLOOD_GROUPS = ["O", "A", "B", "AB"] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];
/** Ukrainian notation for display: O(I), A(II), B(III), AB(IV). */
export const BLOOD_GROUP_UA: Record<BloodGroup, string> = { O: "O(I)", A: "A(II)", B: "B(III)", AB: "AB(IV)" };

/** Eight medical flags. Their meanings are fixed by the deployment's code table, not by the stitches. */
export const DEFAULT_FLAGS = ["penicillin allergy", "other drug allergy", "latex allergy", "diabetes", "epilepsy", "anticoagulants", "asthma", "see medical record"] as const;

export interface SecretLayer { bloodGroup: BloodGroup; rh: "+" | "-"; flags: number }

export function encodePublic(p: PublicLayer): Uint8Array {
  return new BitWriter().write(p.version, 4).write(p.keyId, 4).write(p.serial, 32).write(p.signatureRef, 16).bytes();
}
export function decodePublic(b: Uint8Array): PublicLayer {
  const r = new BitReader(b);
  return { version: r.read(4), keyId: r.read(4), serial: r.read(32), signatureRef: r.read(16) };
}

export function encodeSecret(s: SecretLayer): Uint8Array {
  const g = BLOOD_GROUPS.indexOf(s.bloodGroup);
  if (g < 0) throw new Error(`unknown blood group ${s.bloodGroup}`);
  return new BitWriter().write(g, 2).write(s.rh === "+" ? 1 : 0, 1).write(s.flags, 8).write(0, 5).bytes();
}
export function decodeSecret(b: Uint8Array): SecretLayer {
  const r = new BitReader(b);
  const bloodGroup = BLOOD_GROUPS[r.read(2)]!;
  const rh = r.read(1) ? "+" : "-";
  const flags = r.read(8);
  if (r.read(5) !== 0) throw new Error("secret: reserved bits set");
  return { bloodGroup, rh, flags };
}

export function describeSecret(s: SecretLayer, flagNames: readonly string[] = DEFAULT_FLAGS): string {
  const f = flagNames.filter((_, i) => s.flags & (1 << (7 - i)));
  return `Blood group ${BLOOD_GROUP_UA[s.bloodGroup]} Rh${s.rh}${f.length ? `; ${f.join(", ")}` : ""}`;
}
