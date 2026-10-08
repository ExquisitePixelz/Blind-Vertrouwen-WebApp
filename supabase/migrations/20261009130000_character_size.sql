-- Character size (owner decision, 2026-10-09, section 1.8): the carrying
-- capacity follows it. Medium is the default, so no capacity changes for
-- existing characters. The owner and the DM change it, like the rest of the
-- character (the existing characters policies).

alter table public.characters
  add column size text not null default 'medium'
    constraint characters_size_valid check (size in ('tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'));
