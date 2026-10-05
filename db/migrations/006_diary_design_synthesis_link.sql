-- P4 Diaries: trace approved design versions back to synthesis candidates.
-- Additive only. Does not modify canonical glyph geometry or knowledge evidence.

create table if not exists design_synthesis_link (
  design_id uuid not null,
  design_version integer not null,
  candidate_id uuid not null references synthesis_candidate(id),
  manifest_sha256 text not null check (manifest_sha256 ~ '^[a-f0-9]{64}$'),
  linked_at timestamptz not null default now(),
  primary key (design_id, design_version),
  unique (candidate_id, design_id, design_version),
  foreign key (design_id, design_version)
    references design_version(design_id, version) on delete cascade
);

create table if not exists diary_review_gate (
  design_id uuid not null,
  design_version integer not null,
  human_approved boolean not null default false,
  cultural_review text not null default 'pending'
    check (cultural_review in ('not-required','pending','approved','rejected')),
  originality_review text not null default 'pending'
    check (originality_review in ('pending','approved','rejected')),
  physical_validation text not null default 'pending'
    check (physical_validation in ('pending','approved','rejected')),
  reviewed_at timestamptz,
  notes text,
  primary key (design_id, design_version),
  foreign key (design_id, design_version)
    references design_version(design_id, version) on delete cascade
);

create index if not exists design_synthesis_candidate_idx
  on design_synthesis_link(candidate_id);
