// Five fake members exercising the whole backend through the public API, as phones would.
// WIPES the night and every member (reset_night) at start and end, hence --reset.
//
//   npm run bots -- --reset          run the checks and leave an empty night
//   npm run bots -- --reset --stay   then keep five bots drinking, to watch /tv (Ctrl+C stops)
//
// Env (from the shell or .env.local): VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.
// BOTS_SUPABASE_URL / BOTS_SUPABASE_KEY override them.
import assert from 'node:assert/strict'
import WebSocket from 'ws'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createApi } from '../src/lib/api'
import { createSupabase } from '../src/lib/client'
import { PrositError } from '../src/lib/errors'
import type { Identity } from '../src/lib/types'
import type { ErrorCode } from '../src/shared/content/errors'
import { STRAFE_REASONS } from '../src/shared/content/strafen'
import { strafeTally, tallyDrinks } from '../src/shared/game/drinks'
import { MAX_MEMBERS, MAX_NAME_LENGTH, MEMBER_COLOURS } from '../src/shared/game/members'
import { createRng } from '../src/shared/game/rng'
import { DRINK_KINDS, type Resolution } from '../src/shared/game/types'

if (!process.argv.includes('--reset')) {
  console.error('bots: this wipes the night and every member. Run with --reset to confirm.')
  process.exit(2)
}
const stay = process.argv.includes('--stay')
try {
  process.loadEnvFile('.env.local')
} catch {
  // No .env.local: rely on the shell env.
}

const url = process.env.BOTS_SUPABASE_URL || process.env.VITE_SUPABASE_URL
const key = process.env.BOTS_SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY
if (!url || !key) {
  console.error('bots: missing Supabase URL or key (see the header of scripts/bots.ts).')
  process.exit(2)
}

const db: SupabaseClient = createSupabase(url, key, { realtime: { transport: WebSocket as never } })
const api = createApi(db)

// Helpers ------------------------------------------------------------------------------------

async function step(name: string, fn: () => Promise<void>) {
  const t0 = Date.now()
  try {
    await fn()
    console.log(`PASS  ${name} (${Date.now() - t0} ms)`)
  } catch (err) {
    console.log(`FAIL  ${name}`)
    console.error(err)
    await db.removeAllChannels()
    process.exit(1)
  }
}

async function expectCode(promise: Promise<unknown>, code: ErrorCode) {
  try {
    await promise
  } catch (err) {
    assert.ok(err instanceof PrositError, `expected PrositError(${code}), got ${String(err)}`)
    assert.equal(err.code, code)
    return
  }
  assert.fail(`expected error ${code}, but the call succeeded`)
}

async function waitFor(label: string, check: () => boolean, timeoutMs = 10000) {
  const until = Date.now() + timeoutMs
  while (!check()) {
    if (Date.now() > until) assert.fail(`timed out waiting for ${label}`)
    await new Promise((r) => setTimeout(r, 50))
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Empties everything. Needs a member to call it, so a throwaway one joins if the club is empty. */
async function wipe() {
  const night = await api.getNight()
  const members = await api.getMembers()
  const drinks = await api.getDrinks()
  if (night.status === 'idle' && members.length === 0 && drinks.length === 0) return
  // A full or ended club cannot be joined, and the tokens of whoever is in it are not ours.
  // The local stack is reset with `npx supabase db reset` in that case.
  const janitor = await api.join('Hausmeister', '#000000')
  await api.resetNight({ memberId: janitor.id, token: janitor.token }, true)
}

const NAMES = ['Herr Präsident', 'Graf von Maß', 'Baron Schnaps', 'Doktor Bier', 'Onkel Wasser']
const bots: Identity[] = []
const names = new Map<string, string>()

// Steps --------------------------------------------------------------------------------------

console.log(`bots: ${new URL(url).host}`)

await step('reset to an empty idle night', async () => {
  await wipe()
  const night = await api.getNight()
  assert.equal(night.status, 'idle')
  assert.equal(night.seed, null)
  assert.equal(night.intervalMin, 12)
  assert.deepEqual(await api.getMembers(), [])
  assert.deepEqual(await api.getDrinks(), [])
})

await step('server clock is close to ours', async () => {
  const serverMs = await api.serverNow()
  assert.ok(Math.abs(serverMs - Date.now()) < 60_000, `server clock is ${serverMs - Date.now()} ms off`)
})

// Realtime: everything the later steps write must arrive here too.
const seen = { members: 0, drinkInserts: 0, drinkDeletes: 0, strafen: 0, events: 0, night: 0 }
await step('realtime channel subscribes', async () => {
  let subscribed = false
  db.channel('bots')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'members' }, () => void seen.members++)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'drinks' }, (change) => {
      if (change.eventType === 'INSERT') seen.drinkInserts++
      if (change.eventType === 'DELETE') seen.drinkDeletes++
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'strafen' }, () => void seen.strafen++)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => void seen.events++)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'night' }, () => void seen.night++)
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') subscribed = true
    })
  await waitFor('SUBSCRIBED', () => subscribed)
  // Postgres confirms the subscription a moment after the socket does.
  await sleep(1500)
})

