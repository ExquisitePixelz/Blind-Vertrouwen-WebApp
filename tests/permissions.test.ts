// Permission test (ARCHITECTURE.md Phase 2, step 2).
//
// Runs against a THROWAWAY local Supabase (started by the db-test workflow),
// never against the real project. It creates fake users, logs in as each of
// them, and checks what they can and cannot read and change.
//
// Run after every database change: `npm run test:db` (needs `supabase start`).

import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { before, describe, test } from 'node:test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.API_URL ?? 'http://127.0.0.1:54321'
const publicKey = process.env.PUBLISHABLE_KEY || process.env.ANON_KEY
const adminKey = process.env.SECRET_KEY || process.env.SERVICE_ROLE_KEY
if (!publicKey || !adminKey) {
  throw new Error('Set the local keys: eval "$(npx supabase status -o env)"')
}

const noSession = { auth: { persistSession: false, autoRefreshToken: false } }
const admin = createClient(url, adminKey, noSession)
const anon = createClient(url, publicKey, noSession)

// Email sign-ups need a valid invite code (Phase 4.7 hook). Test users are
// made with email, so they carry one, from a campaign made only for this.
let signupCode: string | undefined

async function bootstrapInvite(): Promise<string> {
  const world = ok(await admin.from('worlds').select('id').eq('name', 'Theros').single())
  const campaign = ok(
    await admin.from('campaigns').insert({ world_id: world.id, name: 'Sign-up codes' }).select('id').single(),
  )
  const invite = ok(await admin.from('campaign_invites').insert({ campaign_id: campaign.id }).select('code').single())
  return invite.code
}

async function makeUser(label: string): Promise<{ id: string; db: SupabaseClient }> {
  signupCode ??= await bootstrapInvite()
  const email = `${label}-${randomUUID()}@test.local`
  const password = randomUUID()
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: label, invite_code: signupCode },
  })
  if (error) throw error
  const db = createClient(url, publicKey!, noSession)
  const { error: loginError } = await db.auth.signInWithPassword({ email, password })
  if (loginError) throw loginError
  return { id: data.user.id, db }
}

/** Unwrap a Supabase result, failing the test on an error. */
function ok<T>(result: { data: T; error: unknown }): T {
  if (result.error) assert.fail(`Unexpected error: ${JSON.stringify(result.error)}`)
  return result.data
}

/** The request must fail outright. */
function refused(result: { error: unknown }, message: string) {
  assert.ok(result.error, `${message}: expected an error, but it succeeded`)
}

/** The request must fail or change nothing (RLS filters rows silently). */
function noEffect(result: { data: unknown[] | null; error: unknown }, message: string) {
  if (result.error) return
  assert.equal(result.data?.length ?? 0, 0, `${message}: expected no rows to change`)
}

let dm: Awaited<ReturnType<typeof makeUser>>
let playerA: Awaited<ReturnType<typeof makeUser>>
let playerB: Awaited<ReturnType<typeof makeUser>>
let outsider: Awaited<ReturnType<typeof makeUser>>
let campaignId: string
let otherCampaignId: string
let phenaxId: string
let nyleaId: string
let characterA: { id: string; version: number }
let characterB: { id: string }
let trackA: { id: string; score: number; god_id: string }

before(async () => {
  signupCode = await bootstrapInvite() // before the users are made in parallel
  ;[dm, playerA, playerB, outsider] = await Promise.all([
    makeUser('dm'),
    makeUser('player-a'),
    makeUser('player-b'),
    makeUser('outsider'),
  ])

  // Make the fake DM the DM of Theros (in the throwaway database only).
  ok(await admin.from('worlds').update({ dm_user_id: dm.id }).eq('name', 'Theros').select())

  const world = ok(await dm.db.from('worlds').select('id').eq('name', 'Theros').single())
  const campaign = ok(
    await dm.db.from('campaigns').insert({ world_id: world.id, name: 'Test campaign' }).select().single(),
  )
  campaignId = campaign.id
  const other = ok(
    await dm.db.from('campaigns').insert({ world_id: world.id, name: 'Other campaign' }).select().single(),
  )
  otherCampaignId = other.id

  ok(
    await dm.db.from('campaign_members').insert([
      { campaign_id: campaignId, user_id: playerA.id },
      { campaign_id: campaignId, user_id: playerB.id },
    ]),
  )

  const gods = ok(await dm.db.from('gods').select('id, slug').in('slug', ['phenax', 'nylea']))
  phenaxId = gods.find((g) => g.slug === 'phenax')!.id
  nyleaId = gods.find((g) => g.slug === 'nylea')!.id
})

