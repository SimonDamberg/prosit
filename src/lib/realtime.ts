// Pure helpers for applying Realtime postgres_changes payloads to local row lists.

/** The subset of a supabase-js postgres_changes payload we use. */
export interface RowChange {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Record<string, unknown>
  old: Record<string, unknown>
}

/**
 * Upserts (INSERT/UPDATE) or removes (DELETE) a row by id. Returns the same array when nothing
 * changed. `accept` filters inserted/updated rows (e.g. responses of one event); DELETE payloads
 * only carry the primary key, so deletes always apply by id.
 */
export function applyChange<T extends { id: string }>(
  rows: readonly T[],
  change: RowChange,
  toRow: (raw: Record<string, unknown>) => T,
  accept: (row: T) => boolean = () => true,
): T[] {
  if (change.eventType === 'DELETE') {
    const id = change.old.id
    const next = rows.filter((r) => r.id !== id)
    return next.length === rows.length ? (rows as T[]) : next
  }
  const row = toRow(change.new)
  const i = rows.findIndex((r) => r.id === row.id)
  if (!accept(row)) return i === -1 ? (rows as T[]) : rows.filter((_, j) => j !== i)
  if (i === -1) return [...rows, row]
  const next = rows.slice()
  next[i] = row
  return next
}
