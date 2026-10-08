create table if not exists research_visual_embedding (
  object_id text not null references research_corpus_object(id) on delete cascade,
  model text not null,
  split text check (split in ('train','validation','holdout')),
  tradition text,
  embedding vector(512) not null,
  built_at timestamptz not null default now(),
  primary key(object_id,model)
);
create index if not exists research_visual_embedding_hnsw_cosine
  on research_visual_embedding using hnsw (embedding vector_cosine_ops);
create index if not exists research_visual_embedding_split_idx
  on research_visual_embedding(split,tradition);