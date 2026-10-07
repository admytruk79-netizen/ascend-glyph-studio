-- Training on museum imagery (scripts/train/train-tesseract.mts): the learned model and per-image tags.
create table if not exists learned_model (
  id text primary key,
  built_at timestamptz not null default now(),
  body jsonb not null                       -- traditions/regions: tag mix, palette, density, motif codebook (averaged outlines)
);
create table if not exists research_image_tag (
  object_id text primary key,              -- research_corpus_object.id
  tradition text not null,
  region text,                             -- Ukrainian region from catalogue text, when stated
  ornament_p numeric not null,             -- CLIP probability that the image shows ornament (kept ≥ 0.6)
  tags jsonb not null,                     -- motif type mix: floral, animals, tree, cross, geometric, amorphous, figures
  palette jsonb not null,                  -- thread colours with shares (ground excluded)
  ground text,
  density numeric,
  n_elements int,
  model text not null,
  tagged_at timestamptz not null default now()
);
create index if not exists research_image_tag_tradition_idx on research_image_tag(tradition, region);
