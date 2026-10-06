# Secure glyph code: encoded ornament with a keyed reader

This is a two-layer message hidden inside an ordinary-looking ASCEND ornament band, on a shirt, a diary or a boot shaft. A phone **sweeping left to right** reads it:

- **Public layer:** any ASCEND reader can read it, and it is **signed** so it can't be forged. Examples: an item ID, an authenticity check, a public message.
- **Secret layer:** encrypted. Only a reader holding the **authorised keys** can decrypt it. Example: blood type, Rh, allergies, a short critical note.

Without the key the secret layer is indistinguishable from random variation in the ornament.

> **Status:** prototype design. It uses standard authenticated cryptography (AES-256-GCM, Ed25519 signatures), not a proprietary cipher. It is **not certified military equipment**. Field use by the Armed Forces of Ukraine should go through **Brave1** (the national defence-tech cluster) for testing and approval, especially key management.

## 0. Principle: skeleton + decoration

The code works like a QR code hidden inside ornament.

- **The data skeleton** is a fixed set of **data points** placed in the pattern according to a key-derived layout, like the modules of a QR code. Anchor points (QR-style "finder" marks) are disguised as ornamental rosettes or seeds at the band ends and corners. They give the reader position, scale, direction and orientation.
- **The decorative layer** is generated around the skeleton by Tesseract with the normal grammar (bands, rhythm, voids, symmetry). It hides the skeleton and makes the piece read as ASCEND ornament. The decoration carries no data. It can change freely between items without affecting the message.

**Encoding channels** follow how traditional embroidery carried meaning: which motif, its direction, stitch and colour. Ukrainian protective embroidery is a cultural inspiration here; the code itself is modern cryptography. At each data point one or more channels carry bits:

| Channel | Example values | Read by | Notes |
|---|---|---|---|
| **Motif variant** | normal / mirrored / rotated / detail on-off | Shape classification | Most robust; works in print and embroidery |
| **Stitch angle** | satin or fill direction 0° / 45° / 90° / 135° | Thread **sheen**: satin reflects light differently by direction | **The left-to-right phone sweep changes the light angle, so the sheen shifts and reveals stitch direction.** Nearly invisible to the eye at rest. Embroidery only. |
| **Colour** | two or three close thread shades | Colour classification, white-balanced against the calibration motifs | Use near shades (e.g. two indigos) so the change is inconspicuous; avoid relying on it after heavy fading |
| **Stitch type** | satin vs fill vs triple run | Texture | Embroidery only |

The **skeleton layout itself is secret**: the positions of the data points are derived from the key (HKDF). Without the key, a reader can't tell which motifs carry data and which are decoration. That adds concealment on top of the encryption, but **the security comes from the encryption, not from hiding**.

**Historical precedent.** Lithuanian pick-up sashes were woven with song texts and still carry woven inscriptions, and "hundred-pattern" (*стоузорні*) sashes make every motif along the band different (Nykorak, Herus, Kutsyr 2022, DOI 10.15407/nz2022.05.1147). A band where every cell is a distinct, readable symbol is a folk form, so the data skeleton has a traditional look rather than a technical one.

## 1. Encoding

1. **Payload**
   - The public payload (a few bytes): format version, item serial (32 bits), optional public text code.
   - The secret payload (compact): blood group (2 bits), Rh (1 bit), flags such as allergies (6–8 bits), optional short code. It is encrypted with **AES-256-GCM**:
     - The key is a **unit key**, held in authorised readers.
     - The nonce is derived from the item serial with HKDF, so it is never stored in the stitches.
     - The tag is truncated to 64 bits, so the stitches stay short. The trade-off is documented in the security review.
   - The public layer and the ciphertext are signed with **Ed25519**. The 64-byte signature is too long for stitches, so the band carries only a signature **reference**. The full signature lives in a **verification registry** that is consulted online, or synced to readers for offline checks.
