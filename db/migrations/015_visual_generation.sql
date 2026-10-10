create table if not exists visual_corpus_asset(
 id text primary key, asset_uri text not null, tradition text not null, region text, community text,
 scale text not null, rights_approved boolean not null default false, rights_note text not null,
 source_uri text, tags jsonb not null default '[]', family_id text, split text not null check(split in('train','validation','holdout')),
 created_at timestamptz not null default now(),
 check(tradition<>'indigenous-north-american' or community is not null or region is not null),
 check(rights_approved or split<>'train')
);
create table if not exists ornament_alphabet_family(
 id text primary key, tradition text not null, letter char(1) not null check(letter between 'A' and 'Z'),
 name text not null, asset_ids jsonb not null default '[]', grammar_tags jsonb not null default '[]',
 region text, community text, unique(tradition,letter),
 check(tradition<>'indigenous-north-american' or community is not null or region is not null)
);
create table if not exists visual_generation_run(
 id uuid primary key default gen_random_uuid(), model text not null, seed text not null, request jsonb not null,
 status text not null default 'candidate', created_at timestamptz not null default now()
);
create table if not exists visual_generation_candidate(
 id text primary key, run_id uuid not null references visual_generation_run(id) on delete cascade,
 image_uri text not null, maps jsonb not null default '{}', provenance jsonb not null,
 nearest_source_id text, similarity double precision, novelty_passed boolean not null default false,
 manufacturing jsonb not null default '{}', created_at timestamptz not null default now()
);
create index if not exists visual_corpus_asset_tradition_split_idx on visual_corpus_asset(tradition,split);
create index if not exists visual_candidate_run_idx on visual_generation_candidate(run_id);
