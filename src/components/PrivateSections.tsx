import { useEffect, useState } from 'react'
import { MarkdownNotes } from './MarkdownNotes'
import { NumberDialog } from './Dialog'
import { ConflictBanner } from './SaveState'
import { Inventory } from './Inventory'
import { COINS, PRIVATE_COLUMNS, addCoins, setCoins, spendCoins, type CharacterPrivate, type Coin } from '../lib/inventory'
import { useRowSaver, type SaveStatus } from '../lib/saver'
import { must, supabase } from '../lib/supabase'
import { useLoad } from '../lib/useLoad'

/**
 * The parts of a character sheet only its player and the DM see (1.8):
 * private notes, coins and inventory. Other players never get these rows
 * from the server (RLS); the sheet does not render this for them either.
 */
export function PrivateSections({
  characterId,
  campaignId,
  strength,
  onStatus,
}: {
  characterId: string
  campaignId: string
  strength: number
  onStatus: (status: SaveStatus) => void
}) {
  const [coin, setCoin] = useState<{ field: Coin; label: string } | null>(null)

  const row = useLoad(async () => {
    return must(
      await supabase
        .from('character_private')
        .select(PRIVATE_COLUMNS)
        .eq('character_id', characterId)
        .is('deleted_at', null)
        .maybeSingle(),
    ) as CharacterPrivate | null
  }, [characterId])

  const saver = useRowSaver<CharacterPrivate>('character_private', row.data ?? undefined, (saved) =>
    row.mutate(() => saved),
  )
  const p = saver.view

  useEffect(() => onStatus(saver.status), [saver.status, onStatus])

  if (row.error) return <p className="error">{row.error}</p>
  if (!p) return null

  return (
    <>
      {saver.status === 'conflict' && (
        <ConflictBanner onKeepMine={saver.keepMine} onUseTheirs={() => saver.discardMine(row.reload)} />
      )}

      <MarkdownNotes
        title="Private notes"
        hint="Only the player and the DM can see this."
        notes={p.notes}
        onChange={(notes) => saver.change({ notes })}
        onBlur={() => void saver.flush()}
        placeholder="Secrets, plans, things to remember…"
        emptyText="Nothing written yet. Tap Edit to start."
      />

      <section>
        <h2>Coins</h2>
        <div className="tiles coins">
          {COINS.map(({ field, label }) => (
            <button key={field} type="button" className="tappable tile" onClick={() => setCoin({ field, label })}>
              <span className="muted small">{label}</span>
              <span className="tile-value">{p[field]}</span>
            </button>
          ))}
        </div>
      </section>

      <Inventory characterId={characterId} campaignId={campaignId} strength={strength} coins={p} />

      {coin && (
        <NumberDialog
          title={`${coin.label} ${p[coin.field]}`}
          initial={0}
          maxDigits={6}
          onClose={() => setCoin(null)}
          actions={[
            { label: 'Add', onApply: (x) => saver.change({ [coin.field]: addCoins(p[coin.field], x) }, true) },
            {
              label: 'Spend',
              className: 'danger',
              onApply: (x) => saver.change({ [coin.field]: spendCoins(p[coin.field], x) }, true),
            },
            { label: 'Set', className: 'secondary', onApply: (x) => saver.change({ [coin.field]: setCoins(x) }, true) },
          ]}
        />
      )}
    </>
  )
}
