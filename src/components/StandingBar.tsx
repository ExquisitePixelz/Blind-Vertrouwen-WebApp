import { NEUTRAL, STANDING, standing } from '../lib/standing'

/**
 * Standing bar (1.3 A6): name on the left, label on the right in the value's
 * colour, and 7 steps. The lit steps run from Neutral to the value. Without
 * `onChange` it is read-only.
 */
export function StandingBar({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange?: (value: number) => void
}) {
  const current = standing(value)
  const low = Math.min(NEUTRAL, current.value)
  const high = Math.max(NEUTRAL, current.value)

  return (
    <div className="standing">
      <div className="standing-top">
        <span>{label}</span>
        <span style={{ color: current.text }}>{current.label}</span>
      </div>
      <div className="standing-steps">
        {STANDING.map((step) => {
          const lit = step.value >= low && step.value <= high
          const className = `standing-step${step.value === NEUTRAL ? ' neutral' : ''}`
          const style = lit ? { background: current.bar } : undefined
          return onChange ? (
            <button
              key={step.value}
              type="button"
              className={className}
              style={style}
              aria-label={`${label}: ${step.label}`}
              aria-pressed={step.value === current.value}
              onClick={() => onChange(step.value)}
            />
          ) : (
            <span key={step.value} className={className} style={style} />
          )
        })}
      </div>
    </div>
  )
}
