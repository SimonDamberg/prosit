// Copy for the phone app (src/client).

export const JOIN = {
  kicker: 'Ansökan om medlemskap',
  intro: 'Herr Präsident hälsar välkommen. Skriv in dig i matrikeln för att föra protokoll över kvällens drycker.',
  nameLabel: 'Namn',
  namePlaceholder: 'Herr ...',
  colourLabel: 'Färg i protokollet',
  colourTaken: 'upptagen',
  submit: 'Skriv in mig',
  full: 'Alla färger är upptagna. Klubben är fullsatt.',
  welcome: (name: string) => `Willkommen, ${name}! Du är inskriven i matrikeln.`,
} as const

export const HOME = {
  greeting: 'Ordinarie medlem',
  drinksTitle: 'Protokollför en dryck',
  undo: 'Ångra senaste',
  undone: 'Struket ur protokollet. Det har aldrig hänt.',
  statsTitle: 'Ditt protokoll',
  litres: 'liter',
  litresShort: 'L',
  litresLabel: 'Ädla drycker',
  place: 'Placering',
  placeOf: (place: number, of: number) => `${place} av ${of}`,
  noPlace: 'Oplacerad',
  strafen: 'Strafen',
  strafeButton: 'Dela ut en Strafe',
  myStrafenTitle: 'Dina Strafen',
  noStrafen: 'Inga Strafen. Misstänkt skötsamt.',
  strafeBy: (name: string) => `Utdelad av ${name}`,
  strafeByClub: 'Utdelad av protokollet',
} as const

export const STRAFE_SHEET = {
  title: 'Dela ut en Strafe',
  who: 'Vem har förbrutit sig?',
  why: 'Motivering',
  ownReason: 'Egen motivering',
  ownPlaceholder: 'Brottets art ...',
  submit: 'Verkställ Strafe',
  cancel: 'Nåd',
  given: (name: string) => `Strafe utdelad till ${name}. Ordnung muss sein.`,
} as const

export const ENDED = {
  title: 'Gute Nacht',
  text: 'Kvällen är avslutad och protokollet är stängt. Herr Präsident tackar för visad törst.',
} as const

export const PHONE_LOADING = {
  data: 'Protokollet hämtas',
  member: 'Matrikeln kontrolleras',
} as const

/** Starting over: any member can, there is no game master. */
export const RESET = {
  title: 'Klubbens förvaltning',
  button: 'Ny kväll',
  text: 'Nollställer protokollet: drycker, Strafen, poäng och händelser stryks.',
  confirmTitle: 'Börja om från noll?',
  confirmText: 'Allt i protokollet stryks för gott. Matrikeln behålls om du inte väljer annat.',
  wipe: 'Stryk även matrikeln',
  wipeHint: 'Alla telefoner loggas ut och var och en skriver in sig på nytt. Bra före festen, om någon skrivit in sig två gånger.',
  confirm: 'Ja, nollställ',
  cancel: 'Avbryt',
  done: 'Protokollet är nollställt. Så har vi alltid gjort.',
} as const
