-- Tesseract physical feedback loop
create table if not exists physical_sample_validation (
 id uuid primary key default gen_random_uuid(),
 candidate_id text not null,
 medium text not null,
 substrate_id text,
 machine_profile_id text,
 predicted jsonb not null default '{}'::jsonb,
 actual jsonb not null default '{}'::jsonb,
 defects jsonb not null default '[]'::jsonb,
 status text not null check (status in ('sampled','measured','reviewed','production-validated')),
 created_at timestamptz not null default now()
);
create index if not exists physical_sample_validation_medium_status_idx on physical_sample_validation(medium,status);

create table if not exists production_constraint_learning (
 id uuid primary key default gen_random_uuid(),
 medium text not null,
 constraint_name text not null,
 learned_value numeric not null,
 confidence numeric not null check (confidence>=0 and confidence<=1),
 sample_count integer not null default 0,
 provenance jsonb not null default '[]'::jsonb,
 updated_at timestamptz not null default now(),
 unique(medium,constraint_name)
);
