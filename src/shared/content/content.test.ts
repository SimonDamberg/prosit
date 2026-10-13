import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { ERROR_MESSAGES } from './errors'

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
