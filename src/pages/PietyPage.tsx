import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { ConfirmDialog, Dialog, NumberDialog, PickDialog } from '../components/Dialog'
import { ConflictBanner, SaveIndicator } from '../components/SaveState'
import { byName, loadGods, type God } from '../lib/gods'
import { useMe } from '../lib/me'
import { useRowSaver } from '../lib/saver'
import { must, supabase } from '../lib/supabase'
import { useLoad } from '../lib/useLoad'

type Track = {
  id: string
  version: number
  character_id: string
  god_id: string | null
  custom_source_name: string | null
  custom_source_rules: string | null
  score: number
}

const TRACK_COLUMNS = 'id, version, character_id, god_id, custom_source_name, custom_source_rules, score, created_at'

/** A god, or "set up a custom source". */
type Source = { god: God } | { custom: true }

/**
 * Piety page (ARCHITECTURE.md 1.1 and 4). Everyone in the campaign reads every
 * character's tracks and scores. Only the DM changes them. The app does not
 * calculate piety: the DM sets the score by hand.
 */
export function PietyPage() {
  const { campaignId = '' } = useParams()
  const me = useMe()
  const [adding, setAdding] = useState<{ characterId: string; custom: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const data = useLoad(async () => {
    const [characters, tracks, gods] = await Promise.all([
      supabase.from('characters').select('id, name').eq('campaign_id', campaignId).is('deleted_at', null).then(must),
      supabase
        .from('piety_tracks')
        .select(TRACK_COLUMNS)
        .eq('campaign_id', campaignId)
        .is('deleted_at', null)
        .order('created_at')
        .then(must),
      loadGods(),
    ])
    return {
      characters: (characters as { id: string; name: string }[]).sort(byName),
      tracks: tracks as Track[],
      gods,
    }
  }, [campaignId])

  if (data.error) return <main className="page error">{data.error}</main>
  if (!data.data) return <main className="page" />
  const { characters, tracks, gods } = data.data
  const godName = new Map(gods.map((g) => [g.id, g.name]))

  const replaceTrack = (saved: Track) =>
    data.mutate((d) => d && { ...d, tracks: d.tracks.map((t) => (t.id === saved.id ? saved : t)) })

  /** Gods this character has no track with yet (one track per god). */
  const freeGods = (characterId: string, except?: string | null) =>
    gods.filter((g) => g.id === except || !tracks.some((t) => t.character_id === characterId && t.god_id === g.id))

  async function addTrack(characterId: string, fields: Partial<Track>) {
    must(await supabase.from('piety_tracks').insert({ campaign_id: campaignId, character_id: characterId, ...fields }))
    await data.reload()
  }

  return (
    <main className="page">
      <Link to={`/c/${campaignId}`} className="back">
        ← Campaign
      </Link>
      <h1>Piety</h1>
      {characters.length === 0 && <p className="muted">No characters yet.</p>}
      {error && <p className="error">{error}</p>}

      {characters.map((character) => {
        const own = tracks.filter((t) => t.character_id === character.id)
        return (
          <section key={character.id} className="card piety-card">
            <div className="title-row">
              <strong>{character.name}</strong>
              {me.isDm && (
                <button className="secondary small-button" onClick={() => setAdding({ characterId: character.id, custom: false })}>
                  Add track
                </button>
              )}
            </div>
            {own.length === 0 && <p className="muted small">No piety track.</p>}
            {own.map((track) => (
              <TrackRow
                key={track.id}
                track={track}
                sourceName={track.god_id ? (godName.get(track.god_id) ?? 'Unknown god') : (track.custom_source_name ?? '')}
                canEdit={me.isDm}
                godChoices={freeGods(character.id, track.god_id)}
                onSaved={replaceTrack}
                onChanged={data.reload}
              />
            ))}
          </section>
        )
      })}

      {adding && !adding.custom && (
        <PickDialog<Source>
          title="Add piety track"
          onClose={() => setAdding(null)}
          onPick={(source) => {
            if ('god' in source) {
              setError(null)
              addTrack(adding.characterId, { god_id: source.god.id }).catch((e: Error) => setError(e.message))
            }
            else setTimeout(() => setAdding({ ...adding, custom: true }))
          }}
          options={[
            ...freeGods(adding.characterId).map((god) => ({ value: { god } as Source, label: god.name })),
            { value: { custom: true } as Source, label: 'Custom source…' },
          ]}
        />
      )}
      {adding?.custom && (
        <CustomSourceDialog
          title="Custom source"
          onClose={() => setAdding(null)}
          onSubmit={(name, rules) =>
            addTrack(adding.characterId, { custom_source_name: name, custom_source_rules: rules })
          }
        />
      )}
    </main>
  )
}

type Open = { kind: 'score' } | { kind: 'menu' } | { kind: 'source' } | { kind: 'custom' } | { kind: 'delete' }

function TrackRow({
  track,
  sourceName,
  canEdit,
  godChoices,
  onSaved,
  onChanged,
}: {
  track: Track
  sourceName: string
  canEdit: boolean
  godChoices: God[]
  onSaved: (track: Track) => void
  onChanged: () => void
}) {
  const [open, setOpen] = useState<Open | null>(null)
  const close = () => setOpen(null)
  const saver = useRowSaver<Track>('piety_tracks', track, onSaved)
  const t = saver.view ?? track
  const isGod = t.god_id !== null
  const setScore = (score: number) => saver.change({ score: Math.max(0, score) }, true)

  return (
    <div className="track">
      {saver.status === 'conflict' && (
        <ConflictBanner onKeepMine={saver.keepMine} onUseTheirs={() => saver.discardMine(onChanged)} />
      )}
      <div className="track-main">
        <div className="track-source">
          <span className={isGod ? 'gold' : undefined}>{sourceName}</span>
          {!isGod && t.custom_source_rules && <span className="muted small rules">{t.custom_source_rules}</span>}
        </div>
        {canEdit ? (
          <div className="track-controls">
            <button className="secondary step" aria-label="Lower" onClick={() => setScore(t.score - 1)}>
              −
            </button>
            <button className="score tappable-score" onClick={() => setOpen({ kind: 'score' })}>
              {t.score}
            </button>
            <button className="secondary step" aria-label="Raise" onClick={() => setScore(t.score + 1)}>
              +
            </button>
            <button className="icon secondary" aria-label="Track options" onClick={() => setOpen({ kind: 'menu' })}>
              …
            </button>
          </div>
        ) : (
          <span className="score">{t.score}</span>
        )}
      </div>
      {canEdit && saver.status !== 'saved' && <SaveIndicator status={saver.status} />}

      {open?.kind === 'score' && (
        <NumberDialog
          title={`Piety: ${sourceName}`}
          initial={t.score}
          onClose={close}
          actions={[{ label: 'Set', onApply: setScore }]}
        />
      )}
      {open?.kind === 'menu' && (
        <PickDialog<Open>
          title={sourceName}
          onClose={close}
          onPick={(next) => setTimeout(() => setOpen(next))}
          options={[
            { value: { kind: 'source' }, label: isGod ? 'Change god' : 'Change to a god' },
            ...(isGod ? [] : [{ value: { kind: 'custom' } as Open, label: 'Edit custom source' }]),
            { value: { kind: 'delete' }, label: 'Delete track', className: 'danger-text' },
          ]}
        />
      )}
      {open?.kind === 'source' && (
        <PickDialog<string>
          title="Change god"
          onClose={close}
          onPick={(godId) =>
            saver.change({ god_id: godId, custom_source_name: null, custom_source_rules: null }, true)
          }
          options={godChoices.map((g) => ({
            value: g.id,
            label: g.id === t.god_id ? `${g.name} •` : g.name,
          }))}
        />
      )}
      {open?.kind === 'custom' && (
        <CustomSourceDialog
          title="Edit custom source"
          initialName={t.custom_source_name ?? ''}
          initialRules={t.custom_source_rules ?? ''}
          onClose={close}
          onSubmit={(name, rules) => saver.change({ custom_source_name: name, custom_source_rules: rules }, true)}
        />
      )}
      {open?.kind === 'delete' && (
        <ConfirmDialog
          title="Delete track"
          message={`The ${sourceName} track and its score (${t.score}) will be removed.`}
          confirmLabel="Delete"
          onClose={close}
          onConfirm={async () => {
            // Soft delete through the saver, so it carries the latest version.
            saver.change({ deleted_at: new Date().toISOString() })
            await saver.flush()
            onChanged()
          }}
        />
      )}
    </div>
  )
}

/** A custom source: a name (required) and a description of how it works. */
function CustomSourceDialog({
  title,
  initialName = '',
  initialRules = '',
  onSubmit,
  onClose,
}: {
  title: string
  initialName?: string
  initialRules?: string
  onSubmit: (name: string, rules: string) => Promise<void> | void
  onClose: () => void
}) {
  const [name, setName] = useState(initialName)
  const [rules, setRules] = useState(initialRules)
  const [error, setError] = useState<string | null>(null)
  const ready = name.trim() !== ''

  return (
    <Dialog title={title} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (!ready) return
          try {
            await onSubmit(name.trim(), rules.trim())
            onClose()
          } catch (err) {
            setError(err instanceof Error ? err.message : String(err))
          }
        }}
      >
        <label className="field">
          <span className="muted small">Name, e.g. Oracle</span>
          <input className="text-input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </label>
        <label className="field">
          <span className="muted small">How it works</span>
          <textarea className="text-input notes" value={rules} onChange={(e) => setRules(e.target.value)} />
        </label>
        {error && <p className="error">{error}</p>}
        <div className="dialog-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={!ready}>
            Save
          </button>
        </div>
      </form>
    </Dialog>
  )
}