describe('creating characters', () => {
  test('Player A can create a character with a chosen god; the track starts at 0', async () => {
    const created = ok(
      await playerA.db.rpc('create_character', { p_campaign_id: campaignId, p_name: '  Sopar  ', p_god_id: phenaxId }),
    )
    assert.equal(created.name, 'Sopar')
    assert.equal(created.owner_id, playerA.id)
    assert.equal(created.hp_max, 10)
    characterA = created

    const tracks = ok(await playerA.db.from('piety_tracks').select('*').eq('character_id', created.id))
    assert.equal(tracks.length, 1)
    assert.equal(tracks[0].god_id, phenaxId)
    assert.equal(tracks[0].score, 0)
    assert.equal(tracks[0].owner_id, playerA.id)
    trackA = tracks[0]
  })

  test('A higher starting score cannot be requested', async () => {
    refused(
      await playerA.db.rpc('create_character', {
        p_campaign_id: campaignId,
        p_name: 'Greedy',
        p_god_id: phenaxId,
        p_score: 50,
      }),
      'create_character with a score',
    )
    refused(
      await playerA.db.from('piety_tracks').insert({
        campaign_id: campaignId,
        character_id: characterA.id,
        god_id: nyleaId,
        score: 50,
      }),
      'direct track insert with a score',
    )
  })

  test('Player B can create a character with "No god / other" (no track)', async () => {
    const created = ok(await playerB.db.rpc('create_character', { p_campaign_id: campaignId, p_name: 'Seric' }))
    characterB = created
    const tracks = ok(await playerB.db.from('piety_tracks').select('id').eq('character_id', created.id))
    assert.equal(tracks.length, 0)
  })

  test('An empty name is rejected', async () => {
    refused(await playerA.db.rpc('create_character', { p_campaign_id: campaignId, p_name: '   ' }), 'empty name')
  })

  test('A player cannot create a character in a campaign they are not in', async () => {
    refused(
      await playerA.db.rpc('create_character', { p_campaign_id: otherCampaignId, p_name: 'Sneaky' }),
      'rpc into other campaign',
    )
    refused(
      await playerA.db.from('characters').insert({ campaign_id: otherCampaignId, name: 'Sneaky' }),
      'insert into other campaign',
    )
  })
})

describe('reading and editing characters', () => {
  test("Player B can read Player A's character and piety", async () => {
    const chars = ok(await playerB.db.from('characters').select('id').eq('id', characterA.id))
    assert.equal(chars.length, 1)
    const tracks = ok(await playerB.db.from('piety_tracks').select('score').eq('character_id', characterA.id))
    assert.equal(tracks.length, 1)
  })

  test("Player B cannot edit Player A's character", async () => {
    noEffect(
      await playerB.db
        .from('characters')
        .update({ hp_cur: 1, version: characterA.version })
        .eq('id', characterA.id)
        .select(),
      'B edits A',
    )
    const row = ok(await admin.from('characters').select('hp_cur').eq('id', characterA.id).single())
    assert.equal(row.hp_cur, 10)
  })

  test("Player B cannot delete Player A's character", async () => {
    refused(await playerB.db.rpc('delete_character', { p_character_id: characterA.id }), 'B deletes A via rpc')
    noEffect(await playerB.db.from('characters').delete().eq('id', characterA.id).select(), 'B hard-deletes A')
    const row = ok(await admin.from('characters').select('deleted_at').eq('id', characterA.id).single())
    assert.equal(row.deleted_at, null)
  })

  test('Player A can edit their own character; version and updated_at come from the database', async () => {
    const updated = ok(
      await playerA.db
        .from('characters')
        .update({ hp_cur: 7, class_level: 'Rogue 3', version: characterA.version, updated_at: '2000-01-01T00:00:00Z' })
        .eq('id', characterA.id)
        .select()
        .single(),
    )
    assert.equal(updated.hp_cur, 7)
    assert.equal(updated.version, characterA.version + 1)
    assert.ok(new Date(updated.updated_at).getFullYear() > 2000, 'updated_at was set by the phone')
    characterA = updated
  })

  test('A save with an old version is refused (conflict guard)', async () => {
    const stale = await playerA.db
      .from('characters')
      .update({ hp_cur: 3, version: characterA.version - 1 })
      .eq('id', characterA.id)
      .select()
    refused(stale, 'stale version')
    assert.equal(stale.status, 409)
  })

  test('Rule checks hold: current HP cannot exceed max HP', async () => {
    refused(
      await playerA.db
        .from('characters')
        .update({ hp_cur: 99, version: characterA.version })
        .eq('id', characterA.id)
        .select(),
      'hp_cur > hp_max',
    )
  })

  test('Player A cannot give their character away, move it, or bypass soft delete', async () => {
    for (const change of [
      { owner_id: playerB.id },
      { campaign_id: otherCampaignId },
      { deleted_at: new Date().toISOString() },
    ]) {
      const result = await playerA.db
        .from('characters')
        .update({ ...change, version: characterA.version })
        .eq('id', characterA.id)
        .select()
      if (!result.error) assert.equal(result.data.length, 0, `changed ${Object.keys(change)[0]}`)
    }
    noEffect(await playerA.db.from('characters').delete().eq('id', characterA.id).select(), 'A hard-deletes own')
    const row = ok(await admin.from('characters').select('*').eq('id', characterA.id).single())
    assert.equal(row.owner_id, playerA.id)
    assert.equal(row.campaign_id, campaignId)
    assert.equal(row.deleted_at, null)
  })
})

