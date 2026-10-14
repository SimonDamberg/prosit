// Error copy. Codes match the exceptions raised by the SQL RPCs (supabase/migrations/*.sql, from
// Stage 2) plus client-side network/config errors. Add a code here when adding a `raise exception`.

export const ERROR_MESSAGES = {
  // Client side
  network: 'Keine Verbindung. Försöker igen...',
  config: 'Prosit! saknar serverinställningar. Någon har rört sladdarna.',
  unknown: 'Etwas ging schief. Styrelsen skyller på moderniteten. Försök igen.',

  // Members
  member_not_found: 'Du finns inte längre i matrikeln. Anslut igen.',
  invalid_token: 'Ogiltigt medlemskort. Förfalskning misstänks. Anslut igen.',
  name_empty: 'Ein Name, bitte. Stadgarna kräver ett namn.',
  name_too_long: 'Namnet är för långt. Högst 16 tecken, så har vi alltid gjort.',
  name_taken: 'Namnet är redan inskrivet. Klubben tål bara en av varje. Välj ett annat.',
  colour_invalid: 'Den färgen godkänns inte av styrelsen.',
  colour_taken: 'Färgen är redan tagen. Ingen delar färg i den här klubben.',
  club_full: 'Klubben är fullsatt. Inga nya medlemmar sedan 1887.',

  // Night, drinks and Strafen
  night_ended: 'Protokollet är stängt. Gute Nacht.',
  drink_invalid: 'Den drycken finns inte i stadgarna.',
  nothing_to_undo: 'Nichts att ångra. Protokollet är tomt.',
  reason_empty: 'En Strafe kräver en motivering. Vi är inga barbarer.',
  reason_too_long: 'Motiveringen är för lång. Högst 80 tecken, detta är ingen roman.',
  target_not_found: 'Den medlemmen finns inte i matrikeln. Möjligen utesluten.',
  interval_invalid: 'Stadgarna medger mellan en halv och 60 minuter. Inte en sekund till.',

  // Events
  event_invalid: 'Händelsen underkändes av protokollet. Etwas ging schief.',
  event_closed: 'Zu spät! Händelsen är redan avslutad.',
} as const

export type ErrorCode = keyof typeof ERROR_MESSAGES
