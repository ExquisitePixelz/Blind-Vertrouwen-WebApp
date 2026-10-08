/** What a character believes in (1.1): a god, a custom faith, or nothing. */
export type Faith =
  | { kind: 'god'; godId: string }
  | { kind: 'custom'; name: string; rules: string }
  | { kind: 'none' }

/** Ready to save: a god, a custom faith with a name, or None. */
export const faithReady = (faith: Faith | null) =>
  faith !== null && (faith.kind !== 'custom' || faith.name.trim() !== '')

/** The faith as parameters for create_character and change_faith. */
export function faithParams(faith: Faith) {
  return {
    p_god_id: faith.kind === 'god' ? faith.godId : null,
    p_custom_name: faith.kind === 'custom' ? faith.name.trim() : null,
    p_custom_rules: faith.kind === 'custom' ? faith.rules.trim() : null,
  }
}