describe('piety is the DM’s', () => {
  test('Player A cannot change their own score or god', async () => {
    noEffect(
      await playerA.db.from('piety_tracks').update({ score: 20, version: 1 }).eq('id', trackA.id).select(),
      'A sets score',
    )
    noEffect(
      await playerA.db.from('piety_tracks').update({ god_id: nyleaId, version: 1 }).eq('id', trackA.id).select(),
      'A changes god',
    )
    const row = ok(await admin.from('piety_tracks').select('score, god_id').eq('id', trackA.id).single())
    assert.equal(row.score, 0)
    assert.equal(row.god_id, phenaxId)
  })

  test('Player A cannot add a second track or a custom source', async () => {
    refused(
      await playerA.db.from('piety_tracks').insert({ campaign_id: campaignId, character_id: characterA.id, god_id: nyleaId }),
      'second god track',
    )
    refused(
      await playerA.db.from('piety_tracks').insert({
        campaign_id: campaignId,
        character_id: characterA.id,
        custom_source_name: 'Oracle',
      }),
      'custom source',
    )
  })

  test('Player A cannot delete a track', async () => {
    noEffect(await playerA.db.from('piety_tracks').delete().eq('id', trackA.id).select(), 'A deletes track')
    const rows = ok(await admin.from('piety_tracks').select('id').eq('id', trackA.id))
    assert.equal(rows.length, 1)
  })

  test("Player A cannot create a track for Player B's character", async () => {
    refused(
      await playerA.db.from('piety_tracks').insert({ campaign_id: campaignId, character_id: characterB.id, god_id: nyleaId }),
      'track for B',
    )
  })

  test('The DM can change scores and gods, add custom sources and delete tracks', async () => {
    const scored = ok(
      await dm.db.from('piety_tracks').update({ score: 12, version: 1 }).eq('id', trackA.id).select().single(),
    )
    assert.equal(scored.score, 12)
    const moved = ok(
      await dm.db.from('piety_tracks').update({ god_id: nyleaId, version: scored.version }).eq('id', trackA.id).select().single(),
    )
    assert.equal(moved.god_id, nyleaId)

    const oracle = ok(
      await dm.db
        .from('piety_tracks')
        .insert({
          campaign_id: campaignId,
          character_id: characterB.id,
          custom_source_name: 'Oracle',
          custom_source_rules: 'Gains piety by fulfilling prophecies.',
          score: 5,
        })
        .select()
        .single(),
    )
    assert.equal(oracle.score, 5, 'the DM may set a starting score')
    assert.equal(oracle.owner_id, playerB.id, 'track owner follows the character')

    const extra = ok(
      await dm.db
        .from('piety_tracks')
        .insert({ campaign_id: campaignId, character_id: characterB.id, god_id: phenaxId })
        .select()
        .single(),
    )
    ok(await dm.db.from('piety_tracks').update({ deleted_at: new Date().toISOString(), version: 1 }).eq('id', extra.id))
    const visible = ok(await playerB.db.from('piety_tracks').select('id').eq('id', extra.id))
    assert.equal(visible.length, 0)
  })

  test('A track with both a god and a custom source, or neither, is rejected', async () => {
    refused(
      await dm.db.from('piety_tracks').insert({
        campaign_id: campaignId,
        character_id: characterB.id,
        god_id: nyleaId,
        custom_source_name: 'Oracle',
      }),
      'both',
    )
    refused(
      await dm.db.from('piety_tracks').insert({ campaign_id: campaignId, character_id: characterB.id }),
      'neither',
    )
  })

  test("A track's campaign must match its character's campaign", async () => {
    refused(
      await dm.db.from('piety_tracks').insert({ campaign_id: otherCampaignId, character_id: characterB.id, god_id: nyleaId }),
      'mismatched campaign',
    )
  })
})

describe('the DM can do everything', () => {
  test("The DM can edit any character", async () => {
    const current = ok(await dm.db.from('characters').select('version').eq('id', characterB.id).single())
    const updated = ok(
      await dm.db.from('characters').update({ ac: 15, version: current.version }).eq('id', characterB.id).select().single(),
    )
    assert.equal(updated.ac, 15)
  })
})

describe('gods', () => {
  test('Players can read gods but not edit them', async () => {
    const gods = ok(await playerA.db.from('gods').select('id'))
    assert.equal(gods.length, 15)
    noEffect(
      await playerA.db.from('gods').update({ notes: 'hacked', version: 1 }).eq('id', phenaxId).select(),
      'player edits god',
    )
    refused(
      await playerA.db.from('gods').insert({ world_id: (await firstWorldId()), slug: 'fake', name: 'Fake' }),
      'player creates god',
    )
    noEffect(
      await playerA.db.from('god_relationships').insert({ from_god_id: nyleaId, to_god_id: phenaxId, value: 1 }).select(),
      'player sets relationship',
    )
  })

  test('The DM can edit gods and relationships; players see them', async () => {
    const god = ok(await dm.db.from('gods').select('version').eq('id', phenaxId).single())
    const updated = ok(
      await dm.db.from('gods').update({ notes: 'Loves a good lie.', version: god.version }).eq('id', phenaxId).select().single(),
    )
    assert.equal(updated.notes, 'Loves a good lie.')
    ok(await dm.db.from('god_relationships').insert({ from_god_id: nyleaId, to_god_id: phenaxId, value: 2 }))
    const seen = ok(await playerA.db.from('god_relationships').select('value').eq('from_god_id', nyleaId))
    assert.equal(seen.length, 1)
  })

  test('Relationships are sparse: Neutral (4) and self-relationships are not stored', async () => {
    refused(await dm.db.from('god_relationships').insert({ from_god_id: phenaxId, to_god_id: nyleaId, value: 4 }), 'value 4')
    refused(await dm.db.from('god_relationships').insert({ from_god_id: phenaxId, to_god_id: phenaxId, value: 1 }), 'self')
  })
})