2. **Error correction:** **Reed–Solomon** over the bitstream, plus interleaving, so a fold, a seam or several worn motifs don't break decoding.
3. **Framing:** a start and end marker (an asymmetric motif pair), so the reader knows direction and alignment. Optional **calibration motifs** show each variant once.
4. **Ornament mapping** (simple band form; the skeleton form in §0 is the general case):
   - Each motif position takes one of 2–4 **variants** of an ASCEND motif: normal, mirrored, rotated 180°, or with a detail added or removed. Each variant is a 1–2 bit symbol.
   - The motif set comes from Oleksandr's traced primitives. Until those exist, it uses the provisional primitives.
   - The band follows the normal grammar and frieze symmetry, so it reads as ornament. Variation between motifs is part of the ASCEND anti-generic style anyway.
5. **Output:** the band as SVG in millimetres. It goes to the embroidery engine (`docs/EMBROIDERY-PRODUCTION-ENGINE.md`) or to print.

## 2. Reader (phone)

1. **Capture:** camera video while the user sweeps left to right along the band. Frames are registered and stitched into one straight band image, which also handles a band curving around a sleeve.
2. **Detect:** find the band, measure its repeat period and split it into motif segments. This uses `detectBands` / `segmentStrip` from the deconstruction engine.
3. **Classify:** locate the anchors, compute the key-derived skeleton positions (keyed reader) or the public-layer positions (public reader), and read each data point's channels:
   - **shape:** variant match;
   - **angle:** sheen change across the sweep frames;
   - **colour:** calibrated against the anchor shades.

   Match each segment to the known variants of the motif set. Each segment gets a symbol plus a confidence value, and low-confidence segments are marked as erasures for Reed–Solomon.
4. **Decode:** framing, then de-interleaving, then Reed–Solomon. The result is the public layer and the ciphertext.
5. **Verify:** check the signature reference against the registry, or the reader's offline copy.
6. **Decrypt (keyed readers only):** AES-256-GCM with the unit key. The tag check rejects tampering or the wrong key.
7. **Display:**
   - Public reader: "Authentic ASCEND item #…".
   - Keyed reader: the secret message, e.g. "Blood group A(II) Rh+, allergy: penicillin".

### Medical safety requirements

- **A medic must never be locked out.** Every medic in a unit holds a keyed reader, the reader works **fully offline**, and keys are stored on the device in its secure storage (Android Keystore / iOS Secure Enclave).
- Reading must take **seconds** with no network. Decode failure shows clearly as "not readable", never as a wrong value.
- The encoded mark **doesn't replace** standard medical identification and procedures. It adds to them.

### Operational security

- **Nothing personal is readable without a key.** No name, unit or position is ever in the public layer.
- Keys can be revoked and rotated. A lost phone is revoked through the registry, and readers sync the revocation list when online.
- Readers are signed apps. Key custody is external (KMS/HSM) in any real deployment, per `docs/TESSERACT-SECURITY-ARCHITECTURE.md`.

## 3. Capacity budget (example band)

| Part | Bits |
|---|---|
| Version + serial | 36 |
| Secret payload (blood group, Rh, flags) | ~12 |
| GCM tag (truncated) | 64 |
| Signature reference | 16 |
| Subtotal | ~128 |
| Reed–Solomon parity (~40%) | ~52 |
| **Total** | **~180 bits**: 90 motifs at 2 bits, or about two sleeve bands; less in print |

Diaries and print carry much more, at smaller motif pitch and with more variants per motif.

## 4. Build steps

1. **Codec library:** payload format, AES-GCM with HKDF nonce, signature reference, Reed–Solomon, interleaving, framing. Unit tests use known vectors.
2. **Encoder:** message plus keys → symbols → ASCEND band SVG (mm) for print or embroidery.
3. **Reader prototype:** a phone web app (camera sweep → stitch → detect → classify → decode → verify → decrypt) with public and keyed modes, working offline.
4. **Paper test:** print bands at several motif pitches and measure the read rate under angles, curvature and lighting.
5. **Sew-out test:** stitch on linen using the calibration panel; measure the read rate after wear and washing.
6. **Key management:** registry, unit keys, revocation. Prepare a security review package for Brave1.
