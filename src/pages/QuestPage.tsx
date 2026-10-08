import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ConfirmDialog, PickDialog, PromptDialog } from '../components/Dialog'
import { FactRow } from '../components/FactRow'
import { MarkdownNotes } from '../components/MarkdownNotes'
import { ConflictBanner, SaveIndicator } from '../components/SaveState'
import { TopBar } from '../components/TopBar'
import { useMe } from '../lib/me'
import { loadCharacterNames, type CharacterName } from '../lib/questData'
import {
  KINDS,
  OBJECTIVE_COLUMNS,
  QUEST_COLUMNS,
  REWARD_COLUMNS,
  STATUSES,
  hiddenRewardsText,
  kindText,
  objectivesVisibleToPlayers,
  splitObjectives,
  statusLabel,
  swapWith,
  type Objective,
  type Quest,
  type QuestKind,
  type QuestStatus,
  type Reward,
} from '../lib/quests'
import { useRowSaver } from '../lib/saver'
import { must, supabase } from '../lib/supabase'
import { useLoad } from '../lib/useLoad'
import { NAME_MAX } from '../lib/limits'

type Open = 'menu' | 'title' | 'kind' | 'character' | 'status' | 'giver' | 'location' | 'reveal' | 'hide' | 'delete'

/**
 * One quest (ARCHITECTURE.md 1.9). Players read it; for the DM it is the
 * editor: taps save at once, the description 1 s after typing stops (3.4).
 */
