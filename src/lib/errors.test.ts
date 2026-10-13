import { describe, expect, it } from 'vitest'
import { PrositError, toPrositError } from './errors'
import { ERROR_MESSAGES } from '../shared/content/errors'

describe('toPrositError', () => {
  it('maps RPC exception codes to their messages', () => {
    const e = toPrositError({ code: 'P0001', message: 'config', details: null, hint: null })
    expect(e.code).toBe('config')
    expect(e.message).toBe(ERROR_MESSAGES.config)
  })

  it('maps fetch failures to network', () => {
    expect(toPrositError(new TypeError('Failed to fetch')).code).toBe('network')
    expect(toPrositError({ message: 'TypeError: fetch failed' }).code).toBe('network')
    expect(toPrositError(new TypeError('Load failed')).code).toBe('network')
  })

  it('falls back to unknown and passes PrositErrors through', () => {
    expect(toPrositError({ message: 'duplicate key value' }).code).toBe('unknown')
    expect(toPrositError(null).code).toBe('unknown')
    const e = new PrositError('config')
    expect(toPrositError(e)).toBe(e)
  })

  it('does not treat prototype keys as codes', () => {
    expect(toPrositError({ message: 'toString' }).code).toBe('unknown')
  })
})
