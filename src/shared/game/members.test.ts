import { describe, expect, it } from 'vitest'
import { cleanName, firstFreeColour, MAX_MEMBERS, MAX_NAME_LENGTH, MEMBER_COLOURS, nameProblem } from './members'

describe('MEMBER_COLOURS', () => {
  it('has one distinct lowercase hex colour per possible member', () => {
    expect(MEMBER_COLOURS).toHaveLength(MAX_MEMBERS)
    expect(new Set(MEMBER_COLOURS).size).toBe(MAX_MEMBERS)
    for (const c of MEMBER_COLOURS) expect(c).toMatch(/^#[0-9a-f]{6}$/)
  })
})

describe('cleanName', () => {
  it('trims and collapses whitespace', () => {
    expect(cleanName('  Herr   von \t Schnaps ')).toBe('Herr von Schnaps')
  })
})

describe('nameProblem', () => {
  it('accepts a normal name', () => {
    expect(nameProblem('Simon')).toBeNull()
    expect(nameProblem('x'.repeat(MAX_NAME_LENGTH))).toBeNull()
  })

  it('rejects an empty or blank name', () => {
    expect(nameProblem('')).toBe('name_empty')
    expect(nameProblem('   ')).toBe('name_empty')
  })

  it('rejects a name over the limit, counted after cleaning', () => {
    expect(nameProblem('x'.repeat(MAX_NAME_LENGTH + 1))).toBe('name_too_long')
    expect(nameProblem(`  ${'x'.repeat(MAX_NAME_LENGTH)}  `)).toBeNull()
  })

  it('counts an emoji as one character', () => {
    expect(nameProblem('🍺'.repeat(MAX_NAME_LENGTH))).toBeNull()
  })
})

describe('firstFreeColour', () => {
  it('skips taken colours', () => {
    expect(firstFreeColour([])).toBe(MEMBER_COLOURS[0])
    expect(firstFreeColour([MEMBER_COLOURS[0], MEMBER_COLOURS[1]])).toBe(MEMBER_COLOURS[2])
  })

  it('is null when every colour is taken', () => {
    expect(firstFreeColour([...MEMBER_COLOURS])).toBeNull()
  })
})
