// Five fake members exercising the whole backend through the public API, as phones would.
// WIPES the night and every member (reset_night) at start and end, hence --reset.
//
//   npm run bots -- --reset          run the checks and leave an empty night
//   npm run bots -- --reset --stay   then keep five bots drinking and answering events, to watch
//                                    /tv (Ctrl+C stops)
//   ... --stay --end-after 10        and end the night after 10 minutes, so /tv runs the finale
//
// The engine step runs a real short night (about four minutes): six engines race on every event.
//
// Env (from the shell or .env.local): VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.
// BOTS_SUPABASE_URL / BOTS_SUPABASE_KEY override them.
import assert from 'node:assert/strict'
import WebSocket from 'ws'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createApi } from '../src/lib/api'
import { createSupabase } from '../src/lib/client'
import { PrositError } from '../src/lib/errors'
import type { EventRow, Identity } from '../src/lib/types'
import type { ErrorCode } from '../src/shared/content/errors'
import { STRAFE_REASONS } from '../src/shared/content/strafen'
import { computeAchievements } from '../src/shared/game/achievements'
import { computeAwards, type NightLog } from '../src/shared/game/awards'
import { rankTallies, strafeTally, tallyDrinks } from '../src/shared/game/drinks'
import { MAX_MEMBERS, MAX_NAME_LENGTH, MEMBER_COLOURS } from '../src/shared/game/members'
import { resolve } from '../src/shared/game/resolve'
import { createRng } from '../src/shared/game/rng'
import { ANSWERED_KINDS, ehrengerichtPhases, nextAction, planEvent } from '../src/shared/game/schedule'
import { DRINK_KINDS, type EventPayload, type EventResponse, type Resolution } from '../src/shared/game/types'

if (!process.argv.includes('--reset')) {
  console.error('bots: this wipes the night and every member. Run with --reset to confirm.')
  process.exit(2)
}
const stay = process.argv.includes('--stay')
const endAfterArg = process.argv.indexOf('--end-after')
const endAfterMin = endAfterArg === -1 ? null : Number(process.argv[endAfterArg + 1])
if (endAfterMin !== null && !(endAfterMin > 0)) {
  console.error('bots: --end-after takes minutes, e.g. --end-after 10.')
  process.exit(2)
}
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

// The engine, as src/lib/useEngine.ts runs it: five phones and the TV (null), all racing. -----

/** How many callers the database let through, per seq and per event id. Must be one each. */
const wins = { spawn: new Map<number, number>(), resolve: new Map<string, number>() }
let clockOffset = 0

async function engineTick(who: Identity | null) {
  const [night, events, members] = await Promise.all([api.getNight(), api.getEvents(), api.getMembers()])
  const open = events.filter((e) => e.status === 'live' && ANSWERED_KINDS.includes(e.kind))
  const answers = (await Promise.all(open.map((e) => api.getResponses(e.id)))).flat()
  const memberIds = members.map((m) => m.id)
  const action = nextAction({ night, events, memberIds, responses: answers }, Date.now() + clockOffset)
  if (action.type === 'spawn') {
    const won = await api.spawnEvent(who, action.plan.seq, action.plan.payload, action.endsAt)
    if (won) wins.spawn.set(action.plan.seq, (wins.spawn.get(action.plan.seq) ?? 0) + 1)
  } else if (action.type === 'resolve') {
    const event = events.find((e) => e.id === action.event.id)!
    const mine = answers.filter((a) => a.eventId === event.id)
    const won = await api.resolveEvent(who, event.id, resolve(event.payload, mine, memberIds))
    if (won) wins.resolve.set(event.id, (wins.resolve.get(event.id) ?? 0) + 1)
  }
}

/**
 * Every bot answers a live event after a moment, as a phone would: a toast, a tap at the draw or a
 * pick, a vote, a guess, a rating. `skip` names a bot that sleeps through it.
 */
