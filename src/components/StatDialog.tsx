import { useState, type ReactNode } from 'react'
import { Dialog } from './Dialog'
import { FactRow } from './FactRow'
import { ModifierDialog } from './ModifierDialogs'
import { formatModifier } from '../lib/character'
import { formatParts, MAX_MODIFIERS, type EffectItem, type Modifier, type Target, type Total } from '../lib/sheet'

/**
 * How one number is made, and its custom modifiers (1.10): the calculation
 * at the top, then the modifiers (tap one to edit or delete it), the item
 * bonuses (changed in the inventory), and Add modifier. The modifier dialog
 * replaces this one while it is open, so only one dialog shows at a time.
 */
export function StatDialog({
  title,
  shown,
  total,
  bonus,
  target,
  modifiers,
  items,
  itemNames,
  children,
  onAdd,
  onEdit,
  onDelete,
  onClose,
}: {
  title: string
  /** The total as shown on the sheet, e.g. "+6" or "16". */
  shown: string
  total: Total
  /** A bonus (saves, skills): its parts are shown as "+3". */
  bonus?: boolean
  target: Target
  modifiers: Modifier[]
  items: EffectItem[]
  itemNames: Map<string, string>
  /** Extra rows, e.g. the Unarmored AC choice. */
  children?: ReactNode
  onAdd: (label: string, value: number, target: Target) => Promise<void>
  onEdit: (id: string, label: string, value: number, target: Target) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onClose: () => void
}) {
  const [editing, setEditing] = useState<Modifier | 'new' | null>(null)
  const isSave = target.startsWith('save.')
  const own = modifiers.filter((m) => m.target === target || (isSave && m.target === 'save.all'))
  const itemBonuses = items.flatMap((i) =>
    i.effects
      .filter((e) => e.target === target || (isSave && e.target === 'save.all'))
      .map((e) => ({ name: itemNames.get(i.item_id) ?? 'Item', value: e.value, all: e.target === 'save.all' })),
  )

  if (editing) {
    const initial = editing === 'new' ? null : editing
    return (
      <ModifierDialog
        initial={initial}
        saveTarget={isSave ? target : undefined}
        onClose={() => setEditing(null)}
        onSave={(label, value, chosen) =>
          initial ? onEdit(initial.id, label, value, chosen ?? target) : onAdd(label, value, chosen ?? target)
        }
        onDelete={initial ? () => onDelete(initial.id) : undefined}
      />
    )
  }

  return (
    <Dialog title={title} onClose={onClose}>
      <p className="stat-formula">
        <strong>
          {title} {shown}
        </strong>{' '}
        = {formatParts(total, bonus)}
      </p>
      {/* The base value or Set AC first, then the modifiers (1.10, 2026-10-09). */}
      {children}

      <div className="card">
        {own.map((m) => (
          <FactRow
            key={m.id}
            label={`${m.label || 'Modifier'}${isSave && m.target === 'save.all' ? ' (all saves)' : ''}`}
            value={formatModifier(m.value)}
            onClick={() => setEditing(m)}
          />
        ))}
        {itemBonuses.map((b, i) => (
          <FactRow key={`item-${i}`} label={`${b.name}${b.all ? ' (all saves)' : ''}`} value={formatModifier(b.value)} muted />
        ))}
        {!own.length && !itemBonuses.length && <p className="muted small stat-empty">No modifiers yet.</p>}
      </div>
      {itemBonuses.length > 0 && <p className="muted small">Item bonuses are changed on the item, in the inventory.</p>}

      <div className="dialog-actions">
        <button
          type="button"
          className="secondary dialog-left"
          disabled={modifiers.length >= MAX_MODIFIERS}
          onClick={() => setEditing('new')}
        >
          Add modifier
        </button>
        <button type="button" onClick={onClose}>
          Done
        </button>
      </div>
    </Dialog>
  )
}
