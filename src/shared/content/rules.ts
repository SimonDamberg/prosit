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
  'Telefoner ligger med skärmen nedåt, utom i tjänsten',
  'Alla meningar avslutas med "jawohl"',
  'Ingen korsar benen, det är omanligt enligt stadgarna',
  'Den som skrattar tar en klunk',
  'Ingen säger "jag", endast "undertecknad"',
  'Alla siffror uttalas på tyska',
  'Ingen sitter ned medan Herr Präsident står',
  'Glaset lyfts endast med lillfingret utsträckt',
  'Varje fråga besvaras med en motfråga',
  'Ingen nämner klockan eller hur sent det är',
  'Den som lämnar bordet begär permission',
  'Ingen dricker ensam: höj glaset mot någon först',
  'Glaset lyfts med båda händerna',
  'Ingen säger "tack", endast "danke"',
  'Den som talar håller i sitt glas',
  'Varje skål avslutas med en bugning',
  'Ingen nämner en veckodag vid namn',
  'Ordet "öl" är förbjudet, det heter "Bier"',
  'Alla tilltalar varandra med "Ni"',
  'Ingen lutar sig mot ryggstödet',
  'Armbågarna hålls borta från bordet',
  'Engelska ord är förbjudna, ohne Ausnahme',
  // Member themes, from the running jokes in Rally75 (natcasino kuskar.ts). Simon may veto.
  'Den som skyller på lagg tar en klunk',
  'Ingen hotar med förtal eller advokat',
  'Ingen recenserar sitt öl: det är gott, punkt',
  'Allt som uppfunnits efter 1918 ska ursäktas när det nämns',
  'Ingen blundar, tupplurar räknas som frånvaro',
  'Den som ropar "droppar slak" förklarar vad det betyder',
] as const

/** The reason on a Strafe for breaking the rule that is in force. */
export const ruleBreach = (rule: string) => `Regelbrott: ${rule}`