const answered = new Set<string>()
function answer(event: EventRow, rng: ReturnType<typeof createRng>, skip: Identity | null) {
  if (event.status !== 'live' || event.kind === 'regel' || answered.has(event.id)) return
  answered.add(event.id)
  const { payload } = event
  for (const bot of bots) {
    if (bot === skip) continue
    let delay = rng.float(400, 4000)
    let response: EventResponse
    switch (payload.kind) {
      case 'prosit':
        response = { kind: 'prosit' }
        break
      case 'duell':
        if (bot.memberId === payload.a || bot.memberId === payload.b) {
          // One in five jumps the draw.
          const reaction = rng.next() < 0.2 ? -rng.float(500, 3000) : rng.float(200, 700)
          const tapMs = Math.round(payload.drawAfterMs + reaction)
          delay = Math.max(0, event.startedAt + tapMs - (Date.now() + clockOffset))
          response = { kind: 'duell', tapMs }
        } else {
          response = { kind: 'duell_pick', pick: rng.next() < 0.5 ? payload.a : payload.b }
        }
        break
      case 'abstimmung':
        response = { kind: 'abstimmung', vote: rng.pick(bots).memberId }
        break
      case 'schatzfrage':
        response = { kind: 'schatzfrage', guess: Math.round(payload.answer * rng.float(0.5, 1.5)) }
        break
      case 'trinkspruch':
        if (bot.memberId === payload.speaker) continue
        response = { kind: 'trinkspruch', rating: 1 + rng.int(5) }
        break
      case 'ehrengericht': {
        if (bot.memberId === payload.accused) continue
        // The phones open the vote after the defence; the bots wait for it too.
        const { voteFrom } = ehrengerichtPhases(event.startedAt, event.endsAt)
        delay = Math.max(0, voteFrom - (Date.now() + clockOffset)) + rng.float(400, 4000)
        response = { kind: 'ehrengericht', guilty: rng.next() < 0.5 }
        break
      }
      case 'stadgeandring':
        response = { kind: 'stadgeandring', ja: rng.next() < 0.5 }
        break
      default:
        continue
    }
    setTimeout(() => {
      // Too late is fine: the engines closed it first.
      api.respond(bot, event.id, response).catch(() => {})
    }, delay)
  }
}

/** Runs the six engines and the answering bots until `done` says so. */
async function runNight(done: (events: EventRow[]) => boolean, sleeper: (event: EventRow) => Identity | null) {
  const rng = createRng(1887)
  for (;;) {
    await Promise.all([...bots, null].map(engineTick))
    const events = await api.getEvents()
    for (const event of events) answer(event, rng, sleeper(event))
    if (done(events)) return events
    await sleep(400)
  }
}

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
  let listening = false
  db.channel('bots')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'members' }, () => void seen.members++)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'drinks' }, (change) => {
      if (change.eventType === 'INSERT') seen.drinkInserts++
      if (change.eventType === 'DELETE') seen.drinkDeletes++
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'strafen' }, () => void seen.strafen++)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => void seen.events++)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'night' }, () => void seen.night++)
    .on('system', {}, (payload: { extension?: string; status?: string }) => {
      if (payload.extension === 'postgres_changes' && payload.status === 'ok') listening = true
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') subscribed = true
    })
  await waitFor('SUBSCRIBED', () => subscribed)
  // The socket subscribes first; changes only flow once Postgres confirms, which takes a few
  // seconds on a hosted project. Anything written before that is never delivered.
  await waitFor('Postgres to confirm the subscription', () => listening, 30000)
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

