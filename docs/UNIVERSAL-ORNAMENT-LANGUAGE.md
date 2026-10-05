# Tesseract Universal Ornament Language
A generated pattern can be both ornament and data carrier.

## Separation of layers
1. **Semantic layer** — language-neutral concept IDs and relations.
2. **Binary layer** — compact versioned payload, integrity/error-correction data, optional encrypted envelope.
3. **Carrier layer** — bits map to ornamental choices such as motif family, rotation, scale, mirror, spacing and relational position.
4. **Cultural projection** — evidence-backed cultural grammar chooses the permitted visible vocabulary and composition without changing the underlying message.
5. **Rendering layer** — embroidery, weave, print, engraving or screen display.
6. **Reader layer** — camera detects anchors/field, normalizes perspective, classifies ornamental carriers, reconstructs bytes, verifies integrity/authenticity, decrypts when authorized, and localizes semantics into the reader's language.

Example: semantic triple SPEAKER → LOVE → RECIPIENT can render as "I love you", "我爱你", etc. without storing either phrase.

## Inconspicuousness
Do not require QR finder squares. Registration information should be distributed through repeated ornamental landmarks and redundancy. The human-facing result must remain a plausible textile composition.

## Security
Visual obscurity is not security. Private messages require standard authenticated encryption; signatures can authenticate public messages. Keys stay outside the visible design. The ornament carries ciphertext plus version/nonce/authentication data. Camera decoding and cryptographic authorization are separate stages.

## Robustness targets
Perspective distortion, folds, partial occlusion, stitch variation, thread color drift, wear, camera blur, scale and lighting. Redundant carriers and error correction must survive loss of portions of the ornament.