describe('outsiders', () => {
  test('A non-member cannot read anything in the campaign, or any gods', async () => {
    for (const table of ['campaigns', 'campaign_members', 'characters', 'piety_tracks', 'gods', 'god_relationships', 'worlds']) {
      const rows = ok(await outsider.db.from(table).select('*'))
      assert.equal(rows.length, 0, `outsider sees ${table}`)
    }
  })

  test('Someone not logged in cannot read anything', async () => {
    for (const table of ['gods', 'characters', 'piety_tracks', 'worlds']) {
      const result = await anon.from(table).select('*')
      assert.ok(result.error || result.data.length === 0, `anonymous sees ${table}`)
    }
  })

  test('Invite codes are only readable by the DM', async () => {
    ok(await dm.db.from('campaign_invites').insert({ campaign_id: campaignId }))
    const rows = ok(await playerA.db.from('campaign_invites').select('*'))
    assert.equal(rows.length, 0)
  })
})

describe('audiences', () => {
  test('A row with audience "dm" is invisible to players', async () => {
    const secret = ok(
      await dm.db.from('characters').insert({ campaign_id: campaignId, name: 'Secret NPC', audience: 'dm' }).select().single(),
    )
    for (const player of [playerA, playerB]) {
      const rows = ok(await player.db.from('characters').select('id').eq('id', secret.id))
      assert.equal(rows.length, 0)
    }
  })

  test('A row with audience "owner" is invisible to other players', async () => {
    const own = ok(
      await playerA.db.from('characters').insert({ campaign_id: campaignId, name: 'Private', audience: 'owner' }).select().single(),
    )
    assert.equal(ok(await playerA.db.from('characters').select('id').eq('id', own.id)).length, 1)
    assert.equal(ok(await playerB.db.from('characters').select('id').eq('id', own.id)).length, 0)
    assert.equal(ok(await dm.db.from('characters').select('id').eq('id', own.id)).length, 1)
  })
})

describe('invites', () => {
  test('A valid invite adds the player; revoked or unknown codes do not', async () => {
    const joiner = await makeUser('joiner')
    const invite = ok(await dm.db.from('campaign_invites').insert({ campaign_id: otherCampaignId }).select().single())
    const revoked = ok(
      await dm.db
        .from('campaign_invites')
        .insert({ campaign_id: otherCampaignId, revoked_at: new Date().toISOString() })
        .select()
        .single(),
    )
    const expired = ok(
      await dm.db
        .from('campaign_invites')
        .insert({ campaign_id: otherCampaignId, expires_at: '2020-01-01T00:00:00Z' })
        .select()
        .single(),
    )

    refused(await joiner.db.rpc('accept_invite', { p_code: 'not-a-real-code' }), 'unknown code')
    refused(await joiner.db.rpc('accept_invite', { p_code: revoked.code }), 'revoked code')
    refused(await joiner.db.rpc('accept_invite', { p_code: expired.code }), 'expired code')
    assert.equal(ok(await joiner.db.from('campaigns').select('id')).length, 0)

    assert.equal(ok(await joiner.db.rpc('accept_invite', { p_code: invite.code })), otherCampaignId)
    const campaigns = ok(await joiner.db.from('campaigns').select('id'))
    assert.deepEqual(campaigns.map((c) => c.id), [otherCampaignId])
    assert.equal(ok(await joiner.db.from('gods').select('id')).length, 15, 'joining a campaign shows the gods')
    refused(await anon.rpc('accept_invite', { p_code: invite.code }), 'anonymous accept')
  })

  test('Players cannot add themselves to a campaign directly', async () => {
    refused(
      await outsider.db.from('campaign_members').insert({ campaign_id: campaignId, user_id: outsider.id }),
      'self-join',
    )
  })
})

describe('deleting characters', () => {
  test('Player A can delete their own character; it and its piety disappear for players, not for the DM', async () => {
    ok(await playerA.db.rpc('delete_character', { p_character_id: characterA.id }))
    assert.equal(ok(await playerB.db.from('characters').select('id').eq('id', characterA.id)).length, 0)
    assert.equal(ok(await playerB.db.from('piety_tracks').select('id').eq('character_id', characterA.id)).length, 0)

    const kept = ok(await dm.db.from('characters').select('deleted_at').eq('id', characterA.id).single())
    assert.ok(kept.deleted_at, 'the DM can still see (and restore) it')
    const tracks = ok(await dm.db.from('piety_tracks').select('deleted_at').eq('character_id', characterA.id))
    assert.ok(tracks.length > 0 && tracks.every((t) => t.deleted_at))
  })

  test('The DM can delete any character', async () => {
    ok(await dm.db.rpc('delete_character', { p_character_id: characterB.id }))
    assert.equal(ok(await playerB.db.from('characters').select('id').eq('id', characterB.id)).length, 0)
  })
})

