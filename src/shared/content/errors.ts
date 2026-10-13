// Error copy. Codes match the exceptions raised by the SQL RPCs (supabase/migrations/*.sql, from
// Stage 2) plus client-side network/config errors. Add a code here when adding a `raise exception`.

export const ERROR_MESSAGES = {
  // Client side
  network: 'Keine Verbindung. Försöker igen...',
  config: 'Prosit! saknar serverinställningar.',
  unknown: 'Etwas ging schief. Försök igen.',
} as const

export type ErrorCode = keyof typeof ERROR_MESSAGES
