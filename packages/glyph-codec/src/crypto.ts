/**
 * Authenticated encryption of the secret layer with Web Crypto (works in Node and in phone browsers):
 * AES-256-GCM, 64-bit tag, nonce derived by HKDF-SHA-256 from (keyId, serial), public layer as AAD.
 *
 * Nonce uniqueness rests on one rule: a serial is never issued twice under the same unit key.
 * The registry enforces it (issueSerial). The 64-bit tag is a documented trade-off for stitch capacity.
 */
const subtle = globalThis.crypto.subtle;
const enc = new TextEncoder();
const buf = (b: Uint8Array) => b as unknown as BufferSource;
export const TAG_BYTES = 8;

export async function importUnitKey(raw: Uint8Array): Promise<CryptoKey> {
  if (raw.length !== 32) throw new Error("unit key must be 32 bytes (AES-256)");
  return subtle.importKey("raw", buf(raw), "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function deriveNonce(keyId: number, serial: number): Promise<Uint8Array> {
  const ikm = new Uint8Array(5);
  ikm[0] = keyId;
  new DataView(ikm.buffer).setUint32(1, serial);
  const base = await subtle.importKey("raw", buf(ikm), "HKDF", false, ["deriveBits"]);
  const bits = await subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: buf(enc.encode("ASCEND-glyph/v1/nonce")), info: buf(enc.encode("aes-gcm")) }, base, 96);
  return new Uint8Array(bits);
}

export async function sealSecret(key: CryptoKey, nonce: Uint8Array, plaintext: Uint8Array, aad: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv: buf(nonce), additionalData: buf(aad), tagLength: TAG_BYTES * 8 }, key, buf(plaintext)));
}

/** Throws when the tag does not verify: wrong key, tampering or a misread. */
export async function openSecret(key: CryptoKey, nonce: Uint8Array, sealed: Uint8Array, aad: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await subtle.decrypt({ name: "AES-GCM", iv: buf(nonce), additionalData: buf(aad), tagLength: TAG_BYTES * 8 }, key, buf(sealed)));
}

/** Ed25519 signature over everything the band carries; stored in the registry, referenced by signatureRef. */
export async function signRecord(privateKey: CryptoKey, record: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await subtle.sign("Ed25519", privateKey, buf(record)));
}
export async function verifyRecord(publicKey: CryptoKey, signature: Uint8Array, record: Uint8Array): Promise<boolean> {
  return subtle.verify("Ed25519", publicKey, buf(signature), buf(record));
}
export async function generateSigningKeys(): Promise<CryptoKeyPair> {
  return subtle.generateKey("Ed25519", false, ["sign", "verify"]) as Promise<CryptoKeyPair>;
}
