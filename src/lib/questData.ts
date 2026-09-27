import { byName } from './gods'
import { must, supabase } from './supabase'

export type CharacterName = { id: string; name: string }

/** The campaign's live characters, for Character quests (1.9). */
export async function loadCharacterNames(campaignId: string): Promise<CharacterName[]> {
  const rows = must(
    await supabase.from('characters').select('id, name').eq('campaign_id', campaignId).is('deleted_at', null),
  ) as CharacterName[]
  return rows.sort(byName)
}
