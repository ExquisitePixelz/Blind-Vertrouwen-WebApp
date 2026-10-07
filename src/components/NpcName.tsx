import { npcStatusLabel, type Npc } from '../lib/npcs'

/** An NPC's name with its status chip when not Alive; a Dead NPC is crossed out, like a dead character (1.13). */
export function NpcName({ npc }: { npc: Pick<Npc, 'name' | 'status'> }) {
  if (npc.status === 'alive') return <>{npc.name}</>
  return (
    <>
      {npc.status === 'dead' ? <s>{npc.name}</s> : npc.name}
      <span className={`chip npc-status${npc.status === 'dead' ? ' dead' : ''}`}>{npcStatusLabel(npc.status)}</span>
    </>
  )
}