describe('profiles', () => {
  test('A profile is created at first login, and campaign mates can see each other’s names', async () => {
    const own = ok(await playerA.db.from('profiles').select('display_name').eq('id', playerA.id).single())
    assert.equal(own.display_name, 'player-a')
    assert.equal(ok(await playerA.db.from('profiles').select('id').eq('id', playerB.id)).length, 1)
    assert.equal(ok(await outsider.db.from('profiles').select('id').eq('id', playerA.id)).length, 0)
  })

  test('A player sets only their own display name and last campaign, and only to a campaign they are in', async () => {
    const mine = ok(
      await playerA.db
        .from('profiles')
        .update({ display_name: 'Anna', last_campaign_id: campaignId })
        .eq('id', playerA.id)
        .select()
        .single(),
    )
    assert.equal(mine.display_name, 'Anna')
    assert.equal(mine.last_campaign_id, campaignId)

    refused(
      await playerA.db.from('profiles').update({ last_campaign_id: otherCampaignId }).eq('id', playerA.id).select(),
      'last campaign not a member of',
    )
    noEffect(
      await playerA.db
        .from('profiles')
        .update({ display_name: 'Hacked', last_campaign_id: campaignId })
        .eq('id', playerB.id)
        .select(),
      "A edits B's profile",
    )
    const theirs = ok(await admin.from('profiles').select('display_name, last_campaign_id').eq('id', playerB.id).single())
    assert.equal(theirs.display_name, 'player-b')
    assert.equal(theirs.last_campaign_id, null)

    const dmProfile = ok(
      await dm.db.from('profiles').update({ last_campaign_id: otherCampaignId }).eq('id', dm.id).select().single(),
    )
    assert.equal(dmProfile.last_campaign_id, otherCampaignId, 'the DM may open any campaign')
  })
})

describe('campaign name and subtitle', () => {
  test('Only the DM changes a campaign name or subtitle; players read them', async () => {
    noEffect(
      await playerA.db.from('campaigns').update({ name: 'Hacked', subtitle: 'Hacked' }).eq('id', campaignId).select(),
      'player renames campaign',
    )
    const updated = ok(
      await dm.db
        .from('campaigns')
        .update({ name: 'Test campaign', subtitle: 'The long road' })
        .eq('id', campaignId)
        .select()
        .single(),
    )
    assert.equal(updated.subtitle, 'The long road')
    const seen = ok(await playerA.db.from('campaigns').select('name, subtitle').eq('id', campaignId).single())
    assert.deepEqual(seen, { name: 'Test campaign', subtitle: 'The long road' })
    assert.equal(ok(await outsider.db.from('campaigns').select('id').eq('id', campaignId)).length, 0)
  })
})

describe('invite-only access (Phase 4.6)', () => {
  const exists = async (id: string) => !(await admin.auth.admin.getUserById(id)).error

  test('The DM and campaign members are let in and keep their accounts', async () => {
    assert.equal(ok(await dm.db.rpc('check_access')), true)
    assert.equal(ok(await playerB.db.rpc('check_access')), true)
    assert.ok(await exists(playerB.id))
  })

  test('A stranger is not let in, and their empty account is deleted', async () => {
    const stranger = await makeUser('stranger')
    assert.equal(ok(await stranger.db.rpc('check_access')), false)
    assert.equal(await exists(stranger.id), false)
    assert.equal(ok(await admin.from('profiles').select('id').eq('id', stranger.id)).length, 0)
    refused(await anon.rpc('check_access'), 'anonymous check_access')
  })

  test('Only the DM removes players; a removed player reads nothing and is not let in, but keeps their characters', async () => {
    const leaver = await makeUser('leaver')
    ok(await dm.db.from('campaign_members').insert({ campaign_id: campaignId, user_id: leaver.id }))
    const character = ok(await leaver.db.rpc('create_character', { p_campaign_id: campaignId, p_name: 'Leftover' }))

    noEffect(
      await playerB.db.from('campaign_members').delete().eq('user_id', leaver.id).select(),
      'player removes another player',
    )
    assert.equal(ok(await admin.from('campaign_members').select('user_id').eq('user_id', leaver.id)).length, 1)

    ok(await dm.db.from('campaign_members').delete().eq('campaign_id', campaignId).eq('user_id', leaver.id))
    assert.equal(ok(await leaver.db.from('campaigns').select('id')).length, 0)
    assert.equal(ok(await leaver.db.from('characters').select('id')).length, 0)
    assert.equal(ok(await leaver.db.rpc('check_access')), false)
    assert.ok(await exists(leaver.id), 'an account that owns characters is kept')
    assert.equal(ok(await playerB.db.from('characters').select('id').eq('id', character.id)).length, 1)
  })

  test('A player can delete their own account, with their characters and piety', async () => {
    const quitter = await makeUser('quitter')
    ok(await dm.db.from('campaign_members').insert({ campaign_id: campaignId, user_id: quitter.id }))
    const character = ok(
      await quitter.db.rpc('create_character', { p_campaign_id: campaignId, p_name: 'Gone', p_god_id: phenaxId }),
    )
    ok(await quitter.db.rpc('delete_my_account'))
    assert.equal(await exists(quitter.id), false)
    assert.equal(ok(await admin.from('characters').select('id').eq('id', character.id)).length, 0)
    assert.equal(ok(await admin.from('piety_tracks').select('id').eq('character_id', character.id)).length, 0)
    assert.equal(ok(await admin.from('campaign_members').select('user_id').eq('user_id', quitter.id)).length, 0)
  })

  test('The DM account cannot be deleted, and nobody can delete it logged out', async () => {
    refused(await dm.db.rpc('delete_my_account'), 'DM deletes own account')
    assert.ok(await exists(dm.id))
    refused(await anon.rpc('delete_my_account'), 'anonymous delete_my_account')
  })
})