export function QuestPage() {
  const me = useMe()
  const { campaignId = '', questId = '' } = useParams()
  const navigate = useNavigate()
  const [open, setOpen] = useState<Open | null>(null)
  const [error, setError] = useState<string | null>(null)
  const close = () => setOpen(null)
  const list = `/c/${campaignId}/quests`

  const quest = useLoad(async () => {
    return must(
      await supabase.from('quests').select(QUEST_COLUMNS).eq('id', questId).is('deleted_at', null).maybeSingle(),
    ) as Quest | null
  }, [questId])
  const characters = useLoad(() => loadCharacterNames(campaignId), [campaignId])

  const saver = useRowSaver<Quest>('quests', quest.data ?? undefined, (saved) => quest.mutate(() => saved))
  const q = saver.view
  const tap = (patch: Partial<Quest>) => saver.change(patch, true)
  const characterName = (id: string) => characters.data?.find((c) => c.id === id)?.name

  if (quest.error) {
    return (
      <main className="page">
        <TopBar back={list} />
        <p className="error">{quest.error}</p>
      </main>
    )
  }
  if (!q) {
    return (
      <main className="page">
        <TopBar back={list} />
        {!quest.loading && <p className="muted">This quest does not exist, or it was deleted.</p>}
      </main>
    )
  }

  const dm = me.isDm
  const hidden = q.audience === 'dm'
  const kind = <span className={`chip${q.kind === 'main' ? ' gold' : ''}`}>{kindText(q, characterName)}</span>

  return (
    <main className="page">
      <TopBar title="Quest" back={list}>
        {dm && (
          <button className="icon secondary" aria-label="More" onClick={() => setOpen('menu')}>
            …
          </button>
        )}
      </TopBar>
      {dm && (
        <p className="page-status">
          <SaveIndicator status={saver.status} />
        </p>
      )}
      {saver.status === 'conflict' && (
        <ConflictBanner onKeepMine={saver.keepMine} onUseTheirs={() => saver.discardMine(quest.reload)} />
      )}
      {error && <p className="error">{error}</p>}

      {dm && hidden && (
        <div className="notice quest-hidden">
          <span>Hidden: players can’t see this quest yet.</span>
          <button type="button" className="small-button" onClick={() => setOpen('reveal')}>
            Reveal
          </button>
        </div>
      )}

      <div className="quest-head">
        {kind}
        <h1 className={`quest-heading ${q.status}`}>{q.title}</h1>
      </div>

      <div className="card">
        {dm && <FactRow label="Title" value={q.title} onClick={() => setOpen('title')} />}
        {dm && <FactRow label="Kind" value={kindText(q, characterName)} onClick={() => setOpen('kind')} />}
        <FactRow label="Status" value={statusLabel(q.status)} onClick={dm ? () => setOpen('status') : undefined} />
        <FactRow label="Quest giver" value={q.giver} onClick={dm ? () => setOpen('giver') : undefined} />
        <FactRow label="Location" value={q.location} onClick={dm ? () => setOpen('location') : undefined} />
      </div>

      <MarkdownNotes
        title="Description"
        notes={q.description}
        onChange={(description) => saver.change({ description })}
        onBlur={() => void saver.flush()}
        placeholder="What is this quest about…"
        emptyText={dm ? 'No description yet. Tap Edit to write one.' : 'No description yet.'}
        readOnly={!dm}
      />

      <Objectives questId={q.id} dm={dm} />
      <Rewards questId={q.id} campaignId={campaignId} dm={dm} />

      {open === 'menu' && (
        <PickDialog<Open>
          title={q.title}
          onClose={close}
          onPick={(next) => setTimeout(() => setOpen(next))}
          options={[
            hidden ? { value: 'reveal' as const, label: 'Reveal to players' } : { value: 'hide' as const, label: 'Hide again' },
            { value: 'delete', label: 'Delete quest', className: 'danger-text' },
          ]}
        />
      )}
      {open === 'title' && <PromptDialog title="Title" initial={q.title} maxLength={NAME_MAX} onClose={close} onSubmit={(title) => tap({ title })} />}
      {open === 'giver' && (
        <PromptDialog title="Quest giver" initial={q.giver} allowEmpty onClose={close} onSubmit={(giver) => tap({ giver })} />
      )}
      {open === 'location' && (
        <PromptDialog title="Location" initial={q.location} allowEmpty onClose={close} onSubmit={(location) => tap({ location })} />
      )}
      {open === 'status' && (
        <PickDialog<QuestStatus>
          title="Status"
          options={STATUSES}
          onClose={close}
          onPick={(status) => tap({ status })}
        />
      )}
      {open === 'kind' && (
        <PickDialog<QuestKind>
          title="Kind"
          options={KINDS.filter((k) => k.value !== 'character' || characters.data?.length)}
          onClose={close}
          onPick={(k) => {
            if (k === 'character') setTimeout(() => setOpen('character'))
            else tap({ kind: k, character_id: null })
          }}
        />
      )}
      {open === 'character' && (
        <PickDialog<string>
          title="Whose quest?"
          options={(characters.data ?? []).map((c: CharacterName) => ({ value: c.id, label: c.name }))}
          onClose={close}
          onPick={(id) => tap({ kind: 'character', character_id: id })}
        />
      )}
      {open === 'reveal' && (
        <ConfirmDialog
          title="Reveal quest"
          message={`Everyone in the campaign will see “${q.title}”. You can hide it again later.`}
          confirmLabel="Reveal"
          onClose={close}
          onConfirm={() => tap({ audience: 'members' })}
        />
      )}
      {open === 'hide' && (
        <ConfirmDialog
          title="Hide quest again"
          message={`Players will no longer see “${q.title}”. What they already read, they may remember.`}
          confirmLabel="Hide"
          onClose={close}
          onConfirm={() => tap({ audience: 'dm' })}
        />
      )}
      {open === 'delete' && (
        <ConfirmDialog
          title="Delete quest"
          message={`“${q.title}” will be removed from the Quest Journal.`}
          confirmLabel="Delete"
          onClose={close}
          onConfirm={async () => {
            setError(null)
            const { saved, version } = await saver.settle()
            if (!saved || version === null) throw new Error('Your changes are not saved yet. Try again when they are.')
            must(
              await supabase
                .from('quests')
                .update({ deleted_at: new Date().toISOString(), version })
                .eq('id', q.id)
                .select('id')
                .single(),
            )
            saver.discardMine(() => {})
            navigate(list, { replace: true })
          }}
        />
      )}
    </main>
  )
}

/**
 * Change one objective or reward. These are single taps and prompts, not
 * typing, so they are sent at once with the row's version (3.4 conflict
 * guard) and return the stored row.
 */
