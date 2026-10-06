-- Generated design candidates with their lineage, machine scores and the owner's ratings
-- (rating feeds preference learning). Additive.
create table if not exists design_candidate (
  id text primary key,
  batch text not null,
  request jsonb not null,
  lineage jsonb not null,
  svg text not null,
  frieze_group text,
  motif text,
  scores jsonb not null default '{}'::jsonb,
  gate_failures text[] not null default '{}',
  rating smallint check (rating between -1 and 5),
  rated_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists design_candidate_batch_idx on design_candidate(batch);
create index if not exists design_candidate_rating_idx on design_candidate(rating);

-- CLIP centroids per tradition, rebuilt from the corpus.
create table if not exists style_embedding (
  tradition text not null,
  model text not null,
  built_at timestamptz not null,
  n integer not null,
  centroid real[] not null,
  primary key (tradition, model, built_at)
);
