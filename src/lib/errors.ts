// Maps Supabase/PostgREST/network failures to a PrositError with copy from shared/content.
import { ERROR_MESSAGES, type ErrorCode } from '../shared/content/errors'

export class PrositError extends Error {
  readonly code: ErrorCode

  constructor(code: ErrorCode, options?: { cause?: unknown }) {
    super(ERROR_MESSAGES[code], options)
    this.name = 'PrositError'
    this.code = code
  }
}

const NETWORK_PATTERN = /failed to fetch|fetch failed|networkerror|network request failed|load failed|timed? ?out|econnrefused|enotfound/i

function isErrorCode(value: string): value is ErrorCode {
  return Object.hasOwn(ERROR_MESSAGES, value)
}

/** Accepts anything thrown or returned as `error` by supabase-js. */
export function toPrositError(err: unknown): PrositError {
  if (err instanceof PrositError) return err
  const message =
    typeof err === 'string'
      ? err
      : err && typeof err === 'object' && 'message' in err
        ? String((err as { message: unknown }).message)
        : ''
  const trimmed = message.trim()
  if (isErrorCode(trimmed)) return new PrositError(trimmed, { cause: err })
  if (NETWORK_PATTERN.test(message)) return new PrositError('network', { cause: err })
  return new PrositError('unknown', { cause: err })
}