await step('a member is handed over to a new phone', async () => {
  const old = bots[1]
  await expectCode(api.issueClaim({ memberId: old.memberId, token: bots[0].token }, old.memberId), 'invalid_token')
  await expectCode(api.issueClaim(bots[0], '00000000-0000-4000-8000-000000000000'), 'target_not_found')
  await expectCode(api.claim('NOTACODE'), 'claim_invalid')

  // Bot 0 vouches for bot 1; the "new phone" claims the code once.
  const code = await api.issueClaim(bots[0], old.memberId)
  assert.match(code, /^[0-9A-F]{8}$/)
  const claimed = await api.claim(code.toLowerCase())
  assert.equal(claimed.id, old.memberId)
  assert.notEqual(claimed.token, old.token)
  await expectCode(api.claim(code), 'claim_invalid')
  await expectCode(api.logDrink(old, 'wasser'), 'invalid_token')
  bots[1] = { memberId: claimed.id, token: claimed.token }
  assert.equal((await api.getMembers()).length, 5)
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

  // Not for the TV (no member) either.
  assert.equal(await api.spawnEvent(null, 1, { kind: 'prosit' }, Date.now() + 60_000), false)

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
  // Only the next seq is taken: nobody can leave a gap in the night.
  assert.equal(await api.spawnEvent(bots[0], 2, { kind: 'prosit' }, endsAt), false)
  const spawned = await Promise.all([...bots, null].map((b) => api.spawnEvent(b, 1, { kind: 'prosit' }, endsAt)))
  assert.equal(spawned.filter(Boolean).length, 1, 'exactly one spawn wins')
  const stolen = { memberId: bots[0].memberId, token: bots[1].token }
  await expectCode(api.spawnEvent(stolen, 2, { kind: 'prosit' }, endsAt), 'invalid_token')
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
  assert.equal(event.resolvedAt, null)
  const resolved = await Promise.all([...bots, null].map((b) => api.resolveEvent(b, event.id, resolution)))
  assert.equal(resolved.filter(Boolean).length, 1, 'exactly one resolve wins')

  events = await api.getEvents()
  assert.equal(events[0].status, 'done')
  assert.ok(events[0].resolvedAt !== null, 'resolved_at is set')
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

await step('answers close at the deadline, before the event is resolved', async () => {
  const rule = { kind: 'regel', rule: 'Ingen nämner jobbet' } as const
  assert.equal(await api.spawnEvent(null, 2, rule, Date.now() - 1000), true)
  const event = (await api.getEvents())[1]
  assert.equal(event.status, 'live')
  await expectCode(api.respond(bots[0], event.id, { kind: 'prosit' }), 'event_closed')
  assert.equal(await api.resolveEvent(null, event.id, resolve(rule, [], [])), true)
  assert.deepEqual((await api.getEvents())[1].result, { kind: 'regel' })
})

const by = (a: { memberId: string }, b: { memberId: string }) => (a.memberId < b.memberId ? -1 : 1)

/** The points and Strafen the database holds for one event must be what resolve() handed over. */
async function assertAwards(eventId: string, expected: Resolution) {
  const strafen = (await api.getStrafen()).filter((s) => s.eventId === eventId)
  const points = (await api.getPoints()).filter((p) => p.eventId === eventId)
  assert.deepEqual(strafen.map((s) => ({ memberId: s.memberId, reason: s.reason })).sort(by), [...expected.strafen].sort(by))
  assert.deepEqual(
    points.map((p) => ({ memberId: p.memberId, amount: p.amount, reason: p.reason })).sort(by),
    [...expected.points].sort(by),
  )
}

await step('Duell, Abstimmung, Schätzfrage, Trinkspruch, Ehrengericht and Stadgeändring pass the referee', async () => {
  const ids = bots.map((b) => b.memberId)
  const [a, b, c, d, e] = bots
  const cases: { payload: EventPayload; answers: [Identity, EventResponse][] }[] = [
    {
      payload: { kind: 'duell', a: a.memberId, b: b.memberId, drawAfterMs: 20_000 },
      answers: [
        [c, { kind: 'duell_pick', pick: b.memberId }],
        [d, { kind: 'duell_pick', pick: a.memberId }],
        [a, { kind: 'duell', tapMs: 20_450 }],
        [b, { kind: 'duell', tapMs: 20_300 }],
      ],
    },
    {
      payload: { kind: 'abstimmung', question: 'Vem i klubben vet alltid bäst?', title: 'Klubbens Besserwisser' },
      answers: [a, b, d].map((bot): [Identity, EventResponse] => [bot, { kind: 'abstimmung', vote: c.memberId }]),
    },
    {
      payload: { kind: 'schatzfrage', question: 'Vilket år?', answer: 1516, unit: 'år' },
      answers: [
        [a, { kind: 'schatzfrage', guess: 1500 }],
        [b, { kind: 'schatzfrage', guess: 1520.5 }],
        [c, { kind: 'schatzfrage', guess: 1900 }],
      ],
    },
    {
      payload: { kind: 'trinkspruch', speaker: e.memberId, topic: 'Till ölet' },
      answers: [
        [a, { kind: 'trinkspruch', rating: 5 }],
        [b, { kind: 'trinkspruch', rating: 4 }],
        [c, { kind: 'trinkspruch', rating: 4 }],
        [e, { kind: 'trinkspruch', rating: 5 }],
      ],
    },
    {
      payload: { kind: 'ehrengericht', accused: d.memberId, charge: 'beställt havremjölk i kaffet' },
      answers: [
        [a, { kind: 'ehrengericht', guilty: true }],
        [b, { kind: 'ehrengericht', guilty: true }],
        [c, { kind: 'ehrengericht', guilty: false }],
        [d, { kind: 'ehrengericht', guilty: false }],
      ],
    },
    {
      payload: { kind: 'stadgeandring', amendment: 'Västen får bäras även till frukost.' },
      answers: [
        [a, { kind: 'stadgeandring', ja: true }],
        [b, { kind: 'stadgeandring', ja: false }],
        [e, { kind: 'stadgeandring', ja: true }],
      ],
    },
  ]

  const results: Resolution[] = []
  for (const [i, { payload, answers }] of cases.entries()) {
    const seq = 3 + i
    assert.equal(await api.spawnEvent(null, seq, payload, Date.now() + 60_000), true, `${payload.kind} spawns`)
    const event = (await api.getEvents()).find((row) => row.seq === seq)
    assert.ok(event, `${payload.kind} is stored`)
    assert.deepEqual(event.payload, payload, `${payload.kind} payload survives the round trip`)
    for (const [who, response] of answers) assert.equal(await api.respond(who, event.id, response), true)

    const expected = resolve(payload, await api.getResponses(event.id), ids)
    assert.equal(await api.resolveEvent(null, event.id, expected), true)
    const done = (await api.getEvents()).find((row) => row.seq === seq)
    assert.deepEqual(done?.result, expected.result, `${payload.kind} result survives the round trip`)
    await assertAwards(event.id, expected)
    results.push(expected)
  }

  const [duell, vote, guess, toast, trial, motion] = results
  assert.deepEqual(duell.result, {
    kind: 'duell',
    winner: b.memberId,
    loser: a.memberId,
    reactions: { [a.memberId]: 450, [b.memberId]: 300 },
    falseStarts: [],
  })
  assert.deepEqual(duell.points.map((p) => p.memberId), [b.memberId, c.memberId])
  assert.deepEqual(vote.result, { kind: 'abstimmung', winners: [c.memberId], votes: { [c.memberId]: 3 } })
  assert.ok(guess.result.kind === 'schatzfrage')
  assert.equal(guess.result.closest, b.memberId)
  assert.equal(guess.result.furthest, c.memberId)
  // The speaker's own five does not count.
  assert.deepEqual(toast.result, {
    kind: 'trinkspruch',
    average: 4.3,
    ratings: { [a.memberId]: 5, [b.memberId]: 4, [c.memberId]: 4 },
  })
  assert.deepEqual(toast.points, [{ memberId: e.memberId, amount: 4, reason: 'Betyg för Trinkspruch' }])
  // The accused's own "frikänd" does not count.
  assert.deepEqual(trial.result, { kind: 'ehrengericht', guilty: true, votes: { skyldig: 2, frikand: 1 } })
  assert.deepEqual(trial.strafen, [{ memberId: d.memberId, reason: 'Dömd av Ehrengericht' }])
  assert.deepEqual(motion.result, { kind: 'stadgeandring', passed: true, ja: 2, nej: 1 })
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
  assert.equal(await api.spawnEvent(bots[0], 9, { kind: 'prosit' }, Date.now() + 60_000), false)
  assert.equal((await api.getEvents()).length, 8)
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
})

const NIGHT_EVENTS = 6
await step(`six engines run a night of ${NIGHT_EVENTS} events: each spawns once and resolves once`, async () => {
  clockOffset = (await api.serverNow()) - Date.now()
  await api.setInterval(bots[0], 0.5)
  const night = await api.startNight(bots[0])
  assert.ok(night.seed !== null)
  const seed = night.seed

  // The last bot sleeps through the first PROSIT!, so that one runs to its deadline.
  let firstProsit = ''
  const events = await runNight(
    (rows) => rows.filter((e) => e.status === 'done').length >= NIGHT_EVENTS,
    (event) => {
      if (event.kind === 'prosit') firstProsit ||= event.id
      return event.id === firstProsit ? bots[4] : null
    },
  )

  assert.deepEqual(events.map((e) => e.seq), events.map((_, i) => i + 1), 'seqs run from 1 without a gap')
  const memberIds = bots.map((b) => b.memberId)
  // PROSIT! runs on its own clock, so the programme is every other event, numbered on its own.
  let prev = ''
  let programme = 0
  for (const event of events) {
    assert.equal(wins.spawn.get(event.seq), 1, `seq ${event.seq} spawned once`)
    if (event.kind !== 'prosit') {
      assert.notEqual(event.kind, prev, 'no programme kind twice in a row')
      prev = event.kind
      programme++
      assert.deepEqual(event.payload, planEvent(seed, programme, 0.5, memberIds).payload, `seq ${event.seq} is the scheduled event`)
    }
    if (event.status !== 'done') continue

    assert.equal(wins.resolve.get(event.id), 1, `seq ${event.seq} resolved once`)
    assert.ok(event.resolvedAt !== null)
    const expected = resolve(event.payload, await api.getResponses(event.id), memberIds)
    assert.deepEqual(event.result, expected.result)
    await assertAwards(event.id, expected)
    console.log(`      seq ${event.seq} ${event.kind}: ${expected.points.length} points, ${expected.strafen.length} Strafen`)
  }

  // A PROSIT! comes within two intervals here, so a night of six events holds at least one.
  assert.ok(events.some((e) => e.kind === 'prosit'), 'the night had a PROSIT!')
  const slept = events.find((e) => e.id === firstProsit && e.status === 'done')
  if (slept) {
    assert.ok(slept.result?.kind === 'prosit')
    assert.deepEqual(slept.result.missed, [bots[4].memberId])
    assert.equal(slept.result.order.length, 4)
    assert.ok(slept.resolvedAt! >= slept.endsAt, 'a missed PROSIT! runs to its deadline')
  }
  const quick = events.find((e) => e.kind === 'prosit' && e.status === 'done' && e.id !== firstProsit)
  if (quick) assert.ok(quick.resolvedAt! < quick.endsAt, 'a PROSIT! everyone answers closes early')
})

await step('the night ends: the finale reads the same awards on every device', async () => {
  for (const [i, kind] of (['mass', 'ol', 'ol', 'schnaps', 'wasser', 'ol', 'mass'] as const).entries()) {
    await api.logDrink(bots[i % 3], kind)
  }
  const night = await api.endNight(bots[3])
  assert.equal(night.status, 'ended')
  const [members, drinks, strafen, points, events] = await Promise.all([
    api.getMembers(),
    api.getDrinks(),
    api.getStrafen(),
    api.getPoints(),
    api.getEvents(),
  ])
  const log: NightLog = { memberIds: members.map((m) => m.id), drinks, strafen, points, events, endedAt: night.endedAt }
  const awards = computeAwards(log)
  const shuffled = { ...log, drinks: [...drinks].reverse(), strafen: [...strafen].reverse(), events: [...events].reverse() }
  assert.deepEqual(computeAwards(shuffled), awards, 'awards do not depend on row order')
  assert.deepEqual(computeAchievements(shuffled), computeAchievements(log), 'achievements do not depend on row order')

  const known = new Set(log.memberIds)
  for (const award of awards) assert.ok(award.memberIds.every((id) => known.has(id)), `${award.key} goes to members`)
  const top = rankTallies(tallyDrinks(drinks, log.memberIds))[0]
  assert.ok(awards.find((a) => a.key === 'bier')?.memberIds.includes(top.memberId), 'the Bierkönig drank the most')
  if (points.length > 0) assert.equal(awards.at(-1)?.key, 'praesident', 'the grand prize comes last')
  assert.ok(computeAchievements(log).some((a) => a.key === 'anstich'), 'the first Maß is honoured')
  console.log(`      ${awards.length} awards: ${awards.map((a) => a.key).join(', ')}`)
})

if (!stay) {
  await step('wipe', async () => {
    await api.resetNight(bots[2], true)
    assert.deepEqual(await api.getMembers(), [])
  })
  await db.removeAllChannels()
  console.log('bots: all steps passed')
  process.exit(0)
}

// --stay: a slow, seeded evening so the TV has something to show. --------------------------------

console.log('bots: staying. Five members drink and answer events, open /tv. Ctrl+C to stop (the data stays).')
// The checks above ended the night; a fresh one keeps the members.
await api.resetNight(bots[0])
await api.setInterval(bots[0], 1)
await api.startNight(bots[0])
const endAt = endAfterMin === null ? Infinity : Date.now() + endAfterMin * 60_000
if (endAfterMin !== null) console.log(`bots: the night ends in ${endAfterMin} min, then /tv runs the finale.`)
// The engines keep the night going; now and then somebody sleeps through a PROSIT!.
void runNight(
  () => false,
  (event) => (event.seq % 3 === 0 ? bots[event.seq % bots.length] : null),
).catch((err) => console.log(`  engines stopped: ${String(err)}`))
const rng = createRng(1887)
const KINDS = ['ol', 'ol', 'ol', 'ol', 'ol', 'mass', 'mass', 'schnaps', 'schnaps', 'wasser'] as const

for (;;) {
  await sleep(rng.float(1500, 4500))
  if (Date.now() >= endAt) {
    await api.endNight(rng.pick(bots))
    console.log('bots: the night is ended. The finale runs on /tv; the data stays.')
    await db.removeAllChannels()
    process.exit(0)
  }
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
