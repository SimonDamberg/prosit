// Membership limits and the colours a member can pick. The SQL in supabase/migrations mirrors
// these numbers (join, give_strafe); change both together.

export const MAX_NAME_LENGTH = 16
/** Five members, plus room for a lost phone to join again. */
export const MAX_MEMBERS = 8
export const MAX_REASON_LENGTH = 80

/** Lowercase hex, as the members.colour check requires. Chosen to tell apart on the TV, and dark enough to read as text on white. */
export const MEMBER_COLOURS = [
  '#0077b6',
  '#b3541e',
  '#2f7d4f',
  '#8e2a8b',
  '#17171b',
  '#b0234f',
  '#8a6d00',
  '#5b4bc4',
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
