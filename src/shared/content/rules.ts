// The Regel pool. One of these holds for a while and any member may hand out a Strafe for a
// breach. Keep each short: `Regelbrott: <rule>` must fit a Strafe reason (a test checks it).

export const RULES = [
  'Ingen dricker med höger hand',
  'Alla tilltalas med Herr och efternamn',
  'Ingen nämner jobbet',
  'Varje klunk inleds med ett "Prosit"',
  'Svordomar endast på tyska',
  'Glaset får aldrig stå tomt på bordet',
  'Ingen säger nej, endast "nein"',
  'Skål kräver ögonkontakt, ohne Ausnahme',
  'Ingen pekar med fingret, endast med armbågen',
  'Den som reser sig bugar för Herr Präsident',
  'Ingen rör sitt glas utan att först fråga protokollet',
  'Moderniteter får inte nämnas vid namn',
] as const

/** The reason on a Strafe for breaking the rule that is in force. */
export const ruleBreach = (rule: string) => `Regelbrott: ${rule}`
