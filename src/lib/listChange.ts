// Saving one change to a list field (ARCHITECTURE.md 1.10, "Saving").
//
// Modifiers, proficiency ticks, class entries and item bonuses are lists in
// one field. Sending the whole list from the save hook could overwrite an
// entry someone else just changed, so each change is saved on its own: read
// the latest list, apply the one change, and save it with the conflict guard
// (3.4). If someone else saved in between, read again and apply again.

import { supabase } from './supabase'

/** The change no longer fits the latest list (for example, the entry was removed). */
export class ListChangedError extends Error {}

const ATTEMPTS = 3

/**
 * Apply `change` to the latest value of `field` and save it. `change` may
 * throw (for example a ListChangedError) to cancel. Returns the saved row.
 */
export async function changeList<T, V>(table: string, id: string, field: string, change: (current: V) => V): Promise<T> {
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const latest = await supabase.from(table).select(`version, ${field}`).eq('id', id).maybeSingle()
    if (latest.error) throw new Error(latest.error.message)
    if (!latest.data) throw new Error('This no longer exists, or you cannot see it.')
    const row = latest.data as unknown as { version: number } & Record<string, V>

    const saved = await supabase
      .from(table)
      .update({ [field]: change(row[field]), version: row.version })
      .eq('id', id)
      .select()
      .maybeSingle()
    if (saved.status === 409) continue // someone else saved in between: try again on their version
    if (saved.error) throw new Error(saved.error.message)
    if (!saved.data) throw new Error('You are not allowed to change this.')
    return saved.data as T
  }
  throw new Error('Someone else keeps changing this. Please try again.')
}