describe('email sign-up needs an invite (Phase 4.7)', () => {
  const signUp = (invite_code?: string) =>
    createClient(url, publicKey!, noSession).auth.signUp({
      email: `signup-${randomUUID()}@test.local`,
      password: randomUUID(),
      options: { data: { full_name: 'New Player', invite_code } },
    })

  test('Without an invite code, or with a revoked or expired one, no account is created', async () => {
    const revoked = ok(
      await dm.db
        .from('campaign_invites')
        .insert({ campaign_id: campaignId, revoked_at: new Date().toISOString() })
        .select('code')
        .single(),
    )
    const expired = ok(
      await dm.db
        .from('campaign_invites')
        .insert({ campaign_id: campaignId, expires_at: '2020-01-01T00:00:00Z' })
        .select('code')
        .single(),
    )
    for (const [code, label] of [
      [undefined, 'no code'],
      ['not-a-real-code', 'unknown code'],
      [revoked.code, 'revoked code'],
      [expired.code, 'expired code'],
    ]) {
      const result = await signUp(code)
      assert.ok(result.error, `${label}: expected the sign-up to be refused`)
      assert.equal(result.data.user, null, `${label}: an account was created`)
    }
  })

  test('With a valid invite code the account is created, named from the form, and can join', async () => {
    const invite = ok(await dm.db.from('campaign_invites').insert({ campaign_id: campaignId }).select('code').single())
    const result = await signUp(invite.code)
    assert.equal(result.error, null, JSON.stringify(result.error))
    const user = result.data.user!
    const profile = ok(await admin.from('profiles').select('display_name').eq('id', user.id).single())
    assert.equal(profile.display_name, 'New Player')
    assert.equal(ok(await admin.from('campaign_members').select('user_id').eq('user_id', user.id)).length, 0, 'the code alone does not join')
  })
})

describe('sessions (Phase 5)', () => {
  let first: { id: string; number: number; version: number }

  test('The DM starts numbering at a chosen number, then continues from the highest', async () => {
    first = ok(await dm.db.rpc('create_session', { p_campaign_id: campaignId, p_number: 53 }))
    assert.equal(first.number, 53)
    assert.match((first as unknown as { played_on: string }).played_on, /^\d{4}-\d{2}-\d{2}$/)
    const next = ok(await dm.db.rpc('create_session', { p_campaign_id: campaignId }))
    assert.equal(next.number, 54)
    const elsewhere = ok(await dm.db.rpc('create_session', { p_campaign_id: otherCampaignId }))
    assert.equal(elsewhere.number, 1, 'each campaign has its own numbering')
  })

  test('Two live sessions in one campaign cannot share a number; a deleted one does not block it', async () => {
    refused(await dm.db.rpc('create_session', { p_campaign_id: campaignId, p_number: 54 }), 'duplicate via rpc')
    refused(
      await dm.db.from('sessions').update({ number: 54, version: first.version }).eq('id', first.id).select(),
      'renumber onto a live number',
    )
    const s54 = ok(await dm.db.from('sessions').select('id, version').eq('campaign_id', campaignId).eq('number', 54).single())
    ok(await dm.db.from('sessions').update({ deleted_at: new Date().toISOString(), version: s54.version }).eq('id', s54.id))
    const again = ok(await dm.db.rpc('create_session', { p_campaign_id: campaignId }))
    assert.equal(again.number, 54, 'highest live number + 1')
  })

  test('Players and non-members cannot read or write sessions', async () => {
    for (const user of [playerA, playerB, outsider]) {
      assert.equal(ok(await user.db.from('sessions').select('id')).length, 0, 'reads sessions')
      refused(await user.db.rpc('create_session', { p_campaign_id: campaignId, p_number: 99 }), 'create via rpc')
      refused(await user.db.from('sessions').insert({ campaign_id: campaignId, number: 98 }), 'insert')
      noEffect(
        await user.db.from('sessions').update({ notes: 'hacked', version: first.version }).eq('id', first.id).select(),
        'update',
      )
      noEffect(await user.db.from('sessions').delete().eq('id', first.id).select(), 'delete')
    }
    const row = ok(await admin.from('sessions').select('notes').eq('id', first.id).single())
    assert.equal(row.notes, '')
    refused(await anon.from('sessions').insert({ campaign_id: campaignId, number: 97 }), 'anonymous insert')
  })

  test('Attendance is the DM’s only; unticking removes the row', async () => {
    const hero = ok(await dm.db.rpc('create_character', { p_campaign_id: campaignId, p_name: 'Present' }))
    ok(await dm.db.from('session_attendance').insert({ session_id: first.id, character_id: hero.id }))
    refused(
      await dm.db.from('session_attendance').insert({ session_id: first.id, character_id: hero.id }),
      'ticked twice',
    )
    for (const user of [playerA, playerB, outsider]) {
      assert.equal(ok(await user.db.from('session_attendance').select('session_id')).length, 0, 'reads attendance')
      refused(
        await user.db.from('session_attendance').insert({ session_id: first.id, character_id: hero.id }),
        'player ticks',
      )
      noEffect(await user.db.from('session_attendance').delete().eq('session_id', first.id).select(), 'player unticks')
    }
    ok(await dm.db.from('session_attendance').delete().eq('session_id', first.id).eq('character_id', hero.id))
    assert.equal(ok(await dm.db.from('session_attendance').select('session_id').eq('session_id', first.id)).length, 0)
  })
})

