import { useRef, useState } from 'react'
import { ConfirmDialog, PickDialog } from './Dialog'
import type { Campaign } from '../lib/campaigns'
import type { RevealTable } from '../lib/reveals'
import { must, supabase } from '../lib/supabase'

/**
 * Reveal (DM): with one campaign left that does not see it, a confirm
 * dialog; with more, first a pick list. A reveal can never be undone.
 */
export function RevealDialogs({
  where,
  id,
  name,
  hiddenFrom,
  onDone,
  onClose,
}: {
  where: RevealTable
  id: string
  name: string
  hiddenFrom: Campaign[]
  onDone: () => void
  onClose: () => void
}) {
  const [to, setTo] = useState<Campaign | null>(hiddenFrom.length === 1 ? hiddenFrom[0] : null)
  // A pick closes the list too; only Cancel ends the flow.
  const picked = useRef(false)

  if (!to) {
    return (
      <PickDialog<Campaign>
        title="Reveal to which campaign?"
        options={hiddenFrom.map((c) => ({ value: c, label: c.name }))}
        onClose={() => {
          if (!picked.current) onClose()
        }}
        onPick={(c) => {
          picked.current = true
          setTimeout(() => setTo(c))
        }}
      />
    )
  }
  return (
    <ConfirmDialog
      title="Reveal"
      message={`Players in ${to.name} will see “${name}” and can edit it. A revealed entry can never be hidden again. DM secrets and stats stay yours.`}
      confirmLabel="Reveal"
      onClose={onClose}
      onConfirm={async () => {
        must(await supabase.from(where.table).insert({ [where.column]: id, campaign_id: to.id }))
        onDone()
      }}
    />
  )
}