async function updatePart<R extends { id: string; version: number }>(table: string, columns: string, row: R, patch: Partial<R> & { deleted_at?: string }) {
  const result = await supabase.from(table).update({ ...patch, version: row.version }).eq('id', row.id).select(columns).single()
  if (result.error) {
    if (result.status === 409) throw new Error('This was changed somewhere else. The list has been reloaded; try again.')
    throw new Error(result.error.message)
  }
  return result.data as unknown as R
}

type PartAction = 'edit' | 'up' | 'down' | 'toggle' | 'delete'

/**
 * Objectives (1.9): the main steps in order, then the optional ones. The
 * database shows players only the steps they may see; the DM sees all, with
 * the rest marked Hidden.
 */
function Objectives({ questId, dm }: { questId: string; dm: boolean }) {
  const [adding, setAdding] = useState<'main' | 'optional' | null>(null)
  const [menu, setMenu] = useState<Objective | null>(null)
  const [action, setAction] = useState<{ kind: 'edit' | 'delete'; objective: Objective } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const objectives = useLoad(async () => {
    return must(
      await supabase.from('quest_objectives').select(OBJECTIVE_COLUMNS).eq('quest_id', questId).is('deleted_at', null),
    ) as Objective[]
  }, [questId])

  const all = objectives.data ?? []
  const { main, optional } = splitObjectives(all)
  const visible = objectivesVisibleToPlayers(all)
  const replace = (...saved: Objective[]) =>
    objectives.mutate((rows) => rows?.map((o) => saved.find((s) => s.id === o.id) ?? o))

  async function run(work: () => Promise<void>) {
    setError(null)
    try {
      await work()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      objectives.reload()
    }
  }

  const save = (o: Objective, patch: Partial<Objective> & { deleted_at?: string }) =>
    updatePart('quest_objectives', OBJECTIVE_COLUMNS, o, patch)

  function move(o: Objective, direction: -1 | 1) {
    const pair = swapWith(o.optional ? optional : main, o.id, direction)
    if (!pair) return
    const [a, b] = pair
    void run(async () => {
      const first = await save(a, { sort_order: b.sort_order === a.sort_order ? a.sort_order + direction : b.sort_order })
      const second = await save(b, { sort_order: a.sort_order })
      replace(first, second)
    })
  }

  const row = (o: Objective) => {
    const text = <span className={o.done ? 'objective-done' : undefined}>{o.text}</span>
    if (!dm) {
      return (
        <div key={o.id} className="check-row objective">
          <span className={`objective-mark${o.done ? ' done' : ''}`} aria-label={o.done ? 'Done' : 'Open'}>
            {o.done ? '✓' : ''}
          </span>
          {text}
        </div>
      )
    }
    return (
      <div key={o.id} className="check-row objective">
        <input
          type="checkbox"
          checked={o.done}
          aria-label={`Done: ${o.text}`}
          onChange={(e) => {
            const done = e.target.checked
            void run(async () => replace(await save(o, { done })))
          }}
        />
        <button type="button" className="objective-text" onClick={() => setMenu(o)}>
          {text}
          {!visible.has(o.id) && <span className="chip">Hidden</span>}
        </button>
      </div>
    )
  }

  return (
    <section>
      <div className="title-row">
        <h2>Objectives</h2>
      </div>
      {(error || objectives.error) && <p className="error">{error ?? objectives.error}</p>}
      {objectives.data?.length === 0 && <p className="muted">No objectives yet.</p>}
      {!!main.length && <div className="card">{main.map(row)}</div>}
      {!!optional.length && (
        <>
          <h3 className="muted small objectives-optional">Optional</h3>
          <div className="card">{optional.map(row)}</div>
        </>
      )}
      {dm && (
        <div className="part-buttons">
          <button type="button" className="small-button" onClick={() => setAdding('main')}>
            Add objective
          </button>
          <button type="button" className="small-button secondary" onClick={() => setAdding('optional')}>
            Add optional
          </button>
        </div>
      )}

      {adding && (
        <PromptDialog
          title={adding === 'main' ? 'New objective' : 'New optional objective'}
          submitLabel="Add"
          onClose={() => setAdding(null)}
          onSubmit={async (text) => {
            const created = must(
              await supabase
                .from('quest_objectives')
                .insert({ quest_id: questId, text, optional: adding === 'optional' })
                .select(OBJECTIVE_COLUMNS)
                .single(),
            ) as Objective
            objectives.mutate((rows) => [...(rows ?? []), created])
          }}
        />
      )}
      {menu && (
        <PickDialog<PartAction>
          title={menu.text}
          onClose={() => setMenu(null)}
          onPick={(picked) => {
            const o = menu
            if (picked === 'up') move(o, -1)
            else if (picked === 'down') move(o, 1)
            else if (picked === 'edit' || picked === 'delete') setTimeout(() => setAction({ kind: picked, objective: o }))
          }}
          options={[
            { value: 'edit', label: 'Edit text' },
            ...(siblingIndex(menu, main, optional) > 0 ? [{ value: 'up' as const, label: 'Move up' }] : []),
            ...(siblingIndex(menu, main, optional) < (menu.optional ? optional : main).length - 1
              ? [{ value: 'down' as const, label: 'Move down' }]
              : []),
            { value: 'delete', label: 'Delete objective', className: 'danger-text' },
          ]}
        />
      )}
      {action?.kind === 'edit' && (
        <PromptDialog
          title="Objective"
          initial={action.objective.text}
          onClose={() => setAction(null)}
          onSubmit={async (text) => replace(await save(action.objective, { text }))}
        />
      )}
      {action?.kind === 'delete' && (
        <ConfirmDialog
          title="Delete objective"
          message={`“${action.objective.text}” will be removed from this quest.`}
          confirmLabel="Delete"
          onClose={() => setAction(null)}
          onConfirm={async () => {
            await save(action.objective, { deleted_at: new Date().toISOString() })
            objectives.mutate((rows) => rows?.filter((o) => o.id !== action.objective.id))
          }}
        />
      )}
    </section>
  )
}

