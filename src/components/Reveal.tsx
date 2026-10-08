import { useRef, useState } from 'react'
import { ConfirmDialog, PickDialog } from './Dialog'
import type { Campaign } from '../lib/campaigns'
import type { RevealTable } from '../lib/reveals'
import { must, supabase } from '../lib/supabase'

/**
 * Reveal (DM): with one campaign left that does not see it, a confirm
 * dialog; with more, first a pick list.
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
  return (
    <PickThenConfirm
      campaigns={hiddenFrom}
      pickTitle="Reveal to which campaign?"
      title="Reveal"
      message={(to) =>
        `Players in ${to.name} will see “${name}” and can edit it. You can hide it again later. DM secrets and stats stay yours.`
      }
      confirmLabel="Reveal"
      onClose={onClose}
      onConfirm={async (to) => {
        must(await supabase.from(where.table).insert({ [where.column]: id, campaign_id: to.id }))
        onDone()
      }}
    />
  )
}

/**
 * Hide again (DM, owner 2026-10-08): takes a reveal back, with a pick list
 * first when more than one campaign sees it. What players read stays read.
 */
export function HideDialogs({
  where,
  id,
  name,
  shownTo,
  onDone,
  onClose,
}: {
  where: RevealTable
  id: string
  name: string
  shownTo: Campaign[]
  onDone: () => void
  onClose: () => void
}) {
  return (
    <PickThenConfirm
      campaigns={shownTo}
      pickTitle="Hide from which campaign?"
      title="Hide again"
      message={(from) =>
        `Players in ${from.name} will no longer see “${name}”. What they already read, they may remember.`
      }
      confirmLabel="Hide"
      onClose={onClose}
      onConfirm={async (from) => {
        must(await supabase.from(where.table).delete().eq(where.column, id).eq('campaign_id', from.id))
        onDone()
      }}
    />
  )
}

/** With one campaign, a confirm dialog; with more, first a pick list. */
function PickThenConfirm({
  campaigns,
  pickTitle,
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  campaigns: Campaign[]
  pickTitle: string
  title: string
  message: (c: Campaign) => string
  confirmLabel: string
  onConfirm: (c: Campaign) => Promise<void>
  onClose: () => void
}) {
  const [to, setTo] = useState<Campaign | null>(campaigns.length === 1 ? campaigns[0] : null)
  // A pick closes the list too; only Cancel ends the flow.
  const picked = useRef(false)

  if (!to) {
    return (
      <PickDialog<Campaign>
        title={pickTitle}
        options={campaigns.map((c) => ({ value: c, label: c.name }))}
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
    <ConfirmDialog title={title} message={message(to)} confirmLabel={confirmLabel} onClose={onClose} onConfirm={() => onConfirm(to)} />
  )
}
