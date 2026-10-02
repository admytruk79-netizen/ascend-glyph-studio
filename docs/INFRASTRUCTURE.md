# Infrastructure

PostgreSQL is the system of record. Object storage holds immutable atlas sources, canonical SVGs, previews and production packages. The storage package is provider-neutral so Cloudflare R2 can be attached without coupling the Glyph Engine to a vendor.

Do not commit database credentials, R2 secrets, or signed URLs.
