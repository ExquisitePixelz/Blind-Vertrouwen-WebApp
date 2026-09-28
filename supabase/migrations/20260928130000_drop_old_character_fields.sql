-- Phase 8 step 9 (ARCHITECTURE.md 1.10 and 4): remove the fields the
-- automatic sheet replaced. The website stopped reading them in steps 3
-- and 8, before this runs.
--
-- * class_level: replaced by classes (its length check goes with it).
-- * ac, passive_perception: always calculated now, never typed in.

alter table public.characters
  drop column class_level,
  drop column ac,
  drop column passive_perception;
