// Membership limits and the colours a member can pick. The SQL in supabase/migrations mirrors
// these numbers (join, give_strafe); change both together.

export const MAX_NAME_LENGTH = 16
/** Five members, plus room for a lost phone to join again. */
export const MAX_MEMBERS = 8
export const MAX_REASON_LENGTH = 80

/** Lowercase hex, as the members.colour check requires. Chosen to tell apart on the TV. */
export const MEMBER_COLOURS = [
  '#f5b324',
  '#5aa2f0',
  '#e5482f',
  '#7ddc8a',
  '#c58af9',
  '#ff8fb1',
  '#3fd0c9',
  '#f6f3e8',
] as const

/** Trims and collapses whitespace, like private.clean_name in SQL. */
export function cleanName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim()
}

export type NameProblem = 'name_empty' | 'name_too_long'

/** The error code join() would raise for this name, or null when it is fine. */
export function nameProblem(raw: string): NameProblem | null {
  // Count code points, as char_length does.
  const length = [...cleanName(raw)].length
  if (length === 0) return 'name_empty'
  if (length > MAX_NAME_LENGTH) return 'name_too_long'
  return null
}

/** First colour nobody holds yet, or null when all are taken. */
export function firstFreeColour(taken: readonly string[]): string | null {
  return MEMBER_COLOURS.find((c) => !taken.includes(c)) ?? null
}