await step('five members join', async () => {
  const before = seen.members
  for (const [i, name] of NAMES.entries()) {
    const created = await api.join(`  ${name}  `, MEMBER_COLOURS[i].toUpperCase())
    bots.push({ memberId: created.id, token: created.token })
    names.set(created.id, name)
  }
  const members = await api.getMembers()
  assert.deepEqual(members.map((m) => m.name), NAMES)
  assert.deepEqual(members.map((m) => m.colour), MEMBER_COLOURS.slice(0, 5))
  await waitFor('member inserts over realtime', () => seen.members - before >= 5)
})

await step('join refuses bad names, taken names and taken colours', async () => {
  await expectCode(api.join('   ', MEMBER_COLOURS[5]), 'name_empty')
  await expectCode(api.join('x'.repeat(MAX_NAME_LENGTH + 1), MEMBER_COLOURS[5]), 'name_too_long')
  await expectCode(api.join('herr präsident', MEMBER_COLOURS[5]), 'name_taken')
  await expectCode(api.join('Neuling', MEMBER_COLOURS[0]), 'colour_taken')
  await expectCode(api.join('Neuling', 'red'), 'colour_invalid')
  assert.equal((await api.getMembers()).length, 5)
})

await step('the club is full at the member cap', async () => {
  for (let i = 5; i < MAX_MEMBERS; i++) await api.join(`Gast ${i}`, MEMBER_COLOURS[i])
  assert.equal((await api.getMembers()).length, MAX_MEMBERS)
  await expectCode(api.join('Zu viel', '#123456'), 'club_full')
  // Out again: deleting members is not an RPC, so reset with wipe and rejoin the five.
  await api.resetNight(bots[0], true)
  assert.deepEqual(await api.getMembers(), [])
  await expectCode(api.logDrink(bots[0], 'ol'), 'member_not_found')
  bots.length = 0
  names.clear()
  for (const [i, name] of NAMES.entries()) {
    const created = await api.join(name, MEMBER_COLOURS[i])
    bots.push({ memberId: created.id, token: created.token })
    names.set(created.id, name)
  }
  assert.equal((await api.getMembers()).length, 5)
})

await step('bad tokens are refused', async () => {
  const stolen = { memberId: bots[0].memberId, token: bots[1].token }
  await expectCode(api.logDrink(stolen, 'ol'), 'invalid_token')
  await expectCode(api.undoDrink(stolen), 'invalid_token')
  await expectCode(api.giveStrafe(stolen, bots[2].memberId, 'Fusk'), 'invalid_token')
  await expectCode(api.startNight(stolen), 'invalid_token')
  await expectCode(api.resetNight(stolen), 'invalid_token')
  const ghost = { memberId: '00000000-0000-4000-8000-000000000000', token: bots[0].token }
  await expectCode(api.logDrink(ghost, 'ol'), 'member_not_found')
})

