// Copy for the phone app (src/client).

export const JOIN = {
  kicker: 'Ansökan om medlemskap',
  intro: 'Herr Präsident hälsar välkommen. Skriv in dig i matrikeln för att föra protokoll över kvällens drycker.',
  nameLabel: 'Namn',
  namePlaceholder: 'Herr ...',
  colourLabel: 'Färg i protokollet',
  colourTaken: 'upptagen',
  submit: 'Skriv in mig',
  full: 'Alla färger är upptagna. Klubben är fullsatt, precis som stadgarna föreskriver.',
  welcome: (name: string) => `Välkommen, ${name}! Du är inskriven i matrikeln. Västen knäpps.`,
  lostPhone: 'Redan inskriven men ny telefon? Be en broder visa ditt medlemskort, eller skriv in koden här.',
  codeLabel: 'Kod från medlemskortet',
  codePlaceholder: 'ABCD1234',
  codeSubmit: 'Återta min plats',
} as const

export const HOME = {
  greeting: 'Medlem i god ställning',
  drinksTitle: 'Protokollför en dryck',
  undo: 'Ångra senaste',
  undone: 'Struket ur protokollet. Det har aldrig hänt.',
  statsTitle: 'Ditt protokoll',
  litres: 'liter',
  litresShort: 'L',
  litresLabel: 'Drycker',
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
  ownPlaceholder: 'Brottets art och omfattning ...',
  submit: 'Verkställ Strafe',
  cancel: 'Nåd',
  given: (name: string) => `Strafe utdelad till ${name}. Ordnung muss sein.`,
} as const

export const ENDED = {
  title: 'God natt',
  text: 'Kvällen är avslutad och protokollet är stängt. Herr Präsident tackar för visad törst.',
} as const

export const PHONE_LOADING = {
  data: 'Protokollet hämtas ur arkivet',
  member: 'Matrikeln granskas av styrelsen',
} as const

/** Starting over: any member can, there is no game master. */
export const RESET = {
  title: 'Klubbens förvaltning',
  button: 'Ny kväll',
  text: 'Nollställer protokollet: drycker, Strafen, poäng och händelser stryks, som om kvällen aldrig ägt rum. Det kommer flera att önska.',
  confirmTitle: 'Börja om från noll? Historien skrivs om.',
  confirmText: 'Allt i protokollet stryks för gott. Matrikeln behålls om du inte väljer annat.',
  wipe: 'Stryk även matrikeln',
  wipeHint: 'Alla telefoner loggas ut och var och en skriver in sig på nytt. Bra före festen, om någon skrivit in sig två gånger.',
  confirm: 'Ja, nollställ',
  cancel: 'Nej, historien får stå',
  done: 'Protokollet är nollställt. Så har vi alltid gjort.',
} as const

/** The handover: a phone that lost its member gets it back with a code from another phone. */
export const HANDOVER = {
  title: 'Matrikeln',
  text: 'Har en broder bytt telefon eller tappat bort sig? Visa hans medlemskort här, så återtar han sin plats med drycker och Strafen i behåll.',
  button: 'Visa ett medlemskort',
  pickTitle: 'Vems medlemskort?',
  you: '(du)',
  cardTitle: (name: string) => `Medlemskort: ${name}`,
  scan: 'Skanna med den nya telefonen. Koden gäller i tio minuter och kan bara användas en gång.',
  code: 'Eller skriv in koden:',
  warning: 'Den gamla telefonen förlorar sin plats. Så är stadgarna skrivna.',
  close: 'Stäng',
  claimed: 'Välkommen tillbaka. Medlemskortet är förnyat, protokollet är intakt.',
} as const

/** The finished protocol as an image, for the group chat. */
export const PROTOCOL_SHARE = {
  button: 'Dela protokollet',
  busy: 'Protokollet präglas ...',
  saved: 'Protokollet är sparat. Arkivet tackar.',
  failed: 'Protokollet vägrade låta sig avbildas. Försök igen.',
  shareTitle: 'Kvällens protokoll',
  heading: 'Kvällens protokoll',
  columns: { litres: 'Liter', points: 'Poäng', strafen: 'Strafen' },
  footer: 'Protokollet är justerat och godkänt av styrelsen.',
  fileName: 'prosit-protokoll.png',
} as const