describe('player features (Phase 6)', () => {
  let kit: { id: string; version: number }
  let bex: { id: string }
  let rope: { id: string; version: number }
  const privateRow = (user: { db: SupabaseClient }, characterId: string) =>
    user.db.from('character_private').select('*').eq('character_id', characterId)

  before(async () => {
    kit = ok(await playerA.db.rpc('create_character', { p_campaign_id: campaignId, p_name: 'Kit', p_god_id: nyleaId }))
    bex = ok(await playerB.db.rpc('create_character', { p_campaign_id: campaignId, p_name: 'Bex' }))
  })

  test('Every new character gets a private row that only its owner and the DM can read', async () => {
    const mine = ok(await privateRow(playerA, kit.id))
    assert.equal(mine.length, 1)
    assert.equal(mine[0].owner_id, playerA.id)
    assert.equal(mine[0].campaign_id, campaignId)
    assert.equal(mine[0].audience, 'owner')
    assert.equal(mine[0].gp, 0)
    assert.equal(ok(await privateRow(dm, kit.id)).length, 1)
    assert.equal(ok(await privateRow(playerB, kit.id)).length, 0)
    assert.equal(ok(await privateRow(outsider, kit.id)).length, 0)

    const direct = ok(
      await playerA.db.from('characters').insert({ campaign_id: campaignId, name: 'Direct' }).select().single(),
    )
    assert.equal(ok(await privateRow(playerA, direct.id)).length, 1, 'a directly inserted character')
  })

  test('Backstory: other players read it but cannot change it', async () => {
    kit = ok(
      await playerA.db.from('characters').update({ backstory: 'Raised by wolves.', version: kit.version }).eq('id', kit.id).select().single(),
    )
    const seen = ok(await playerB.db.from('characters').select('backstory').eq('id', kit.id).single())
    assert.equal(seen.backstory, 'Raised by wolves.')
    noEffect(
      await playerB.db.from('characters').update({ backstory: 'hacked', version: kit.version }).eq('id', kit.id).select(),
      'another player edits the backstory',
    )
  })

  test('The owner and the DM edit private notes and coins; nobody else can', async () => {
    let row = ok(await privateRow(playerA, kit.id))[0]
    row = ok(
      await playerA.db.from('character_private').update({ notes: 'Owes Bex 5 gp', gp: 12, version: row.version }).eq('id', row.id).select().single(),
    )
    assert.equal(row.gp, 12)
    for (const user of [playerB, outsider]) {
      noEffect(
        await user.db.from('character_private').update({ gp: 999, version: row.version }).eq('id', row.id).select(),
        'someone else edits coins',
      )
    }
    refused(
      await playerA.db.from('character_private').update({ gp: -1, version: row.version }).eq('id', row.id).select(),
      'negative coins',
    )
    refused(
      await playerA.db.from('character_private').update({ audience: 'members', version: row.version }).eq('id', row.id).select(),
      'player makes private notes public',
    )
    refused(
      await playerA.db.from('character_private').update({ owner_id: playerB.id, version: row.version }).eq('id', row.id).select(),
      'player gives the row away',
    )
    refused(
      await playerA.db.from('character_private').update({ deleted_at: new Date().toISOString(), version: row.version }).eq('id', row.id).select(),
      'player soft-deletes the row',
    )
    refused(
      await playerA.db.from('character_private').insert({ character_id: kit.id, campaign_id: campaignId }),
      'player inserts a second private row',
    )
    noEffect(await playerA.db.from('character_private').delete().eq('id', row.id).select(), 'player deletes the row')

    row = ok(await dm.db.from('character_private').update({ pp: 3, version: row.version }).eq('id', row.id).select().single())
    assert.equal(row.pp, 3)
    assert.equal(row.notes, 'Owes Bex 5 gp')
  })

  test('The owner adds and edits items on their own character only; other players see nothing', async () => {
    rope = ok(
      await playerA.db
        .from('inventory_items')
        .insert({ character_id: kit.id, campaign_id: otherCampaignId, name: 'Rope', weight: 10 })
        .select()
        .single(),
    )
    assert.equal(rope.owner_id, playerA.id)
    assert.equal(rope.campaign_id, campaignId, 'the campaign comes from the character')
    assert.equal(rope.quantity, 1)
    assert.equal(rope.audience, 'owner')

    for (const user of [playerB, outsider]) {
      assert.equal(ok(await user.db.from('inventory_items').select('id').eq('id', rope.id)).length, 0, 'reads the item')
      noEffect(
        await user.db.from('inventory_items').update({ name: 'hacked', version: rope.version }).eq('id', rope.id).select(),
        'edits the item',
      )
      refused(await user.db.rpc('delete_item', { p_item_id: rope.id }), 'deletes the item')
    }
    refused(
      await playerB.db.from('inventory_items').insert({ character_id: kit.id, campaign_id: campaignId, name: 'Gift' }),
      "adds an item to someone else's character",
    )
    refused(
      await playerA.db.from('inventory_items').insert({ character_id: bex.id, campaign_id: campaignId, name: 'Gift' }),
      "adds an item to someone else's character",
    )
    refused(
      await outsider.db.from('inventory_items').insert({ character_id: kit.id, campaign_id: campaignId, name: 'Gift' }),
      'a non-member adds an item',
    )
    refused(
      await playerA.db.from('inventory_items').insert({ character_id: kit.id, campaign_id: campaignId, name: 'Shared', audience: 'members' }),
      'a player makes an item public',
    )
    refused(
      await playerA.db.from('inventory_items').insert({ character_id: kit.id, campaign_id: campaignId, name: '  ' }),
      'an empty name',
    )

    rope = ok(
      await playerA.db.from('inventory_items').update({ quantity: 2, equipped: true, version: rope.version }).eq('id', rope.id).select().single(),
    )
    assert.equal(rope.quantity, 2)
    for (const bad of [{ quantity: -1 }, { weight: -0.5 }, { character_id: bex.id }, { audience: 'members' }]) {
      refused(
        await playerA.db.from('inventory_items').update({ ...bad, version: rope.version }).eq('id', rope.id).select(),
        `player sets ${JSON.stringify(bad)}`,
      )
    }

    const fromDm = ok(
      await dm.db.from('inventory_items').insert({ character_id: kit.id, campaign_id: campaignId, name: 'Cursed ring' }).select().single(),
    )
    assert.equal(fromDm.owner_id, playerA.id, "an item the DM adds belongs to the character's owner")
    rope = ok(await dm.db.from('inventory_items').update({ weight: 5, version: rope.version }).eq('id', rope.id).select().single())
    assert.equal(Number(rope.weight), 5)
  })

  test('Items are deleted only through delete_item, softly', async () => {
    noEffect(await playerA.db.from('inventory_items').delete().eq('id', rope.id).select(), 'hard delete')
    refused(
      await playerA.db.from('inventory_items').update({ deleted_at: new Date().toISOString(), version: rope.version }).eq('id', rope.id).select(),
      'setting deleted_at directly',
    )
    ok(await playerA.db.rpc('delete_item', { p_item_id: rope.id }))
    assert.equal(ok(await playerA.db.from('inventory_items').select('id').eq('id', rope.id)).length, 0)
    const kept = ok(await admin.from('inventory_items').select('deleted_at').eq('id', rope.id).single())
    assert.ok(kept.deleted_at, 'the row is kept, marked deleted')
    refused(await playerA.db.rpc('delete_item', { p_item_id: rope.id }), 'deleting twice')
  })

  test('If the DM gives a character to someone else, its private row and items go with it', async () => {
    const pet = ok(await playerA.db.rpc('create_character', { p_campaign_id: campaignId, p_name: 'Pet' }))
    const item = ok(
      await playerA.db.from('inventory_items').insert({ character_id: pet.id, campaign_id: campaignId, name: 'Collar' }).select().single(),
    )
    ok(await dm.db.from('characters').update({ owner_id: playerB.id, version: pet.version }).eq('id', pet.id).select())
    assert.equal(ok(await privateRow(playerB, pet.id)).length, 1)
    assert.equal(ok(await privateRow(playerA, pet.id)).length, 0)
    assert.equal(ok(await playerB.db.from('inventory_items').select('id').eq('id', item.id)).length, 1)
    assert.equal(ok(await playerA.db.from('inventory_items').select('id').eq('id', item.id)).length, 0)
  })

  test('Deleting a character hides its private row and items from players, not from the DM', async () => {
    const item = ok(
      await playerA.db.from('inventory_items').insert({ character_id: kit.id, campaign_id: campaignId, name: 'Torch' }).select().single(),
    )
    ok(await playerA.db.rpc('delete_character', { p_character_id: kit.id }))
    assert.equal(ok(await privateRow(playerA, kit.id)).length, 0)
    assert.equal(ok(await playerA.db.from('inventory_items').select('id').eq('character_id', kit.id)).length, 0)
    assert.equal(ok(await privateRow(dm, kit.id)).length, 1)
    assert.equal(ok(await dm.db.from('inventory_items').select('id, deleted_at').eq('id', item.id).single()).deleted_at !== null, true)
    refused(
      await playerA.db.from('inventory_items').insert({ character_id: kit.id, campaign_id: campaignId, name: 'Late' }),
      'adding an item to a deleted character',
    )
  })

  test('Deleting an account removes its private rows and items for good', async () => {
    const quitter = await makeUser('quitter-items')
    ok(await dm.db.from('campaign_members').insert({ campaign_id: campaignId, user_id: quitter.id }))
    const character = ok(await quitter.db.rpc('create_character', { p_campaign_id: campaignId, p_name: 'Packed' }))
    ok(await quitter.db.from('inventory_items').insert({ character_id: character.id, campaign_id: campaignId, name: 'Bag' }))
    ok(await quitter.db.rpc('delete_my_account'))
    assert.equal(ok(await admin.from('character_private').select('id').eq('character_id', character.id)).length, 0)
    assert.equal(ok(await admin.from('inventory_items').select('id').eq('character_id', character.id)).length, 0)
  })

  test('Someone not logged in cannot read or write either table', async () => {
    for (const table of ['character_private', 'inventory_items']) {
      const result = await anon.from(table).select('*')
      assert.ok(result.error || result.data.length === 0, `anonymous sees ${table}`)
    }
    refused(
      await anon.from('inventory_items').insert({ character_id: bex.id, campaign_id: campaignId, name: 'Spam' }),
      'anonymous insert',
    )
    refused(await anon.rpc('delete_item', { p_item_id: rope.id }), 'anonymous delete_item')
  })
})

async function firstWorldId(): Promise<string> {
  return ok(await dm.db.from('worlds').select('id').limit(1).single()).id
}