await step('drinks are logged and undone', async () => {
  const before = { inserts: seen.drinkInserts, deletes: seen.drinkDeletes }
  await expectCode(api.undoDrink(bots[0]), 'nothing_to_undo')
  await expectCode(api.logDrink(bots[0], 'havremjolk' as never), 'drink_invalid')

  for (const kind of DRINK_KINDS) {
    const row = await api.logDrink(bots[0], kind)
    assert.equal(row.kind, kind)
    assert.equal(row.memberId, bots[0].memberId)
  }
  await api.logDrink(bots[1], 'mass')
  await api.logDrink(bots[1], 'mass')

  // Before the undo: Realtime checks a change against the row as it is now, so an insert whose
  // row is already gone again is never delivered.
  await waitFor('drink inserts over realtime', () => seen.drinkInserts - before.inserts >= 6)

  // Undo takes the caller's latest drink (the Wasser) and nobody else's.
  await api.undoDrink(bots[0])
  const drinks = await api.getDrinks()
  const ids = bots.map((b) => b.memberId)
  const [a, b, c] = tallyDrinks(drinks, ids)
  assert.deepEqual(a.counts, { ol: 1, mass: 1, schnaps: 1, wasser: 0 })
  assert.equal(a.cl, 154)
  assert.equal(b.cl, 200)
  assert.equal(c.cl, 0)
  await waitFor('the undo over realtime', () => seen.drinkDeletes - before.deletes >= 1)
})

await step('Strafen are handed out', async () => {
  const before = seen.strafen
  await expectCode(api.giveStrafe(bots[0], bots[1].memberId, '  '), 'reason_empty')
  await expectCode(api.giveStrafe(bots[0], bots[1].memberId, 'x'.repeat(81)), 'reason_too_long')
  await expectCode(api.giveStrafe(bots[0], '00000000-0000-4000-8000-000000000000', 'Fusk'), 'target_not_found')

  const row = await api.giveStrafe(bots[0], bots[1].memberId, `  ${STRAFE_REASONS[0]}  `)
  assert.equal(row.reason, STRAFE_REASONS[0])
  assert.equal(row.givenBy, bots[0].memberId)
  assert.equal(row.eventId, null)
  await api.giveStrafe(bots[2], bots[2].memberId, 'Självkritik')

  assert.deepEqual(strafeTally(await api.getStrafen()), { [bots[1].memberId]: 1, [bots[2].memberId]: 1 })
  await waitFor('Strafen over realtime', () => seen.strafen - before >= 2)
})

await step('anon cannot write tables or read member_secrets', async () => {
  const m = bots[0].memberId
  const writes = [
    db.from('members').insert({ name: 'Hacker', colour: '#abcdef' }),
    db.from('drinks').insert({ member_id: m, kind: 'ol' }),
    db.from('strafen').insert({ member_id: m, reason: 'Fusk' }),
    db.from('points').insert({ member_id: m, amount: 1000, reason: 'Fusk' }),
    db.from('events').insert({ seq: 99, kind: 'prosit', payload: { kind: 'prosit' }, ends_at: new Date().toISOString() }),
    db.from('night').update({ status: 'ended' }).eq('id', true).select(),
    db.from('drinks').delete().eq('member_id', m).select(),
    db.from('members').update({ name: 'Hacker' }).eq('id', m).select(),
  ]
  for (const [i, write] of writes.entries()) {
    const res = await write
    const blocked = res.error !== null || (Array.isArray(res.data) && res.data.length === 0)
    assert.ok(blocked, `write ${i} went through`)
  }
  const secrets = await db.from('member_secrets').select('*')
  assert.ok(secrets.error !== null || (secrets.data ?? []).length === 0, 'member_secrets is readable')
  const priv = await db.rpc('check_member', { p_member_id: m, p_token: bots[0].token })
  assert.ok(priv.error !== null, 'private.check_member is callable')

  assert.equal((await api.getMember(m))?.name, NAMES[0])
  assert.equal((await api.getNight()).status, 'idle')
  assert.equal((await api.getDrinks()).length, 5)
  assert.equal((await api.getPoints()).length, 0)
})

