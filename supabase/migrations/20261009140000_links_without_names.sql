-- Links without names (owner decision, 2026-10-09, section 1.13): a link in
-- the notes was saved as [Ilona](npc:3f2a…), so the name reached every
-- reader, also when the screen showed [hidden]. Since 0.12.10-alpha the
-- website saves [](npc:3f2a…) and shows names from the link targets. This
-- removes the names from the links already saved, in every notes column.
-- Web links ([map](https://…)) stay as they are. Every changed row gets a new
-- version, so the owner runs db push when nobody is editing.

create function private.strip_link_names(p_text text)
returns text
language sql immutable set search_path = ''
as $f$
  select regexp_replace(
    p_text,
    $re$\[(?:\\.|[^]\\])*\]\((character|god|npc|place|faction|lore|creature|item):([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\)$re$,
    '[](\1:\2)',
    'g'
  );
$f$;

-- The pattern checks itself before it touches any data.
do $$
declare
  v_id constant text := '3f2a8c4e-1b2d-4e5f-8a9b-0c1d2e3f4a5b';
begin
  assert private.strip_link_names('We met [Ilona](npc:' || v_id || ').')
    = 'We met [](npc:' || v_id || ').', 'a link with a name';
  assert private.strip_link_names('[The \[Masked\] One](god:' || v_id || ')')
    = '[](god:' || v_id || ')', 'a name with escaped brackets';
  assert private.strip_link_names('[A](character:' || v_id || ') and [B](place:' || v_id || ')')
    = '[](character:' || v_id || ') and [](place:' || v_id || ')', 'two links';
  assert private.strip_link_names('[](lore:' || v_id || ')') = '[](lore:' || v_id || ')', 'already without a name';
  assert private.strip_link_names('See [the map](https://example.com) and [x](town:' || v_id || ').')
    = 'See [the map](https://example.com) and [x](town:' || v_id || ').', 'web links and unknown kinds stay';
  assert private.strip_link_names('[Ilona](npc:not-an-id)') = '[Ilona](npc:not-an-id)', 'not an ID';
  assert private.strip_link_names('') = '', 'empty';
end;
$$;

-- Every notes column that can hold links (1.13, 1.14, 2026-10-09).
do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('characters', 'backstory'),
      ('character_private', 'notes'),
      ('sessions', 'notes'),
      ('quests', 'description'),
      ('npcs', 'description'),
      ('npc_secrets', 'secrets'),
      ('npc_secrets', 'actions'),
      ('world_entries', 'description'),
      ('world_entry_secrets', 'secrets'),
      ('world_entry_secrets', 'actions'),
      ('inventory_items', 'description'),
      ('gods', 'notes'),
      ('piety_tracks', 'custom_source_rules')
    ) as v(tbl, col)
  loop
    execute format(
      'update public.%1$I set %2$I = private.strip_link_names(%2$I) where %2$I is distinct from private.strip_link_names(%2$I)',
      t.tbl, t.col
    );
  end loop;
end;
$$;

drop function private.strip_link_names(text);
