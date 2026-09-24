-- The world of Theros and its 15 gods (ARCHITECTURE.md 1.3 C2).
-- Real data, so it lives in a migration (seed.sql only runs locally).
-- All party attitudes start at Neutral (4); relationships start empty (= Neutral).
-- dm_user_id is set afterwards by the owner, once he has logged in.

insert into public.worlds (name) values ('Theros');

insert into public.gods (world_id, owner_id, slug, name, epithet, alignment, domains, symbol)
select w.id, null, g.slug, g.name, g.epithet, g.alignment, g.domains, g.symbol
from public.worlds w
cross join (values
  ('athreos',   'Athreos',   'God of Passage',    'LE', 'Death, Grave',           'Crescent moon'),
  ('ephara',    'Ephara',    'God of the Polis',  'LN', 'Knowledge, Light',       'Urn pouring water'),
  ('erebos',    'Erebos',    'God of the Dead',   'NE', 'Death, Trickery',        'Serene face'),
  ('heliod',    'Heliod',    'God of the Sun',    'LG', 'Light',                  'Laurel crown'),
  ('iroas',     'Iroas',     'God of Victory',    'CG', 'War',                    'Four-winged helmet'),
  ('karametra', 'Karametra', 'God of Harvests',   'NG', 'Life, Nature',           'Cornucopia'),
  ('keranos',   'Keranos',   'God of Storms',     'CN', 'Knowledge, Tempest',     'Blue eye'),
  ('klothys',   'Klothys',   'God of Destiny',    'N',  'Knowledge, War',         'Drop spindle'),
  ('kruphix',   'Kruphix',   'God of Horizons',   'N',  'Knowledge, Trickery',    'Eight-pointed star'),
  ('mogis',     'Mogis',     'God of Slaughter',  'CE', 'War',                    'Four-horned bull''s head'),
  ('nylea',     'Nylea',     'God of the Hunt',   'NG', 'Nature',                 'Four arrows'),
  ('pharika',   'Pharika',   'God of Affliction', 'NE', 'Death, Knowledge, Life', 'Snakes'),
  ('phenax',    'Phenax',    'God of Deception',  'CN', 'Trickery',               'Winged golden mask'),
  ('purphoros', 'Purphoros', 'God of the Forge',  'CN', 'Forge, Knowledge',       'Double crest'),
  ('thassa',    'Thassa',    'God of the Sea',    'N',  'Knowledge, Tempest',     'Waves')
) as g (slug, name, epithet, alignment, domains, symbol)
where w.name = 'Theros';