await step('interval and start of the night', async () => {
  await expectCode(api.setInterval(bots[0], 0.1), 'interval_invalid')
  await expectCode(api.setInterval(bots[0], 61), 'interval_invalid')
  assert.equal((await api.setInterval(bots[3], 0.5)).intervalMin, 0.5)
  assert.equal((await api.setInterval(bots[3], 8)).intervalMin, 8)

  // No event may spawn before the night is live.
  assert.equal(await api.spawnEvent(bots[0], 1, { kind: 'prosit' }, Date.now() + 60_000), false)

  // Two members tap "Starta kvällen" at once: one night, one seed.
  const [a, b] = await Promise.all([api.startNight(bots[0]), api.startNight(bots[1])])
  assert.equal(a.status, 'live')
  assert.equal(b.status, 'live')
  assert.ok(a.seed !== null && a.seed === b.seed, 'both callers see the same seed')
  assert.equal(a.startedAt, b.startedAt)
  await waitFor('night update over realtime', () => seen.night >= 1)
})

let eventId = ''
await step('five engines race: one spawn, one resolve', async () => {
  const endsAt = Date.now() + 60_000
  const spawned = await Promise.all(bots.map((b) => api.spawnEvent(b, 1, { kind: 'prosit' }, endsAt)))
  assert.equal(spawned.filter(Boolean).length, 1, 'exactly one spawn wins')
  // The kind column and the payload must agree.
  const mismatch = await db.rpc('spawn_event', {
    p_member_id: bots[0].memberId,
    p_token: bots[0].token,
    p_seq: 2,
    p_kind: 'regel',
    p_payload: { kind: 'prosit' },
    p_ends_at: new Date(endsAt).toISOString(),
  })
  assert.equal(mismatch.error?.message, 'event_invalid')

  let events = await api.getEvents()
  assert.equal(events.length, 1)
  const event = events[0]
  eventId = event.id
  assert.equal(event.seq, 1)
  assert.equal(event.status, 'live')
  assert.deepEqual(event.payload, { kind: 'prosit' })
  assert.equal(event.result, null)
  assert.ok(Math.abs(event.endsAt - endsAt) < 5, 'ends_at survives the round trip')

  // Four answer, one of them twice; the fifth misses.
  for (const b of bots.slice(0, 4)) assert.equal(await api.respond(b, event.id, { kind: 'prosit' }), true)
  assert.equal(await api.respond(bots[0], event.id, { kind: 'prosit' }), false)
  const responses = await api.getResponses(event.id)
  assert.deepEqual(responses.map((r) => r.memberId), bots.slice(0, 4).map((b) => b.memberId))

  const resolution: Resolution = {
    result: { kind: 'prosit', order: responses.map((r) => r.memberId), missed: [bots[4].memberId] },
    points: [{ memberId: bots[0].memberId, amount: 3, reason: 'Snabbast' }],
    strafen: [
      { memberId: bots[3].memberId, reason: 'Sist i skålen' },
      { memberId: bots[4].memberId, reason: 'Missade skålen' },
    ],
  }
  const strafenBefore = (await api.getStrafen()).length
  const resolved = await Promise.all(bots.map((b) => api.resolveEvent(b, event.id, resolution)))
  assert.equal(resolved.filter(Boolean).length, 1, 'exactly one resolve wins')

  events = await api.getEvents()
  assert.equal(events[0].status, 'done')
  assert.deepEqual(events[0].result, resolution.result)
  const points = await api.getPoints()
  assert.equal(points.length, 1)
  assert.deepEqual(
    { memberId: points[0].memberId, amount: points[0].amount, reason: points[0].reason, eventId: points[0].eventId },
    { memberId: bots[0].memberId, amount: 3, reason: 'Snabbast', eventId: event.id },
  )
  const strafen = await api.getStrafen()
  assert.equal(strafen.length - strafenBefore, 2)
  assert.equal(strafen.at(-1)?.givenBy, null)
  assert.equal(strafen.at(-1)?.eventId, event.id)

  await expectCode(api.respond(bots[4], event.id, { kind: 'prosit' }), 'event_closed')
  await waitFor('event insert and update over realtime', () => seen.events >= 2)
})

