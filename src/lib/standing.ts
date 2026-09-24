// The 7-step standing scale (ARCHITECTURE.md 1.3 A6), used for god-to-god
// relationships and a god's attitude toward the party.

export const NEUTRAL = 4

export const STANDING = [
  { value: 1, label: 'Sworn Enemy', text: '#E0675C', bar: '#C0463C' },
  { value: 2, label: 'Enemy', text: '#D98A5C', bar: '#C8703F' },
  { value: 3, label: 'Unfriendly', text: '#BFA878', bar: '#A89060' },
  { value: 4, label: 'Neutral', text: '#8E8C87', bar: '#5E5D5A' },
  { value: 5, label: 'Friendly', text: '#95BE86', bar: '#7DA56E' },
  { value: 6, label: 'Ally', text: '#63BD95', bar: '#4FA37F' },
  { value: 7, label: 'Greatest Ally', text: '#D4AF37', bar: '#D4AF37' },
] as const

export function clampStanding(value: number) {
  return Math.min(7, Math.max(1, Math.round(value)))
}

export function standing(value: number) {
  return STANDING[clampStanding(value) - 1]
}
