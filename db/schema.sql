-- ASCEND Glyph Studio schema v0.1
create table if not exists glyph_family (
  id text primary key check (id in ('earth','water','fire','air','spirit')),
  display_order smallint not null unique
);
create table if not exists glyph (
  id text primary key,
  family_id text not null references glyph_family(id),
  source_index smallint not null,
  display_name text,
  source_version integer not null default 1,
  geometry_status text not null default 'reconstructed-pending-structural-review',
  source_asset_key text not null,
  svg_asset_key text,
  geometry_sha256 text,
  immutable boolean not null default true,
  unique(family_id,source_index,source_version)
);
create table if not exists material (
  id text primary key, name text not null, fiber text, target_gsm numeric,
  status text not null default 'development', spec jsonb not null default '{}'::jsonb
);
create table if not exists garment (
  id text primary key, revision integer not null, name text not null,
  material_id text references material(id), status text not null default 'development',
  spec jsonb not null default '{}'::jsonb
);
create table if not exists placement_zone (
  id text primary key, garment_id text not null references garment(id),
  zone_kind text not null, geometry jsonb not null default '{}'::jsonb,
  constraints jsonb not null default '{}'::jsonb
);
create table if not exists design (
  id uuid primary key, created_at timestamptz not null default now()
);
create table if not exists design_version (
  design_id uuid not null references design(id), version integer not null,
  garment_id text not null references garment(id), manifest jsonb not null,
  manifest_sha256 text not null, locked_at timestamptz,
  primary key(design_id,version)
);
create table if not exists manufacturer (
  id uuid primary key, legal_name text not null, status text not null default 'candidate',
  capability_profile jsonb not null default '{}'::jsonb
);
create table if not exists production_package (
  id uuid primary key, design_id uuid not null, design_version integer not null,
  asset_key text not null, sha256 text not null, created_at timestamptz not null default now(),
  foreign key(design_id,design_version) references design_version(design_id,version)
);
create table if not exists production_job (
  id uuid primary key, package_id uuid not null references production_package(id),
  manufacturer_id uuid references manufacturer(id), status text not null default 'created',
  created_at timestamptz not null default now()
);
create index if not exists glyph_family_idx on glyph(family_id,source_index);
create index if not exists zone_garment_idx on placement_zone(garment_id);
create index if not exists production_job_status_idx on production_job(status);
