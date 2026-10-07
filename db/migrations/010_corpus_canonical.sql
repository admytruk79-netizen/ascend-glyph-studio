create table if not exists corpus_canonical (
  id text primary key,
  version text not null,
  status text not null,
  support int not null,
  traditions jsonb not null default '[]'::jsonb,
  sources jsonb not null default '[]'::jsonb,
  centroid jsonb not null,
  paths jsonb not null,
  nearest_reference_distance numeric not null,
  provenance jsonb not null,
  built_at timestamptz not null default now()
);
create index if not exists corpus_canonical_status_idx on corpus_canonical(status, support desc);
