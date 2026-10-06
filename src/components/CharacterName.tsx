import { isDead, type Character } from '../lib/character'

type Named = Pick<Character, 'name' | 'hp_cur' | 'death_saves_success' | 'death_saves_failure'> & { exhaustion?: number }

/** A character's name; crossed out with a red Dead tag after three failed death saves or at exhaustion 6 (1.10, 1.12). */
export function CharacterName({ c }: { c: Named }) {
  if (!isDead(c)) return <>{c.name}</>
  return (
    <>
      <s>{c.name}</s>
      <span className="chip dead">Dead</span>
    </>
  )
}
