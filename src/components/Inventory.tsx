import { useState } from 'react'
import { ConfirmDialog, Dialog, NumberDialog, PromptDialog } from './Dialog'
import { FactRow } from './FactRow'
import { ConflictBanner, SaveIndicator } from './SaveState'
import {
  ITEM_COLUMNS,
  MAX_ATTUNED,
  MAX_QUANTITY,
  attunedCount,
  byItemName,
  carriedWeight,
  carryingCapacity,
  formatWeight,
  parseWeight,
  type CharacterPrivate,
  type Coin,
  type Item,
} from '../lib/inventory'
import { useRowSaver } from '../lib/saver'
import { must, supabase } from '../lib/supabase'
import { useLoad } from '../lib/useLoad'

/**
 * A character's inventory (1.8): only its player and the DM see it. Items
 * sorted by name, Add item, an editor per item, and the carried-weight and
 * attunement totals.
 */
export function Inventory({
  characterId,
  campaignId,
  strength,
  coins,
}: {
  characterId: string
  campaignId: string
  strength: number
  coins: Pick<CharacterPrivate, Coin>
}) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)

  const items = useLoad(async () => {
    const rows = must(
      await supabase.from('inventory_items').select(ITEM_COLUMNS).eq('character_id', characterId).is('deleted_at', null),
    ) as Item[]
    return rows.sort(byItemName)
  }, [characterId])

  const list = items.data ?? []
  const replace = (saved: Item) => items.mutate((all) => all?.map((i) => (i.id === saved.id ? saved : i)).sort(byItemName))
  const carried = carriedWeight(list, coins)
  const capacity = carryingCapacity(strength)
  const attuned = attunedCount(list)
  const current = list.find((i) => i.id === editing)

  return (
    <section>
      <div className="title-row">
        <h2>Inventory</h2>
        <button type="button" className="small-button" onClick={() => setAdding(true)}>
          Add item
        </button>
      </div>
      {items.error && <p className="error">{items.error}</p>}
      {items.data?.length === 0 && <p className="muted">No items yet.</p>}
      <ul className="list">
        {list.map((item) => {
          const rowWeight = item.quantity * Number(item.weight)
          return (
            <li key={item.id}>
              <button type="button" className="row row-button" onClick={() => setEditing(item.id)}>
                <div className="row-split">
                  <span>
                    <strong>{item.name}</strong>
                    {item.quantity !== 1 && <span className="muted"> ×{item.quantity}</span>}
                  </span>
                  {rowWeight > 0 && <span className="muted small nowrap">{formatWeight(rowWeight)} lb</span>}
                </div>
                {(item.equipped || item.attuned) && (
                  <div className="item-chips">
                    {item.equipped && <span className="chip">Equipped</span>}
                    {item.attuned && <span className="chip gold">Attuned</span>}
                  </div>
                )}
              </button>
            </li>
          )
        })}
      </ul>
      {items.data && (
        <p className="muted small inventory-totals">
          <span className={carried > capacity ? 'error' : undefined}>
            Carried {formatWeight(carried)} / {capacity} lb
          </span>
          {attuned > 0 && (
            <span className={attuned > MAX_ATTUNED ? 'error' : undefined}>
              Attuned {attuned} / {MAX_ATTUNED}
            </span>
          )}
        </p>
      )}

      {adding && (
        <PromptDialog
          title="New item"
          submitLabel="Add"
          onClose={() => setAdding(false)}
          onSubmit={async (name) => {
            const created = must(
              await supabase
                .from('inventory_items')
                .insert({ character_id: characterId, campaign_id: campaignId, name })
                .select(ITEM_COLUMNS)
                .single(),
            ) as Item
            items.mutate((all) => [...(all ?? []), created].sort(byItemName))
            setEditing(created.id)
          }}
        />
      )}
      {current && (
        <ItemEditor
          item={current}
          onSaved={replace}
          onReload={items.reload}
          onDeleted={() => items.mutate((all) => all?.filter((i) => i.id !== current.id))}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  )
}

type Sub = 'name' | 'quantity' | 'weight' | 'delete'

/**
 * One item. Taps save at once, the description 1 s after typing stops
 * (3.4). A field dialog replaces the editor while it is open, so only one
 * dialog is ever shown; the save hook stays mounted underneath.
 */
function ItemEditor({
  item,
  onSaved,
  onReload,
  onDeleted,
  onClose,
}: {
  item: Item
  onSaved: (item: Item) => void
  onReload: () => void
  onDeleted: () => void
  onClose: () => void
}) {
  const [sub, setSub] = useState<Sub | null>(null)
  const saver = useRowSaver<Item>('inventory_items', item, onSaved)
  const i = saver.view ?? item
  const back = () => setSub(null)
  const tap = (patch: Partial<Item>) => saver.change(patch, true)

  if (sub === 'name') {
    return <PromptDialog title="Name" initial={i.name} onClose={back} onSubmit={(name) => tap({ name })} />
  }
  if (sub === 'quantity') {
    return (
      <NumberDialog
        title="Quantity"
        initial={i.quantity}
        onClose={back}
        actions={[{ label: 'Set', onApply: (x) => tap({ quantity: Math.min(MAX_QUANTITY, Math.max(0, x)) }) }]}
      />
    )
  }
  if (sub === 'weight') {
    return <WeightDialog initial={Number(i.weight)} onClose={back} onSave={(weight) => tap({ weight })} />
  }
  if (sub === 'delete') {
    return (
      <ConfirmDialog
        title="Delete item"
        message={`${i.name} will be removed from the inventory.`}
        confirmLabel="Delete"
        onClose={back}
        onConfirm={async () => {
          // Send what was typed first, then throw away anything left over,
          // so no change to a deleted item waits in this browser forever.
          await saver.settle()
          must(await supabase.rpc('delete_item', { p_item_id: i.id }))
          saver.discardMine(() => {})
          onDeleted()
          onClose()
        }}
      />
    )
  }

  return (
    <Dialog title={i.name} onClose={onClose}>
      {saver.status === 'conflict' && (
        <ConflictBanner onKeepMine={saver.keepMine} onUseTheirs={() => saver.discardMine(onReload)} />
      )}
      <div className="card">
        <FactRow label="Name" value={i.name} onClick={() => setSub('name')} />
        <FactRow label="Quantity" value={String(i.quantity)} onClick={() => setSub('quantity')} />
        <FactRow label="Weight (each)" value={`${formatWeight(Number(i.weight))} lb`} onClick={() => setSub('weight')} />
        <label className="check-row">
          <input type="checkbox" checked={i.equipped} onChange={(e) => tap({ equipped: e.target.checked })} />
          <span>Equipped</span>
        </label>
        <label className="check-row">
          <input type="checkbox" checked={i.attuned} onChange={(e) => tap({ attuned: e.target.checked })} />
          <span>Attuned</span>
        </label>
      </div>
      <textarea
        className="text-input notes item-description"
        aria-label="Description"
        value={i.description}
        placeholder="Description…"
        onChange={(e) => saver.change({ description: e.target.value })}
        onBlur={() => void saver.flush()}
      />
      <div className="dialog-actions">
        <SaveIndicator status={saver.status} />
        <button type="button" className="danger-text" onClick={() => setSub('delete')}>
          Delete item
        </button>
        <button type="button" onClick={onClose}>
          Done
        </button>
      </div>
    </Dialog>
  )
}

/** Weight per item in lb: a decimal, with a comma or a dot. */
function WeightDialog({ initial, onSave, onClose }: { initial: number; onSave: (lb: number) => void; onClose: () => void }) {
  const [text, setText] = useState(formatWeight(initial))
  const value = parseWeight(text)
  return (
    <Dialog title="Weight (lb each)" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (value === null) return
          onSave(value)
          onClose()
        }}
      >
        <input
          className="text-input number-input"
          inputMode="decimal"
          value={text}
          onChange={(e) => setText(e.target.value.replace(/[^\d.,]/g, '').slice(0, 8))}
          onFocus={(e) => e.target.select()}
          autoFocus
        />
        {value === null && <p className="error">Type a weight like 2 or 0.5.</p>}
        <div className="dialog-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={value === null}>
            Set
          </button>
        </div>
      </form>
    </Dialog>
  )
}
