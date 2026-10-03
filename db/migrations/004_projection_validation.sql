create table if not exists process_capability (
 id text primary key,process text not null,substrate_id text references substrate_profile(id),
 min_stroke_mm numeric,min_gap_mm numeric,max_density numeric,capabilities jsonb not null default '{}'::jsonb,
 confidence text not null default 'reference-published',source_id text references measurement_source(id)
);
create table if not exists projection_adaptation (
 id uuid primary key,projection_id uuid not null references manufacturing_projection(id) on delete cascade,
 feature text not null,from_value numeric,to_value numeric,reason text not null,allowed boolean not null,
 created_at timestamptz not null default now()
);
create table if not exists physical_validation (
 id uuid primary key,projection_id uuid not null references manufacturing_projection(id) on delete cascade,
 sample_ref text,result text not null,measurements jsonb not null default '{}'::jsonb,defects jsonb not null default '[]'::jsonb,
 corrective_action jsonb not null default '{}'::jsonb,validated_at timestamptz,notes text
);
