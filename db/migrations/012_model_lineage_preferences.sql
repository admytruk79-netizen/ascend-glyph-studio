create table if not exists tesseract_model_checkpoint (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  version text not null,
  parent_id uuid references tesseract_model_checkpoint(id),
  status text not null default 'candidate' check (status in ('candidate','active','rejected','archived')),
  corpus_count integer not null default 0,
  image_count integer not null default 0,
  tradition_count integer not null default 0,
  holdout_fingerprint text,
  metrics jsonb not null default '{}'::jsonb,
  body jsonb,
  built_at timestamptz not null default now(),
  promoted_at timestamptz
);
create index if not exists tesseract_model_checkpoint_kind_status_idx on tesseract_model_checkpoint(kind,status,built_at desc);

create table if not exists design_preference (
  id uuid primary key default gen_random_uuid(),
  left_candidate_id uuid not null references synthesis_candidate(id) on delete cascade,
  right_candidate_id uuid not null references synthesis_candidate(id) on delete cascade,
  winner text not null check (winner in ('left','right','tie','reject-both')),
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(left_candidate_id,right_candidate_id)
);
create index if not exists design_preference_created_idx on design_preference(created_at desc);

create table if not exists preference_model (
  id text primary key,
  version text not null,
  feature_order text[] not null,
  weights real[] not null,
  bias real not null default 0,
  pair_count integer not null default 0,
  metrics jsonb not null default '{}'::jsonb,
  built_at timestamptz not null default now()
);
