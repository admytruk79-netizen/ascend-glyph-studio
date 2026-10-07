alter table corpus_canonical add column if not exists review_state text not null default 'pending';
alter table corpus_canonical add column if not exists reviewer_note text;
alter table corpus_canonical add column if not exists reviewed_at timestamptz;
create index if not exists corpus_canonical_review_idx on corpus_canonical(review_state, support desc);