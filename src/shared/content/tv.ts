// Copy for the TV app (src/tv).

export const TV_JOIN = {
  title: 'Skanna och skriv in dig',
  text: 'Rikta telefonen mot koden. TV:n sköter resten, som en pålitlig betjänt.',
  qrLabel: 'QR-kod till telefonappen',
  corner: 'Anslut',
} as const

export const TV_EMPTY = {
  title: 'Matrikeln är tom',
  text: 'Ingen medlem har ännu infunnit sig. Herr Präsident väntar, och antecknar.',
} as const

export const TV_BARS = {
  title: 'Ställningen',
  // Capital: a lowercase l reads as a one next to the digits.
  litres: 'L',
  noDrinks: 'Torrlagd, tills vidare',
  points: (n: number) => `${n} p`,
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

export const TV_ENDED = 'Kvällen är avslutad. God natt.'

export const TV_DATA_LOADING = 'Protokollet hämtas ur arkivet'

/**
 * The club's statutes, one at a time after the motto in the TV header. Short enough for one line
 * at 1920 wide (a test holds them to 56 characters).
 */
export const STADGAR = [
  '§ 1. Herr Präsident har alltid rätt.',
  '§ 2. Har Herr Präsident fel, se § 1.',
  '§ 4. Västen knäpps. Undantag medges ej.',
  '§ 7. Havremjölk är ingen mjölk.',
  '§ 9. Alkoholfritt öl är en motsägelse.',
  '§ 12. Elsparkcykeln är inget fordon, utan ett symptom.',
  '§ 14. Stadgarna får ändras. Det har aldrig hänt.',
  '§ 18. Skålen sker med ögonkontakt och allvar.',
  '§ 21. Den som kommer sent förklarar sig skriftligt.',
  '§ 23. Kassan redovisas vid behov. Behov föreligger ej.',
  '§ 27. Wasser tolereras, som medicin.',
  '§ 31. Allt nytt är misstänkt tills motsatsen bevisats.',
  '§ 33. Mötet avslutas när ölet är slut, inte förr.',
  '§ 38. Ett videomöte är inget möte.',
  '§ 45. Brezeln bryts. Den skärs inte.',
  '§ 50. Så har vi alltid gjort.',
  '§ 51. Det vi gjorde i fjol är tradition.',
  '§ 60. Jesper får sova vid bordet, men inte snarka.',
  '§ 62. Axel bugar på hela klubbens vägnar.',
  '§ 64. Erik sitter närmast fönstret.',
  '§ 66. Simon ser inget jäv.',
  '§ 70. Palms advokat har yttranderätt men ej rösträtt.',
] as const

/** Machtwechsel: the points lead changes hands. */
export const TV_CROWN = {
  label: 'Leder poängligan',
  toast: (name: string) => `Maktskifte! ${name} tar makten i poängligan.`,
} as const

/**
 * Der Herold: what the TV reads aloud, in a German voice. Swedish words, German accent: that is
 * the joke. Short, so a line is over before the room has stopped laughing.
 */
export const HEROLD = {
  strafe: (name: string, reason: string) => `Achtung! Strafe für ${name}. ${reason}.`,
  achievement: (title: string, name: string) => `${title}! ${name}.`,
  machtwechsel: (name: string) => `Machtwechsel! ${name} tar makten.`,
  award: (title: string, names: string) => `${title}: ${names}!`,
  prosit: (first: string | null, punished: string) =>
    [first ? `Snabbast: ${first}.` : '', punished ? `Strafe für ${punished}.` : 'Ingen Strafe.'].join(' ').trim(),
  duell: (winner: string | null) => (winner ? `${winner} drog först. Jawohl!` : 'Ingen segrare. Schande!'),
  abstimmung: (title: string, names: string) => (names ? `${title}: ${names}!` : 'Ingen röstade.'),
  schatzfrage: (closest: string | null) => (closest ? `Närmast: ${closest}. Bildung!` : 'Ingen svarade. Feigheit!'),
  trinkspruch: (name: string, average: string | null) => (average ? `${name}: ${average} Maß.` : 'Ingen satte betyg.'),
  ehrengericht: (name: string, guilty: boolean) => (guilty ? `${name}: Schuldig! Skyldig!` : `${name}: Frikänd. In dubio pro Bier.`),
  stadgeandring: (passed: boolean) => (passed ? 'Antagen! Stadgarna är ändrade.' : 'Avslagen. Så har vi alltid gjort.'),
} as const
