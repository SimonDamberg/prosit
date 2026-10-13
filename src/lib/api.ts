// Typed wrappers for every RPC and the public read queries. Takes a client so Node scripts
// can reuse it; never touches import.meta.env.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { DrinkKind, EventPayload, EventResponse, Resolution } from '../shared/game/types'
import { toPrositError } from './errors'
import {
  toDrink,
  toEvent,
  toMember,
  toNight,
  toPoints,
  toResponse,
  toStrafe,
  type DrinkRow,
  type EventRow,
  type Identity,
  type MemberRow,
  type NewMember,
  type NightRow,
  type PointsRow,
  type ResponseRow,
  type StrafeRow,
} from './types'

type Row = Record<string, unknown>

export function createApi(db: SupabaseClient) {
  async function rpc<T>(fn: string, args: Row): Promise<T> {
    let res
    try {
      res = await db.rpc(fn, args)
    } catch (err) {
      throw toPrositError(err)
    }
    if (res.error) throw toPrositError(res.error)
    return res.data as T
  }

  async function query<T>(run: () => PromiseLike<{ data: unknown; error: unknown }>): Promise<T> {
    let res
    try {
      res = await run()
    } catch (err) {
      throw toPrositError(err)
    }
    if (res.error) throw toPrositError(res.error)
    return res.data as T
  }

  const auth = (who: Identity) => ({ p_member_id: who.memberId, p_token: who.token })

  return {
    // Reads ------------------------------------------------------------------------------

    async getNight(): Promise<NightRow> {
      return toNight(await query<Row>(() => db.from('night').select('*').single()))
    },

    async getMembers(): Promise<MemberRow[]> {
      const rows = await query<Row[]>(() => db.from('members').select('*').order('created_at'))
      return rows.map(toMember)
    },

    async getMember(memberId: string): Promise<MemberRow | null> {
      const row = await query<Row | null>(() => db.from('members').select('*').eq('id', memberId).maybeSingle())
      return row ? toMember(row) : null
    },

    async getDrinks(): Promise<DrinkRow[]> {
      const rows = await query<Row[]>(() => db.from('drinks').select('*').order('at'))
      return rows.map(toDrink)
    },

    async getEvents(): Promise<EventRow[]> {
      const rows = await query<Row[]>(() => db.from('events').select('*').order('seq'))
      return rows.map(toEvent)
    },

    async getResponses(eventId: string): Promise<ResponseRow[]> {
      const rows = await query<Row[]>(() => db.from('responses').select('*').eq('event_id', eventId).order('at'))
      return rows.map(toResponse)
    },

    async getStrafen(): Promise<StrafeRow[]> {
      const rows = await query<Row[]>(() => db.from('strafen').select('*').order('at'))
      return rows.map(toStrafe)
    },

    async getPoints(): Promise<PointsRow[]> {
      const rows = await query<Row[]>(() => db.from('points').select('*').order('at'))
      return rows.map(toPoints)
    },

    /** Server time in ms since the epoch. */
    async serverNow(): Promise<number> {
      return Number(await rpc<number | string>('server_now', {}))
    },

    // Members ----------------------------------------------------------------------------

    join(name: string, colour: string): Promise<NewMember> {
      return rpc<NewMember>('join', { p_name: name, p_colour: colour })
    },

    // Drinks and Strafen -----------------------------------------------------------------

    async logDrink(who: Identity, kind: DrinkKind): Promise<DrinkRow> {
      return toDrink(await rpc<Row>('log_drink', { ...auth(who), p_kind: kind }))
    },

    /** Removes the caller's latest drink and returns its id. */
    undoDrink(who: Identity): Promise<string> {
      return rpc<string>('undo_drink', auth(who))
    },

    async giveStrafe(who: Identity, targetId: string, reason: string): Promise<StrafeRow> {
      return toStrafe(await rpc<Row>('give_strafe', { ...auth(who), p_target: targetId, p_reason: reason }))
    },

    // Night ------------------------------------------------------------------------------

    async startNight(who: Identity): Promise<NightRow> {
      return toNight(await rpc<Row>('start_night', auth(who)))
    },

    async setInterval(who: Identity, minutes: number): Promise<NightRow> {
      return toNight(await rpc<Row>('set_interval', { ...auth(who), p_minutes: minutes }))
    },

    async endNight(who: Identity): Promise<NightRow> {
      return toNight(await rpc<Row>('end_night', auth(who)))
    },

    /** Empties the log and returns to idle. `wipeMembers` also signs every phone out. */
    async resetNight(who: Identity, wipeMembers = false): Promise<void> {
      await rpc<null>('reset_night', { ...auth(who), p_wipe_members: wipeMembers })
    },

    // Events (driven by the engine from Stage 3) -----------------------------------------

    /** True for the one caller whose insert won the race on `seq`. */
    spawnEvent(who: Identity, seq: number, payload: EventPayload, endsAt: number): Promise<boolean> {
      return rpc<boolean>('spawn_event', {
        ...auth(who),
        p_seq: seq,
        p_kind: payload.kind,
        p_payload: payload,
        p_ends_at: new Date(endsAt).toISOString(),
      })
    },

    /** False when this member had already answered. */
    respond(who: Identity, eventId: string, payload: EventResponse): Promise<boolean> {
      return rpc<boolean>('respond', { ...auth(who), p_event_id: eventId, p_payload: payload })
    },

    /** True for the one caller whose resolution was applied. */
    resolveEvent(who: Identity, eventId: string, resolution: Resolution): Promise<boolean> {
      return rpc<boolean>('resolve_event', {
        ...auth(who),
        p_event_id: eventId,
        p_result: resolution.result,
        p_points: resolution.points,
        p_strafen: resolution.strafen,
      })
    },
  }
}

export type Api = ReturnType<typeof createApi>
