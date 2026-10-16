import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { DRINK_LOGGED } from './drinks'
import { ERROR_MESSAGES } from './errors'
import { STADGAR } from './stadgar'

const EM_DASH = '\u2014'
const SRC = join(import.meta.dirname, '..', '..')

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}

describe('no em dash', () => {
  it('appears in any file under src/', () => {
    const offenders = walk(SRC).filter((f) => readFileSync(f, 'utf8').includes(EM_DASH))
    expect(offenders).toEqual([])
  })
})

describe('error copy', () => {
  it('covers every code the SQL raises', () => {
    const dir = join(SRC, '..', 'supabase', 'migrations')
    const sql = readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .map((f) => readFileSync(join(dir, f), 'utf8'))
      .join('\n')
    const raised = [...new Set([...sql.matchAll(/raise exception '([^']+)'/g)].map((m) => m[1]))]
    expect(raised.length).toBeGreaterThan(0)
    expect(raised.filter((code) => !Object.hasOwn(ERROR_MESSAGES, code))).toEqual([])
  })
})

describe('jokes', () => {
  it('keeps every statute short, unique and numbered', () => {
    expect(STADGAR.length).toBeGreaterThan(0)
    expect(new Set(STADGAR).size).toBe(STADGAR.length)
    for (const s of STADGAR) {
      expect(s.startsWith('§ ')).toBe(true)
      expect([...s].length).toBeLessThanOrEqual(56)
    }
  })

  it('has a drink toast for every kind', () => {
    for (const lines of Object.values(DRINK_LOGGED)) expect(lines.length).toBeGreaterThan(0)
  })
})
