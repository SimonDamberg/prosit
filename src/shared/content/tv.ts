// Copy for the TV app (src/tv).

export const TV_JOIN = {
  title: 'Skanna och skriv in dig',
  text: 'Rikta telefonen mot koden. Der Fernseher sköter resten.',
  qrLabel: 'QR-kod till telefonappen',
  corner: 'Anslut',
} as const

export const TV_EMPTY = {
  title: 'Matrikeln är tom',
  text: 'Ingen medlem har ännu infunnit sig. Herr Präsident är inte road.',
} as const

export const TV_BARS = {
  title: 'Ställningen',
  // Capital: a lowercase l reads as a one next to the digits.
  litres: 'L',
  noDrinks: 'Torrlagd',
} as const

export const TV_PACE = {
  title: 'Kvällens tempo',
  empty: 'Första glaset inväntas. Tålamod är ingen dygd här.',
  start: 'Start',
  now: 'Nu',
  axis: 'liter',
} as const

export const TV_TOTALS = {
  litres: 'Liter totalt',
  drinks: 'Ädla drycker',
  wasser: 'Wasser',
  strafen: 'Strafen',
} as const

export const TV_STRAFEN = {
  title: 'Strafregister',
  none: 'Inga Strafen ännu. Ordnung råder.',
  toast: (name: string, reason: string) => `Strafe till ${name}: ${reason}`,
} as const

export const TV_ENDED = 'Kvällen är avslutad. Gute Nacht.'

export const TV_DATA_LOADING = 'Protokollet hämtas'
