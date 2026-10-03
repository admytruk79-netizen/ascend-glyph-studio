-- ASCEND Tesseract knowledge graph v0.2
-- Additive migration: preserves legacy glyph and production tables.

create table if not exists knowledge_tradition (
  id text primary key, name text not null, parent_id text references knowledge_tradition(id),
  tradition_kind text not null, region text, notes text,
  access_default text not null default 'uncertain',
  created_at timestamptz not null default now()
);

create table if not exists knowledge_source (
  id uuid primary key, source_type text not null, title text not null,
  creator text, publication_year integer, locator text, citation text,
  reliability numeric not null default .5 check (reliability between 0 and 1),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists knowledge_artifact (
  id uuid primary key, tradition_id text references knowledge_tradition(id),
  artifact_type text not null, name text, region text, period_label text,
  material text, technique text, metadata jsonb not null default '{}'::jsonb
);

create table if not exists knowledge_concept (
  id text primary key, label text not null, concept_kind text not null,
  description text, ascend_core boolean not null default false
);

create table if not exists knowledge_form (
  id text primary key, label text not null, form_kind text not null,
  canonical_geometry jsonb, description text
);

create table if not exists knowledge_principle (
  id uuid primary key, tradition_id text references knowledge_tradition(id),
  principle_kind text not null, label text not null, description text not null,
  abstraction jsonb not null default '{}'::jsonb,
  cultural_access text not null default 'uncertain',
  confidence numeric not null default .5 check (confidence between 0 and 1)
);

create table if not exists knowledge_evidence (
  principle_id uuid not null references knowledge_principle(id) on delete cascade,
  source_id uuid not null references knowledge_source(id) on delete cascade,
  artifact_id uuid references knowledge_artifact(id) on delete set null,
  interpretation text, confidence numeric not null default .5 check (confidence between 0 and 1),
  primary key(principle_id,source_id,artifact_id)
);

create table if not exists knowledge_relation (
  id uuid primary key, subject_kind text not null, subject_id text not null,
  predicate text not null, object_kind text not null, object_id text not null,
  weight numeric not null default 1, confidence numeric not null default .5,
  source_id uuid references knowledge_source(id),
  metadata jsonb not null default '{}'::jsonb,
  check (weight between 0 and 1), check (confidence between 0 and 1)
);

create table if not exists ontology_version (
  id text primary key, created_at timestamptz not null default now(),
  description text not null, schema_version integer not null
);

create table if not exists synthesis_run (
  id uuid primary key, seed text not null, ontology_version_id text not null references ontology_version(id),
  solver_version text not null, intent jsonb not null, status text not null default 'created',
  created_at timestamptz not null default now()
);

create table if not exists synthesis_candidate (
  id uuid primary key, run_id uuid not null references synthesis_run(id) on delete cascade,
  ordinal integer not null, state jsonb not null, complexity jsonb not null,
  score numeric, disposition text not null default 'candidate',
  rejection_reasons jsonb not null default '[]'::jsonb,
  unique(run_id,ordinal)
);

create table if not exists candidate_provenance (
  candidate_id uuid not null references synthesis_candidate(id) on delete cascade,
  principle_id uuid not null references knowledge_principle(id),
  feature_ref text not null, transformation_distance numeric,
  primary key(candidate_id,principle_id,feature_ref)
);

create table if not exists anti_style_rule (
  id text primary key, label text not null, description text not null,
  detector jsonb not null default '{}'::jsonb, penalty numeric not null default .5,
  active boolean not null default true, check (penalty between 0 and 1)
);

create index if not exists knowledge_relation_subject_idx on knowledge_relation(subject_kind,subject_id);
create index if not exists knowledge_relation_object_idx on knowledge_relation(object_kind,object_id);
create index if not exists knowledge_principle_tradition_idx on knowledge_principle(tradition_id,principle_kind);
create index if not exists synthesis_candidate_run_idx on synthesis_candidate(run_id,disposition);