const siblingIndex = (o: Objective, main: Objective[], optional: Objective[]) =>
  (o.optional ? optional : main).findIndex((x) => x.id === o.id)

/**
 * Rewards (1.9): each visible or hidden. Players see the visible ones and a
 * "+ a hidden reward" line; the text of a hidden one never reaches them.
 */
function Rewards({ questId, campaignId, dm }: { questId: string; campaignId: string; dm: boolean }) {
  const [adding, setAdding] = useState(false)
  const [newText, setNewText] = useState<string | null>(null)
  const [menu, setMenu] = useState<Reward | null>(null)
  const [action, setAction] = useState<{ kind: 'edit' | 'delete'; reward: Reward } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const rewards = useLoad(async () => {
    const [rows, counts] = await Promise.all([
      supabase.from('quest_rewards').select(REWARD_COLUMNS).eq('quest_id', questId).is('deleted_at', null).then(must),
      dm
        ? Promise.resolve([])
        : supabase.rpc('hidden_reward_counts', { p_campaign_id: campaignId }).then(must),
    ])
    const hidden = (counts as { quest_id: string; hidden: number }[]).find((c) => c.quest_id === questId)?.hidden ?? 0
    return { rows: (rows as Reward[]).sort((a, b) => a.sort_order - b.sort_order || (a.id < b.id ? -1 : 1)), hidden }
  }, [questId, campaignId, dm])

  const list = rewards.data?.rows ?? []
  const hiddenLine = hiddenRewardsText(rewards.data?.hidden ?? 0)
  const replace = (...saved: Reward[]) =>
    rewards.mutate((d) => d && { ...d, rows: d.rows.map((r) => saved.find((s) => s.id === r.id) ?? r).sort((a, b) => a.sort_order - b.sort_order || (a.id < b.id ? -1 : 1)) })
  const save = (r: Reward, patch: Partial<Reward> & { deleted_at?: string }) => updatePart('quest_rewards', REWARD_COLUMNS, r, patch)

  async function run(work: () => Promise<void>) {
    setError(null)
    try {
      await work()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      rewards.reload()
    }
  }

  function move(r: Reward, direction: -1 | 1) {
    const pair = swapWith(list, r.id, direction)
    if (!pair) return
    const [a, b] = pair
    void run(async () => {
      const first = await save(a, { sort_order: b.sort_order === a.sort_order ? a.sort_order + direction : b.sort_order })
      const second = await save(b, { sort_order: a.sort_order })
      replace(first, second)
    })
  }

  async function add(text: string, audience: Reward['audience']) {
    const created = must(
      await supabase.from('quest_rewards').insert({ quest_id: questId, text, audience }).select(REWARD_COLUMNS).single(),
    ) as Reward
    rewards.mutate((d) => d && { ...d, rows: [...d.rows, created] })
  }

  const index = menu ? list.findIndex((r) => r.id === menu.id) : -1

  return (
    <section>
      <h2>Rewards</h2>
      {(error || rewards.error) && <p className="error">{error ?? rewards.error}</p>}
      {rewards.data && !list.length && !hiddenLine && <p className="muted">No rewards yet.</p>}
      {!!list.length && (
        <div className="card">
          {list.map((r) =>
            dm ? (
              <button key={r.id} type="button" className="fact-row reward-row" onClick={() => setMenu(r)}>
                <span>{r.text}</span>
                {r.audience === 'dm' && <span className="chip">Hidden</span>}
              </button>
            ) : (
              <div key={r.id} className="fact-row reward-row">
                <span>{r.text}</span>
              </div>
            ),
          )}
        </div>
      )}
      {hiddenLine && <p className="muted small">{hiddenLine}</p>}
      {dm && (
        <div className="part-buttons">
          <button type="button" className="small-button" onClick={() => setAdding(true)}>
            Add reward
          </button>
        </div>
      )}

      {adding && (
        <PromptDialog
          title="New reward"
          submitLabel="Next"
          onClose={() => setAdding(false)}
          onSubmit={(text) => {
            setTimeout(() => setNewText(text))
          }}
        />
      )}
      {newText !== null && (
        <PickDialog<Reward['audience']>
          title="Can players see this reward?"
          options={[
            { value: 'members', label: 'Yes, show it' },
            { value: 'dm', label: 'No, keep it hidden' },
          ]}
          onClose={() => setNewText(null)}
          onPick={(audience) => void run(() => add(newText, audience))}
        />
      )}
      {menu && (
        <PickDialog<PartAction>
          title={menu.text}
          onClose={() => setMenu(null)}
          onPick={(picked) => {
            const r = menu
            if (picked === 'toggle') void run(async () => replace(await save(r, { audience: r.audience === 'dm' ? 'members' : 'dm' })))
            else if (picked === 'up') move(r, -1)
            else if (picked === 'down') move(r, 1)
            else if (picked === 'edit' || picked === 'delete') setTimeout(() => setAction({ kind: picked, reward: r }))
          }}
          options={[
            { value: 'edit', label: 'Edit text' },
            { value: 'toggle', label: menu.audience === 'dm' ? 'Show to players' : 'Hide from players' },
            ...(index > 0 ? [{ value: 'up' as const, label: 'Move up' }] : []),
            ...(index < list.length - 1 ? [{ value: 'down' as const, label: 'Move down' }] : []),
            { value: 'delete', label: 'Delete reward', className: 'danger-text' },
          ]}
        />
      )}
      {action?.kind === 'edit' && (
        <PromptDialog
          title="Reward"
          initial={action.reward.text}
          onClose={() => setAction(null)}
          onSubmit={async (text) => replace(await save(action.reward, { text }))}
        />
      )}
      {action?.kind === 'delete' && (
        <ConfirmDialog
          title="Delete reward"
          message={`“${action.reward.text}” will be removed from this quest.`}
          confirmLabel="Delete"
          onClose={() => setAction(null)}
          onConfirm={async () => {
            await save(action.reward, { deleted_at: new Date().toISOString() })
            rewards.mutate((d) => d && { ...d, rows: d.rows.filter((r) => r.id !== action.reward.id) })
          }}
        />
      )}
    </section>
  )
}
