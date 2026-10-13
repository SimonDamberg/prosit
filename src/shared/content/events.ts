// Copy for the night controls and the events, on both the phone and the TV. Kept out of tv.ts so
// the phone bundle does not carry the dashboard copy.

/** Reasons written onto the points and Strafen that resolve() hands out. */
export const AWARD_REASONS = {
  prositFirst: 'Snabbast i skålen',
  prositLast: 'Sist i skålen',
  prositMissed: 'Missade skålen',
} as const

export const NIGHT = {
  idleTitle: 'Kvällen inväntar start',
  idleText: 'När alla är inskrivna i matrikeln öppnas kvällen. Därefter slår protokollet till när det behagar.',
  start: 'Starta kvällen',
  started: 'Kvällen är öppnad. Ordnung muss sein.',
  liveTitle: 'Kvällens ordning',
  interval: (minutes: string) => `Händelse ungefär var ${minutes} minut`,
  slower: 'Glesare',
  faster: 'Tätare',
  devTrigger: 'Nästa händelse nu (dev)',
} as const

export const PROSIT = {
  title: 'Prosit!',
  call: 'Höj glaset, skåla och tryck',
  button: 'Prost!',
  tapped: 'Skålen är protokollförd. Vänta på de långsamma.',
  tappedCount: (done: number, of: number) => `${done} av ${of} har skålat`,
  resultTitle: 'Skålen är avgjord',
  first: (name: string) => `Snabbast: ${name}`,
  strafe: (name: string) => `Strafe: ${name}`,
  noStrafe: 'Ingen Strafe. Misstänkt samstämmigt.',
  youFirst: 'Du var snabbast. Herr Präsident nickar gillande.',
  youStrafe: 'Zu langsam! Du får en Strafe.',
  youFine: 'Godkänd skål. Inga anmärkningar.',
  close: 'Weiter',
} as const

export const REGEL = {
  kicker: 'Neue Regel',
  title: 'Ny regel',
  holds: (clock: string) => `Gäller i ${clock}`,
  hint: 'Brott mot regeln bestraffas med Strafe.',
  report: 'Anmäl regelbrott',
  banner: 'Regel',
} as const

/** TV only. */
export const TV_STAGE = {
  unlockTitle: 'Der Fernseher är redo',
  unlockText: 'Ett tryck slår på ljudet. Därefter sköter protokollet resten.',
  unlockButton: 'Starta kvällen',
  idle: 'Kvällen inväntar start. Tryck på "Starta kvällen" i telefonen.',
} as const
