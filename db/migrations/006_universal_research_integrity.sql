-- Universal research/synthesis integrity layer.
-- Additive: does not destroy legacy production tables while the product adapters migrate.
create table if not exists research_corpus_object (
  id text primary key,
  source_key text not null,
  tradition text,
  cultural_access text not null default 'uncertain',
  title text not null,
  creator text,
  date_label text,
  region text,
  material text,
  technique text,
  source_url text,
  image_url text,
  rights text,
  accession text,
  reliability numeric not null default .5 check (reliability between 0 and 1),
  raw jsonb not null default '{}'::jsonb,
  ingested_at timestamptz not null default now()
);
create index if not exists research_corpus_source_idx on research_corpus_object(source_key);
create index if not exists research_corpus_tradition_idx on research_corpus_object(tradition);
create index if not exists research_corpus_region_idx on research_corpus_object(region);
create index if not exists research_corpus_access_idx on research_corpus_object(cultural_access);

create table if not exists universal_synthesis_run (
  id uuid primary key default gen_random_uuid(),
  seed text not null,
  meanings jsonb not null,
  principle_ids jsonb not null,
  density text not null check (density in ('restrained','balanced','complex')),
  symmetry text not null check (symmetry in ('bilateral','radial','translational','asymmetric-balanced')),
  engine_version text not null,
  status text not null default 'created',
  created_at timestamptz not null default now()
);
create table if not exists universal_synthesis_candidate (
  id text primary key,
  run_id uuid not null references universal_synthesis_run(id) on delete cascade,
  ordinal integer not null,
  recipe jsonb not null,
  svg text not null,
  metrics jsonb not null default '{}'::jsonb,
  decision text not null default 'candidate',
  rejection_reasons jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique(run_id,ordinal)
);
create table if not exists universal_candidate_provenance (
  candidate_id text not null references universal_synthesis_candidate(id) on delete cascade,
  principle_id uuid not null references knowledge_principle(id),
  source_id uuid references knowledge_source(id),
  feature_ref text not null,
  transformation_distance numeric,
  primary key(candidate_id,principle_id,feature_ref)
);
create index if not exists universal_candidate_run_idx on universal_synthesis_candidate(run_id,decision);

create or replace view research_integrity_summary as
select
 (select count(*) from research_corpus_object) corpus_objects,
 (select count(*) from knowledge_source) knowledge_sources,
 (select count(*) from knowledge_artifact) artifacts,
 (select count(*) from knowledge_form) forms,
 (select count(*) from knowledge_principle) principles,
 (select count(*) from knowledge_evidence) evidence,
 (select count(*) from synthesis_run) legacy_synthesis_runs,
 (select count(*) from universal_synthesis_run) universal_synthesis_runs,
 (select count(*) from universal_synthesis_candidate) universal_candidates;
