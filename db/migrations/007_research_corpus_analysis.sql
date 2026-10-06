-- Analysed corpus: structural measurements per object (never the image), the split it belongs to,
-- and the tradition style profiles built from them. Additive.
create table if not exists research_corpus_analysis (
  id text primary key,
  source_key text not null,
  tradition text,
  culture text,
  region text,
  date_label text,
  title text,
  source_url text,
  image_url text,
  split text check (split in ('train','validation','holdout')),
  kind text,
  frieze_groups text[] not null default '{}',
  wallpaper_rotation integer,
  rosette text,
  features jsonb not null default '{}'::jsonb,
  deconstruction jsonb,
  dhash text,
  analyzer_version text,
  analyzed_at timestamptz,
  imported_at timestamptz not null default now()
);
create index if not exists research_analysis_tradition_idx on research_corpus_analysis(tradition);
create index if not exists research_analysis_kind_idx on research_corpus_analysis(kind);
create index if not exists research_analysis_split_idx on research_corpus_analysis(split);

create table if not exists research_style_profile (
  tradition text not null,
  built_at timestamptz not null,
  n integer not null,
  profile jsonb not null,
  primary key (tradition, built_at)
);
