create table if not exists engine_runtime (
  id text primary key,
  enabled boolean not null default true,
  batch_size integer not null default 12 check (batch_size between 1 and 32),
  population integer not null default 64 check (population between 8 and 256),
  generations integer not null default 5 check (generations between 1 and 12),
  updated_at timestamptz not null default now()
);
insert into engine_runtime(id,enabled,batch_size,population,generations)
values ('tesseract-v2',true,12,64,5)
on conflict(id) do update set enabled=excluded.enabled,batch_size=excluded.batch_size,population=excluded.population,generations=excluded.generations,updated_at=now();
create index if not exists synthesis_run_status_created_idx on synthesis_run(status,created_at);