await step('the night ends and the log closes', async () => {
  const [a, b] = await Promise.all([api.endNight(bots[0]), api.endNight(bots[1])])
  assert.equal(a.status, 'ended')
  assert.equal(b.status, 'ended')
  assert.ok(a.endedAt !== null)

  await expectCode(api.logDrink(bots[0], 'ol'), 'night_ended')
  await expectCode(api.undoDrink(bots[0]), 'night_ended')
  await expectCode(api.giveStrafe(bots[0], bots[1].memberId, 'För sent'), 'night_ended')
  await expectCode(api.startNight(bots[0]), 'night_ended')
  await expectCode(api.join('Sen gäst', MEMBER_COLOURS[6]), 'night_ended')
  assert.equal(await api.spawnEvent(bots[0], 2, { kind: 'prosit' }, Date.now() + 60_000), false)
  assert.equal((await api.getEvents()).length, 1)
  assert.ok(eventId)
})

await step('reset keeps the members, wipe removes them', async () => {
  await api.resetNight(bots[2])
  const night = await api.getNight()
  assert.deepEqual(
    { status: night.status, seed: night.seed, startedAt: night.startedAt, endedAt: night.endedAt, intervalMin: night.intervalMin },
    { status: 'idle', seed: null, startedAt: null, endedAt: null, intervalMin: 12 },
  )
  assert.equal((await api.getMembers()).length, 5)
  assert.deepEqual(await api.getDrinks(), [])
  assert.deepEqual(await api.getEvents(), [])
  assert.deepEqual(await api.getStrafen(), [])
  assert.deepEqual(await api.getPoints(), [])

  if (!stay) {
    await api.resetNight(bots[2], true)
    assert.deepEqual(await api.getMembers(), [])
  }
})

if (!stay) {
  await db.removeAllChannels()
  console.log('bots: all steps passed')
  process.exit(0)
}

// --stay: a slow, seeded evening so the TV has something to show. --------------------------------

console.log('bots: staying. Five members are drinking, open /tv. Ctrl+C to stop (the data stays).')
const rng = createRng(1887)
const KINDS = ['ol', 'ol', 'ol', 'ol', 'ol', 'mass', 'mass', 'schnaps', 'schnaps', 'wasser'] as const

for (;;) {
  await sleep(rng.float(1500, 4500))
  const who = rng.pick(bots)
  const roll = rng.next()
  try {
    if (roll < 0.08) {
      const target = rng.pick(bots)
      const reason = rng.pick(STRAFE_REASONS)
      await api.giveStrafe(who, target.memberId, reason)
      console.log(`  Strafe: ${names.get(who.memberId)} -> ${names.get(target.memberId)} (${reason})`)
    } else if (roll < 0.13) {
      await api.undoDrink(who)
      console.log(`  ${names.get(who.memberId)} ångrar sig`)
    } else {
      const kind = rng.pick(KINDS)
      await api.logDrink(who, kind)
      console.log(`  ${names.get(who.memberId)}: ${kind}`)
    }
  } catch (err) {
    console.log(`  (${err instanceof PrositError ? err.code : String(err)})`)
  }
}
