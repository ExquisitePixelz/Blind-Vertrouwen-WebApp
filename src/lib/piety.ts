// Piety milestones (owner decision 2026-09-24; Unity spec 1.3 B5).
// Players are rewarded at 3, 10, 25 and 50. The bar has four equal-width
// segments: 0–3, 3–10, 10–25 and 25–50.

export const MILESTONES = [3, 10, 25, 50] as const
export const MAX_PIETY = 50

export type Segment = { milestone: number; fill: number; reached: boolean }

export function segments(score: number): Segment[] {
  return MILESTONES.map((milestone, i) => {
    const from = i === 0 ? 0 : MILESTONES[i - 1]
    const fill = Math.min(1, Math.max(0, (score - from) / (milestone - from)))
    return { milestone, fill, reached: score >= milestone }
  })
}

/** "0 / 50 · next at 3", or "50 / 50 · all milestones reached". */
export function caption(score: number) {
  const next = MILESTONES.find((m) => score < m)
  return `${score} / ${MAX_PIETY} · ${next === undefined ? 'all milestones reached' : `next at ${next}`}`
}

/** Scores stay between 0 and 50, like the Unity app. */
export const clampPiety = (score: number) => Math.min(MAX_PIETY, Math.max(0, Math.trunc(score)))
