import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Dialog, PickDialog, PromptDialog } from '../components/Dialog'
import { TopBar } from '../components/TopBar'
import { useMe } from '../lib/me'
import { loadCharacterNames, type CharacterName } from '../lib/questData'
import {
  KINDS,
  OBJECTIVE_COLUMNS,
  QUEST_COLUMNS,
  currentObjective,
  groupQuests,
  kindText,
  type Objective,
  type Quest,
  type QuestKind,
} from '../lib/quests'
import { must, supabase } from '../lib/supabase'
import { useLoad } from '../lib/useLoad'

/**
 * The Quest Journal (ARCHITECTURE.md 1.9): everyone in the campaign reads
 * it; the DM also sees hidden quests and adds new ones.
 */
export function QuestsPage() {
  const me = useMe()
  const { campaignId = '' } = useParams()
  const [adding, setAdding] = useState(false)

  const data = useLoad(async () => {
    const [quests, objectives, characters] = await Promise.all([
      supabase.from('quests').select(QUEST_COLUMNS).eq('campaign_id', campaignId).is('deleted_at', null).then(must),
      supabase.from('quest_objectives').select(OBJECTIVE_COLUMNS).eq('campaign_id', campaignId).is('deleted_at', null).then(must),
      loadCharacterNames(campaignId),
    ])
    return { quests: quests as Quest[], objectives: objectives as Objective[], characters }
  }, [campaignId])

  const characterName = (id: string) => data.data?.characters.find((c) => c.id === id)?.name
  const groups = groupQuests(data.data?.quests ?? [])

  return (
    <main className="page">
      <TopBar title="Quest Journal" back="/">
        {me.isDm && (
          <button className="icon" aria-label="New quest" onClick={() => setAdding(true)}>
            +
          </button>
        )}
      </TopBar>

      {data.error && <p className="error">{data.error}</p>}
      {data.data?.quests.length === 0 && <p className="muted">No quests yet.</p>}
      {groups.map((group) => {
        const cards = (
          <ul className="list">
            {group.quests.map((quest) => {
              const next = currentObjective(data.data!.objectives.filter((o) => o.quest_id === quest.id))
              const place = [quest.giver, quest.location].filter(Boolean).join(' · ')
              return (
                <li key={quest.id}>
                  <Link to={`/c/${campaignId}/quests/${quest.id}`} className={`row quest-card ${quest.status}`}>
                    <span className={`chip${quest.kind === 'main' ? ' gold' : ''}`}>{kindText(quest, characterName)}</span>
                    <strong className="quest-title">{quest.title}</strong>
                    {place && <span className="muted small">{place}</span>}
                    {next && quest.status !== 'completed' && quest.status !== 'failed' && (
                      <span className="small quest-next">→ {next.text}</span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        )
        const heading = `${group.label} (${group.quests.length})`
        return group.folded ? (
          <details key={group.key} className="quest-group">
            <summary>
              <h2>{heading}</h2>
            </summary>
            {cards}
          </details>
        ) : (
          <section key={group.key} className="quest-group">
            <h2>{group.key === 'hidden' ? `${heading}: players can’t see these yet` : heading}</h2>
            {cards}
          </section>
        )
      })}

      {adding && <NewQuest campaignId={campaignId} characters={data.data?.characters ?? []} onClose={() => setAdding(false)} />}
    </main>
  )
}

/**
 * New quest (DM): asks for the title, then the kind, and for a Character
 * quest the character. It starts hidden and Inactive, and opens. Each
 * dialog closes itself after a choice; `advancing` tells that apart from
 * Cancel, which ends the whole flow.
 */
function NewQuest({ campaignId, characters, onClose }: { campaignId: string; characters: CharacterName[]; onClose: () => void }) {
  const navigate = useNavigate()
  const [title, setTitle] = useState<string | null>(null)
  const [kind, setKind] = useState<QuestKind | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const advancing = useRef(false)
  const next = (step: () => void) => {
    advancing.current = true
    step()
  }
  const closed = () => {
    if (!advancing.current) onClose()
    advancing.current = false
  }

  async function create(kind: QuestKind, characterId: string | null) {
    setBusy(true)
    try {
      const quest = must(
        await supabase
          .from('quests')
          .insert({ campaign_id: campaignId, title, kind, character_id: characterId })
          .select('id')
          .single(),
      ) as { id: string }
      navigate(`/c/${campaignId}/quests/${quest.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  if (error) {
    return (
      <Dialog title="Could not create the quest" onClose={onClose}>
        <p className="error">{error}</p>
        <div className="dialog-actions">
          <button type="button" onClick={onClose}>
            OK
          </button>
        </div>
      </Dialog>
    )
  }
  if (busy) return null
  if (title === null) {
    return <PromptDialog title="New quest" submitLabel="Next" onClose={closed} onSubmit={(t) => next(() => setTitle(t))} />
  }
  if (kind === null) {
    return (
      <PickDialog<QuestKind>
        title="What kind of quest?"
        options={KINDS.filter((k) => k.value !== 'character' || characters.length)}
        onClose={closed}
        onPick={(k) => next(() => (k === 'character' ? setKind(k) : void create(k, null)))}
      />
    )
  }
  return (
    <PickDialog<string>
      title="Whose quest?"
      options={characters.map((c) => ({ value: c.id, label: c.name }))}
      onClose={closed}
      onPick={(id) => next(() => void create('character', id))}
    />
  )
}
