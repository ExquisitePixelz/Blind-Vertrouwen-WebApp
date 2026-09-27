// The Quest Journal (ARCHITECTURE.md 1.9). Only the DM writes; players read
// what the database lets them see.

export type QuestKind = 'main' | 'side' | 'character'
export type QuestStatus = 'inactive' | 'active' | 'completed' | 'failed'

export type Quest = {
  id: string
  version: number
  campaign_id: string
  /** 'dm' while hidden, 'members' once revealed (never back). */
  audience: 'dm' | 'members'
  kind: QuestKind
  character_id: string | null
  title: string
  description: string
  giver: string
  location: string
  status: QuestStatus
  created_at: string
}

export const QUEST_COLUMNS =
  'id, version, campaign_id, audience, kind, character_id, title, description, giver, location, status, created_at'

export type Objective = {
  id: string
  version: number
  quest_id: string
  text: string
  done: boolean
  optional: boolean
  sort_order: number
}

export const OBJECTIVE_COLUMNS = 'id, version, quest_id, text, done, optional, sort_order'

export type Reward = {
  id: string
  version: number
  quest_id: string
  text: string
  /** 'members' = visible to players, 'dm' = hidden. */
  audience: 'dm' | 'members'
  sort_order: number
}

export const REWARD_COLUMNS = 'id, version, quest_id, text, audience, sort_order'

export const KINDS: { value: QuestKind; label: string }[] = [
  { value: 'main', label: 'Main quest' },
  { value: 'side', label: 'Side quest' },
  { value: 'character', label: 'Character quest' },
]

export const STATUSES: { value: QuestStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
]

export const kindLabel = (kind: QuestKind) => KINDS.find((k) => k.value === kind)!.label
export const statusLabel = (status: QuestStatus) => STATUSES.find((s) => s.value === status)!.label

/** "Character quest · Kit", or just "Character quest" when the character is gone. */
export function kindText(quest: Pick<Quest, 'kind' | 'character_id'>, characterName: (id: string) => string | undefined) {
  const name = quest.kind === 'character' && quest.character_id ? characterName(quest.character_id) : undefined
  return name ? `${kindLabel(quest.kind)} · ${name}` : kindLabel(quest.kind)
}

const kindRank = (kind: QuestKind) => KINDS.findIndex((k) => k.value === kind)

/** Within a group: Main, then Side, then Character, then newest first. */
export function byQuestOrder(a: Pick<Quest, 'kind' | 'created_at'>, b: Pick<Quest, 'kind' | 'created_at'>) {
  return kindRank(a.kind) - kindRank(b.kind) || b.created_at.localeCompare(a.created_at)
}

export type QuestGroup<Q> = { key: 'hidden' | QuestStatus; label: string; quests: Q[]; folded: boolean }

/**
 * The list's groups (1.9): Hidden (only the DM has any), then Active,
 * Inactive, Completed and Failed. Empty groups are left out. Completed and
 * Failed start folded.
 */
export function groupQuests<Q extends Pick<Quest, 'audience' | 'status' | 'kind' | 'created_at'>>(quests: Q[]): QuestGroup<Q>[] {
  const groups: QuestGroup<Q>[] = [
    { key: 'hidden', label: 'Hidden', quests: quests.filter((q) => q.audience === 'dm'), folded: false },
    ...STATUSES.map((s) => ({
      key: s.value,
      label: s.label,
      quests: quests.filter((q) => q.audience === 'members' && q.status === s.value),
      folded: s.value === 'completed' || s.value === 'failed',
    })),
  ]
  return groups.filter((g) => g.quests.length).map((g) => ({ ...g, quests: [...g.quests].sort(byQuestOrder) }))
}

/** Same order as the database's objective_visible: sort_order, then id. */
function bySortOrder(a: Pick<Objective, 'sort_order' | 'id'>, b: Pick<Objective, 'sort_order' | 'id'>) {
  return a.sort_order - b.sort_order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
}

/** Main objectives in order, then the optional ones in order. */
export function splitObjectives<O extends Pick<Objective, 'sort_order' | 'id' | 'optional'>>(objectives: O[]) {
  const sorted = [...objectives].sort(bySortOrder)
  return { main: sorted.filter((o) => !o.optional), optional: sorted.filter((o) => o.optional) }
}

/**
 * Which objectives players can see (1.9): optional ones, ticked-off ones,
 * and the first main objective not yet ticked off. The database enforces
 * this; the DM's screen uses it to mark the rest "Hidden".
 */
export function objectivesVisibleToPlayers<O extends Pick<Objective, 'sort_order' | 'id' | 'optional' | 'done'>>(
  objectives: O[],
): Set<string> {
  const visible = new Set<string>()
  let reachedOpen = false
  for (const o of splitObjectives(objectives).main) {
    if (o.done || !reachedOpen) visible.add(o.id)
    if (!o.done) reachedOpen = true
  }
  for (const o of objectives) if (o.optional) visible.add(o.id)
  return visible
}

/** The first main objective not ticked off: the card's "current objective". */
export function currentObjective<O extends Pick<Objective, 'sort_order' | 'id' | 'optional' | 'done'>>(objectives: O[]) {
  return splitObjectives(objectives).main.find((o) => !o.done)
}

/** "+ a hidden reward", "+ 2 hidden rewards", or nothing. */
export function hiddenRewardsText(count: number): string | null {
  if (count <= 0) return null
  return count === 1 ? '+ a hidden reward' : `+ ${count} hidden rewards`
}

/**
 * Moving an objective or reward up or down within its list: the two rows
 * whose sort_order values swap, or null at the ends.
 */
export function swapWith<R extends Pick<Objective, 'id'>>(list: R[], id: string, direction: -1 | 1): [R, R] | null {
  const index = list.findIndex((r) => r.id === id)
  const other = list[index + direction]
  return index < 0 || !other ? null : [list[index], other]
}
