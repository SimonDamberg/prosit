import { describe, expect, it } from 'vitest'
import { applyChange } from './realtime'

interface Drink {
  id: string
  member_id: string
  kind: string
}

const drink = (id: string, member_id: string, kind = 'ol') => ({ id, member_id, kind })
const toDrink = (raw: Record<string, unknown>): Drink => ({
  id: String(raw.id),
  member_id: String(raw.member_id),
  kind: String(raw.kind),
})

describe('applyChange', () => {
  const ofM1 = (d: Drink) => d.member_id === 'm1'

  it('inserts and updates by id', () => {
    let rows = applyChange<Drink>([], { eventType: 'INSERT', new: drink('a', 'm1'), old: {} }, toDrink, ofM1)
    expect(rows).toEqual([drink('a', 'm1')])
    rows = applyChange(rows, { eventType: 'UPDATE', new: drink('a', 'm1', 'mass'), old: { id: 'a' } }, toDrink, ofM1)
    expect(rows).toEqual([drink('a', 'm1', 'mass')])
  })

  it('ignores rows that are not accepted and drops rows that stop matching', () => {
    const rows = [toDrink(drink('a', 'm1'))]
    expect(applyChange(rows, { eventType: 'INSERT', new: drink('b', 'm2'), old: {} }, toDrink, ofM1)).toBe(rows)
    expect(applyChange(rows, { eventType: 'UPDATE', new: drink('a', 'm2'), old: {} }, toDrink, ofM1)).toEqual([])
  })

  it('deletes by primary key only', () => {
    const rows = [toDrink(drink('a', 'm1')), toDrink(drink('b', 'm1'))]
    expect(applyChange(rows, { eventType: 'DELETE', new: {}, old: { id: 'a' } }, toDrink).map((r) => r.id)).toEqual(['b'])
    expect(applyChange(rows, { eventType: 'DELETE', new: {}, old: { id: 'zzz' } }, toDrink)).toBe(rows)
  })
})
