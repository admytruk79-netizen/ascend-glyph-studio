# Tesseract Security Architecture

Status: active engineering foundation; not a certification claim. Updated 2026-10-05.

## Separation of concerns

Tesseract separates visual semantics from cryptographic confidentiality. A public pattern may communicate learned semantic structure. Optional protected payloads are opaque encrypted data carried by the pattern/transport layer. Photographing or possessing a pattern does not confer authorization.

## Security tiers

**Public** — no confidentiality claim; semantic visual language may be read by a trained person or reader.

**Private** — authenticated encrypted payload for an owner/group. Decryption requires the appropriate external key and authorization context.

**Restricted / defense profile** — private protection plus organization-controlled identity, role authorization, hardware-backed key custody, device/reader trust, audit, rotation and revocation requirements.

## Cryptographic envelope

Current implementation: `packages/tesseract-engine/src/secure-payload.ts`.

The v1 envelope uses AES-256-GCM, a random 96-bit IV/nonce, a 256-bit key supplied by the caller, and authenticated additional data binding `ASCEND-TESSERACT`, envelope version, access tier and key ID. The authentication tag is mandatory. Wrong keys or modified authenticated data fail decryption.

The engine does not generate or persist a universal master key. Production keys must be created and held by an external KMS/HSM or equivalent approved key-custody system. Envelope-key support is now implemented: 256-bit data-encryption keys can be wrapped under a separate 256-bit key-encryption key using authenticated AES-256-GCM and rotated to a new KEK without changing the DEK.

## Implemented cryptographic controls

Current code in `packages/tesseract-engine/src/secure-payload.ts` implements:
- AES-256-GCM authenticated encryption for restricted payloads.
- 32-byte caller-supplied data-encryption keys.
- Random 96-bit IV/nonce per encryption operation.
- Additional authenticated data binding product namespace, envelope version, access tier and key ID.
- Authentication-tag verification on decrypt.
- Key-envelope wrapping of 256-bit DEKs under separate 256-bit KEKs using AES-256-GCM.
- KEK rotation by unwrap/re-wrap without changing the protected DEK.
- Explicit key identifiers and authorization gates.
- Restricted-policy checks for MFA, hardware-backed/device-attested execution, signed reader software, role membership and revocation freshness.

Not yet implemented in this repository: real external KMS/HSM adapters, deployed device attestation, production audit sink, signing PKI, revocation service, mobile secure-storage adapters, replay-state service, FIPS-validated provider integration or any classified-system accreditation.

## Restricted policy

The current policy contract requires external KMS, hardware-backed keys, MFA, signed reader software, device attestation, audit logging, bounded offline revocation freshness and a maximum key-age policy. Authorization checks role membership and reader/device state before restricted content is opened.

## Required next controls

Bind key envelopes to tenant/mission/role policy and external KMS identifiers. Add signing/provenance for generated messages and reader packages; rotation/re-encryption workflows; explicit revocation records; replay-resistant message context where protocols require it; secure audit event schema; mobile secure-storage adapters; server-side KMS adapters; threat-model tests; fuzzing of parser/envelope boundaries; and independent security review.

## Defense deployment boundary

A defense deployment should be separable from the consumer ASCEND environment. Identity provider, KMS/HSM, audit store, revocation service, device management and deployment signing can be organization-owned. Offline operation must have an explicit freshness window and fail according to deployment policy. No consumer-cloud dependency or hidden ASCEND recovery key should be required for restricted deployments.

## Explicit non-claims

The project does not invent a proprietary cipher and does not call visual pattern obscurity encryption. The current implementation is not represented as FIPS validated, government accredited, classified-system approved, or otherwise certified. Those claims require the actual deployment stack, validated modules where required, threat assessment, operational controls and the applicable external approval process.

## Reader flow

`camera/input → pattern normalization → public semantic decode → protected-payload detection → authenticity/integrity validation → authorization-policy evaluation → external key retrieval/unwrapping → authorized decryption → localized semantic rendering → audit event`
