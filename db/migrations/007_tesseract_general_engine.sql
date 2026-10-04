-- ASCEND Tesseract general-engine persistence.
-- STAGED ONLY: do not mark applied until live Neon schema spring-mode-77399290 is inspected.
create table if not exists tesseract_meaning_graphs (
 id uuid primary key default gen_random_uuid(), schema_version text not null default 'ascend.tesseract-meaning-graph.v1',
 seed text not null, semantic_checksum text not null, graph_json jsonb not null, created_at timestamptz not null default now(),
 unique(seed,semantic_checksum)
);
create table if not exists tesseract_artifacts (
 id uuid primary key default gen_random_uuid(), graph_id uuid not null references tesseract_meaning_graphs(id),
 artifact_schema text not null default 'ascend.tesseract-artifact.v1', substrate_kind text not null,
 substrate_profile jsonb not null, projection_kinds jsonb not null, multiscale_field jsonb not null,
 svg_text text not null, status text not null default 'candidate',
 created_at timestamptz not null default now(),
 check (substrate_kind in ('diary','garment','stationery','emblem','packaging','digital')),
 check (status in ('candidate','originality-review','cultural-review','manufacturing-review','approved'))
);
create table if not exists tesseract_sleeve_projections (
 id uuid primary key default gen_random_uuid(), artifact_id uuid not null references tesseract_artifacts(id) on delete cascade,
 side text not null, pair_mode text not null, projection_json jsonb not null,
 created_at timestamptz not null default now(),
 check (side in ('left','right')), check (pair_mode in ('mirror','complement','split-macro')),
 unique(artifact_id,side)
);
create index if not exists tesseract_artifacts_graph_idx on tesseract_artifacts(graph_id);
create index if not exists tesseract_artifacts_substrate_idx on tesseract_artifacts(substrate_kind,status);
