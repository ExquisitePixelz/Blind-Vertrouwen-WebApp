import { useState } from 'react'
import { ConfirmDialog, Dialog, NumberDialog, PickDialog, PromptDialog } from './Dialog'
import { BonusDialog } from './ModifierDialogs'
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
import { changeList, ListChangedError } from '../lib/listChange'
import { useRowSaver, type Row } from '../lib/saver'
import { formatModifier } from '../lib/character'
import {
  ARMOR,
  ARMOR_DEX,
  armorDefaults,
  armorInfo,
  armorText,
  armorValues,
  MAX_ITEM_BONUSES,
  targetLabel,
  type ArmorDex,
  type ArmorKey,
  type Bonus,
} from '../lib/sheet'
import { must, supabase } from '../lib/supabase'
import type { Loaded } from '../lib/useLoad'
import { NAME_MAX } from '../lib/limits'
import { MarkdownNotes } from './MarkdownNotes'

/**
 * A character's inventory (1.8): only its player and the DM see it. Items
 * sorted by name, Add item, an editor per item, and the carried-weight and
 * attunement totals.
 */
export function Inventory({
  characterId,
  campaignId,
  items,
  strength,
  coins,
  onItemsChanged,
}: {
  characterId: string
  campaignId: string
  /** Loaded once by the character sheet, which also takes the item names from it (1.11 B6). */
  items: Loaded<Item[]>
  strength: number
  coins: Pick<CharacterPrivate, Coin>
  onItemsChanged: () => void
}) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)

  const list = items.data ?? []
  /** A save returns the version and the saved fields (1.11 B7): merge them into the item. */
  const replace = (saved: Row & Partial<Item>) => {
    const before = items.data?.find((i) => i.id === saved.id)
    items.mutate((all) => all?.map((i) => (i.id === saved.id ? { ...i, ...saved } : i)).sort(byItemName))
    // Only what changes the sheet reloads it, not typing in the description.
    if (!before || addsKey(before) !== addsKey({ ...before, ...saved })) onItemsChanged()
  }
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
                {(item.equipped || (item.attuned && item.attunement_required)) && (
                  <div className="item-chips">
                    {item.equipped && <span className="chip">Equipped</span>}
                    {item.attuned && item.attunement_required && <span className="chip gold">Attuned</span>}
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
          maxLength={NAME_MAX}
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
            onItemsChanged()
            setEditing(created.id)
          }}
        />
      )}
      {current && (
        <ItemEditor
          item={current}
          onSaved={replace}
          onReload={items.reload}
          onDeleted={() => {
            items.mutate((all) => all?.filter((i) => i.id !== current.id))
            onItemsChanged()
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  )
}

type Sub = 'name' | 'quantity' | 'weight' | 'delete' | 'armor' | 'armorAc' | 'armorDex' | { bonus: number | null }

/** The fields of an item that change what it adds to the sheet (and its name, shown there). */
const addsKey = (i: Item) =>
  JSON.stringify([
    i.name,
    i.quantity,
    i.equipped,
    i.attuned,
    i.attunement_required,
    i.armor,
    i.armor_ac,
    i.armor_dex,
    i.armor_stealth,
    i.effects,
  ])

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
  onSaved: (item: Row & Partial<Item>) => void
  onReload: () => void
  onDeleted: () => void
  onClose: () => void
}) {
  const [sub, setSub] = useState<Sub | null>(null)
  const saver = useRowSaver<Item>('inventory_items', item, onSaved)
  const i = saver.view ?? item
  const back = () => setSub(null)
  const tap = (patch: Partial<Item>) => saver.change(patch, true)
  const armor = i.armor ? armorValues(i.armor, i) : null

  /** Bonuses are saved one change at a time on the latest list (1.10, "Saving"). */
  async function changeBonuses(change: (latest: Bonus[]) => Bonus[]) {
    await saver.settle()
    try {
      onSaved(await changeList<Item, Bonus[]>('inventory_items', i.id, 'effects', change))
    } catch (e) {
      if (e instanceof ListChangedError) onReload()
      throw e
    }
  }
  const same = (latest: Bonus[], index: number) => {
    if (JSON.stringify(latest[index]) !== JSON.stringify(i.effects[index])) {
      throw new ListChangedError('Someone else changed the bonuses. They are reloaded; please try again.')
    }
  }

  if (sub === 'armor') {
    return (
      <PickDialog<ArmorKey | null>
        title="Armor"
        onClose={back}
        // Another armor starts from the table's values again.
        onPick={(armor) => tap({ armor, armor_ac: null, armor_dex: null, armor_stealth: null })}
        options={[
          { value: null, label: `None${i.armor === null ? ' •' : ''}` },
          ...ARMOR.map((a) => ({
            value: a.key,
            label: `${a.label}, AC ${armorText(a.key)}${a.key === i.armor ? ' •' : ''}`,
          })),
        ]}
      />
    )
  }
  if (sub === 'armorAc' && armor) {
    return (
      <NumberDialog
        title={armor.type === 'shield' ? 'Shield bonus' : 'Base AC'}
        initial={armor.base}
        onClose={back}
        actions={[
          {
            label: 'Set',
            onApply: (x) => {
              const value = Math.min(30, Math.max(0, x))
              // The table's own value is stored as empty, so it follows the table.
              tap({ armor_ac: value === armorDefaults(i.armor!).base ? null : value })
            },
          },
        ]}
      />
    )
  }
  if (sub === 'armorDex' && armor) {
    return (
      <PickDialog<ArmorDex>
        title="DEX on AC"
        onClose={back}
        onPick={(dex) => tap({ armor_dex: dex === armorDefaults(i.armor!).dex ? null : dex })}
        options={ARMOR_DEX.map((d) => ({ value: d.value, label: `${d.label}${d.value === armor.dex ? ' •' : ''}` }))}
      />
    )
  }
  if (typeof sub === 'object' && sub) {
    const index = sub.bonus
    return (
      <BonusDialog
        initial={index === null ? null : i.effects[index]}
        onClose={back}
        onSave={(target, value) =>
          changeBonuses((latest) => {
            if (index === null) {
              if (latest.length >= MAX_ITEM_BONUSES) throw new ListChangedError('An item has at most 5 bonuses.')
              return [...latest, { target, value }]
            }
            same(latest, index)
            return latest.map((b, n) => (n === index ? { target, value } : b))
          })
        }
        onDelete={
          index === null
            ? undefined
            : () =>
                changeBonuses((latest) => {
                  same(latest, index)
                  return latest.filter((_, n) => n !== index)
                })
        }
      />
    )
  }
  if (sub === 'name') {
    return <PromptDialog title="Name" initial={i.name} maxLength={NAME_MAX} onClose={back} onSubmit={(name) => tap({ name })} />
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
          <input
            type="checkbox"
            checked={i.attunement_required}
            // Without the need, Attuned means nothing, so it is cleared too.
            onChange={(e) => tap(e.target.checked ? { attunement_required: true } : { attunement_required: false, attuned: false })}
          />
          <span>Requires attunement</span>
        </label>
        {i.attunement_required && (
          <label className="check-row">
            <input type="checkbox" checked={i.attuned} onChange={(e) => tap({ attuned: e.target.checked })} />
            <span>Attuned</span>
          </label>
        )}
        <FactRow
          label="Armor"
          value={i.armor ? `${armorInfo(i.armor).label}, AC ${armorText(i.armor, i)}` : 'None'}
          muted={!i.armor}
          onClick={() => setSub('armor')}
        />
        {armor && (
          <FactRow
            label={armor.type === 'shield' ? 'Shield bonus' : 'Base AC'}
            value={armor.type === 'shield' ? `+${armor.base}` : String(armor.base)}
            onClick={() => setSub('armorAc')}
          />
        )}
        {armor && armor.type !== 'shield' && (
          <>
            <FactRow
              label="DEX on AC"
              value={ARMOR_DEX.find((d) => d.value === armor.dex)!.label}
              onClick={() => setSub('armorDex')}
            />
            <label className="check-row">
              <input
                type="checkbox"
                checked={armor.stealth}
                onChange={(e) => {
                  const on = e.target.checked
                  tap({ armor_stealth: on === armorDefaults(i.armor!).stealth ? null : on })
                }}
              />
              <span>Disadvantage on Stealth</span>
            </label>
          </>
        )}
        {i.effects.map((b, n) => (
          <FactRow key={n} label={n === 0 ? 'Bonuses' : ''} value={`${targetLabel(b.target)} ${formatModifier(b.value)}`} onClick={() => setSub({ bonus: n })} />
        ))}
        <div className="fact-row">
          <span className="muted">{i.effects.length ? '' : 'Bonuses'}</span>
          <button
            type="button"
            className="small-button secondary"
            disabled={i.effects.length >= MAX_ITEM_BONUSES}
            onClick={() => setSub({ bonus: null })}
          >
            Add bonus
          </button>
        </div>
      </div>
      <p className="muted small">Armor and bonuses count while the item is equipped (and attuned, when it requires it).</p>
      <MarkdownNotes
        title="Description"
        notes={i.description}
        onChange={(description) => saver.change({ description })}
        onBlur={() => void saver.flush()}
        placeholder="Description…"
        emptyText="No description."
      />
      <div className="dialog-actions">
        <SaveIndicator status={saver.status} />
        <button type="button" className="secondary danger-text" onClick={() => setSub('delete')}>
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
