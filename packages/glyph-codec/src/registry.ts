/**
 * Verification registry (prototype, in memory). Issues serials so a serial is never reused under one
 * unit key (the GCM nonce rule), stores each item's Ed25519 signature under a 16-bit reference, and
 * keeps the revocation list readers sync when online. A real deployment keeps keys in KMS/HSM.
 */
import { signRecord, verifyRecord } from "./crypto.js";

export class Registry {
  private nextSerial = new Map<number, number>();
  private signatures = new Map<number, Uint8Array>();
  private revokedKeys = new Set<number>();
  private nextRef = 1;

  constructor(private readonly signing: CryptoKeyPair) {}

  issueSerial(keyId: number): number {
    if (this.revokedKeys.has(keyId)) throw new Error(`registry: key ${keyId} is revoked`);
    const s = this.nextSerial.get(keyId) ?? 1;
    if (s > 0xffffffff) throw new Error("registry: serial space exhausted for this key; rotate the key");
    this.nextSerial.set(keyId, s + 1);
    return s;
  }

  reserveSignatureRef(): number {
    if (this.nextRef > 0xffff) throw new Error("registry: signature references exhausted");
    return this.nextRef++;
  }

  async sign(ref: number, record: Uint8Array): Promise<void> {
    this.signatures.set(ref, await signRecord(this.signing.privateKey, record));
  }

  /** "authentic" only when the stored signature verifies against exactly what was read. */
  async verify(ref: number, record: Uint8Array, keyId: number): Promise<"authentic" | "unknown-item" | "forged" | "revoked-key"> {
    if (this.revokedKeys.has(keyId)) return "revoked-key";
    const sig = this.signatures.get(ref);
    if (!sig) return "unknown-item";
    return (await verifyRecord(this.signing.publicKey, sig, record)) ? "authentic" : "forged";
  }

  revokeKey(keyId: number) { this.revokedKeys.add(keyId); }
}
