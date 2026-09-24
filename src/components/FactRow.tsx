/** A label/value row in a card. Tappable when `onClick` is given; an empty value shows "—". */
export function FactRow({
  label,
  value,
  muted,
  onClick,
}: {
  label: string
  value: string
  muted?: boolean
  onClick?: () => void
}) {
  const content = (
    <>
      <span className="muted">{label}</span>
      <span className={muted ? 'muted' : undefined}>{value || '—'}</span>
    </>
  )
  return onClick ? (
    <button type="button" className="fact-row" onClick={onClick}>
      {content}
    </button>
  ) : (
    <div className="fact-row">{content}</div>
  )
}
