# Tesseract Secure Protocol TS-1

Status: experimental protocol profile. Not approved for classified deployment.

TS-1 separates Tesseract's proprietary visual carrier from cryptographic primitives. Security MUST NOT depend on secrecy of the ornament grammar.

## Envelope

```
TS1 {
  version
  suite
  messageId
  senderKeyId
  recipientKeyIds[]
  createdAt
  expiresAt?
  nonce
  sequence?
  previousMessageId?
  aad
  wrappedKeys[]
  ciphertext
  authTag
  signature
}
```

Canonical serialization is deterministic and versioned. The signature covers the header, recipient set, ciphertext and authentication tag.

## Security suites

A deployment registers a vetted suite through the TS-1 crypto-provider interface. The engine contains no home-grown cipher. Providers are responsible for authenticated encryption, signing/verification, secure randomness, key wrapping and zeroization appropriate to their platform.

## Separation

PUBLIC: semantic graph -> visual grammar.
SECURE: opaque TS-1 envelope -> error correction -> recursive visual carrier.
A pattern may contain either or both channels. Public decoding never grants access to the secure channel.

## Required controls

- unique unpredictable nonce per encryption key
- message ID and optional monotonic sequence for replay policy
- expiry and recipient/audience binding
- sender authenticity
- authenticated associated data binding carrier/version/policy
- key IDs rather than raw long-term keys in pattern metadata
- revocation/policy hooks outside the carrier
- crypto agility via suite IDs
- fail closed on unknown versions, suites, malformed envelopes, failed authentication, expiry or policy rejection

## Boundary

Military/regulated deployments provide their own approved key management, identity, authorization, audit and cryptographic provider. ASCEND/Tesseract must not retain a universal decrypt key.
