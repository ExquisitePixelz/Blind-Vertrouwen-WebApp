-- Text length limits (ARCHITECTURE.md, Phase 4 known gap 1; owner decision
-- 2026-09-27). Without them a member could paste megabytes into a field and
-- fill the free database. The website has the same limits (src/lib/limits.ts).
--
-- * names: 100 characters
-- * one-line fields: 500
-- * notes and descriptions: 100,000 (about 15-20 pages)

-- Names: 100
alter table public.profiles add constraint profiles_display_name_length check (char_length(display_name) <= 100);
alter table public.worlds add constraint worlds_name_length check (char_length(name) <= 100);
alter table public.campaigns add constraint campaigns_name_length check (char_length(name) <= 100);
alter table public.gods add constraint gods_slug_length check (char_length(slug) <= 100);
alter table public.gods add constraint gods_name_length check (char_length(name) <= 100);
alter table public.characters add constraint characters_name_length check (char_length(name) <= 100);
alter table public.characters add constraint characters_player_length check (char_length(player) <= 100);
alter table public.piety_tracks add constraint piety_tracks_custom_source_name_length check (char_length(custom_source_name) <= 100);
alter table public.inventory_items add constraint inventory_items_name_length check (char_length(name) <= 100);
alter table public.quests add constraint quests_title_length check (char_length(title) <= 100);

-- One-line fields: 500
alter table public.campaigns add constraint campaigns_subtitle_length check (char_length(subtitle) <= 500);
alter table public.gods add constraint gods_epithet_length check (char_length(epithet) <= 500);
alter table public.gods add constraint gods_alignment_length check (char_length(alignment) <= 500);
alter table public.gods add constraint gods_domains_length check (char_length(domains) <= 500);
alter table public.gods add constraint gods_symbol_length check (char_length(symbol) <= 500);
alter table public.gods add constraint gods_image_path_length check (char_length(image_path) <= 500);
alter table public.characters add constraint characters_class_level_length check (char_length(class_level) <= 500);
alter table public.characters add constraint characters_image_path_length check (char_length(image_path) <= 500);
alter table public.sessions add constraint sessions_title_length check (char_length(title) <= 500);
alter table public.quests add constraint quests_giver_length check (char_length(giver) <= 500);
alter table public.quests add constraint quests_location_length check (char_length(location) <= 500);
alter table public.quest_objectives add constraint quest_objectives_text_length check (char_length(text) <= 500);
alter table public.quest_rewards add constraint quest_rewards_text_length check (char_length(text) <= 500);

-- Notes and descriptions: 100,000
alter table public.gods add constraint gods_notes_length check (char_length(notes) <= 100000);
alter table public.piety_tracks add constraint piety_tracks_custom_source_rules_length check (char_length(custom_source_rules) <= 100000);
alter table public.sessions add constraint sessions_notes_length check (char_length(notes) <= 100000);
alter table public.characters add constraint characters_backstory_length check (char_length(backstory) <= 100000);
alter table public.character_private add constraint character_private_notes_length check (char_length(notes) <= 100000);
alter table public.inventory_items add constraint inventory_items_description_length check (char_length(description) <= 100000);
alter table public.quests add constraint quests_description_length check (char_length(description) <= 100000);
