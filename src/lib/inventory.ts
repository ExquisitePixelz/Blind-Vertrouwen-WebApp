// Private notes, coins and inventory (ARCHITECTURE.md 1.8, 1.10).

import type { Size } from './character.ts'
import type { ArmorDex, ArmorKey, Bonus } from './sheet.ts'

export type CharacterPrivate = {
  id: string
  version: number
  character_id: string
  notes: string
  cp: number
  sp: number
  gp: number
  pp: number
}

export const PRIVATE_COLUMNS = 'id, version, character_id, notes, cp, sp, gp, pp'

export type Coin = 'cp' | 'sp' | 'gp' | 'pp'

/** No electrum (owner decision, 2026-09-25). */
export const COINS: { field: Coin; label: string }[] = [
  { field: 'cp', label: 'CP' },
  { field: 'sp', label: 'SP' },
  { field: 'gp', label: 'GP' },
  { field: 'pp', label: 'PP' },
]

export const MAX_COINS = 999999

export type Item = {
  id: string
  version: number
  character_id: string
  name: string
  quantity: number
  weight: number
  description: string
  equipped: boolean
  attuned: boolean
  attunement_required: boolean
  armor: ArmorKey | null
  /** The item's own armor values (1.10, 2026-10-09); empty: as the armor table. */
  armor_ac: number | null
  armor_dex: ArmorDex | null
  armor_stealth: boolean | null
  effects: Bonus[]
}

export const ITEM_COLUMNS = 
  'id, version, character_id, name, quantity, weight, description, equipped, attuned, attunement_required, armor, armor_ac, armor_dex, armor_stealth, effects'

export const MAX_QUANTITY = 9999
export const MAX_WEIGHT = 99999.99
export const MAX_ATTUNED = 3

const clampCoins = (value: number) => Math.min(MAX_COINS, Math.max(0, Math.trunc(value)))

export const addCoins = (current: number, amount: number) => clampCoins(current + Math.max(0, amount))

/** Spending never goes below 0. */
export const spendCoins = (current: number, amount: number) => clampCoins(current - Math.max(0, amount))

export const setCoins = (amount: number) => clampCoins(amount)

/**
 * A weight typed by the user: "0.5" and "0,5" both work (Dutch keyboards).
 * Rounded to 2 decimals. Null when it is not a number or out of range.
 */
export function parseWeight(text: string): number | null {
  const clean = text.trim().replace(',', '.')
  if (clean === '') return 0
  if (!/^\d*\.?\d*$/.test(clean) || clean === '.') return null
  const value = Math.round(Number(clean) * 100) / 100
  return value <= MAX_WEIGHT ? value : null
}

/** "10", "0.5", "2.25": no trailing zeros. */
export const formatWeight = (lb: number) => String(Math.round(lb * 100) / 100)

/** Items sorted by name, case-insensitive. */
export const byItemName = (a: Item, b: Item) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })

/** 50 coins weigh a pound (PHB). */
export const COINS_PER_LB = 50

/** Total carried: quantity × weight of every item, plus the coins. */
export function carriedWeight(items: Pick<Item, 'quantity' | 'weight'>[], coins: Pick<CharacterPrivate, Coin>): number {
  const itemWeight = items.reduce((sum, i) => sum + i.quantity * Number(i.weight), 0)
  const coinCount = coins.cp + coins.sp + coins.gp + coins.pp
  return Math.round((itemWeight + coinCount / COINS_PER_LB) * 100) / 100
}

/** STR × this many lb per size (PHB): half for Tiny, double for each size above Medium. */
const LB_PER_STR: Record<Size, number> = { tiny: 7.5, small: 15, medium: 15, large: 30, huge: 60, gargantuan: 120 }

/** Carrying capacity: STR × 15 lb for a Small or Medium character (PHB), changed by size (1.8). */
export const carryingCapacity = (strength: number, size: Size = 'medium') => strength * LB_PER_STR[size]

/** Only items that require attunement count toward the limit of 3 (1.10). */
export const attunedCount = (items: Pick<Item, 'attuned' | 'attunement_required'>[]) =>
  items.filter((i) => i.attuned && i.attunement_required).length
