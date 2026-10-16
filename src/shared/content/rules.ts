// The Regel pool. One of these holds for a while and any member may hand out a Strafe for a
// breach. Keep each short: `Regelbrott: <rule>` must fit a Strafe reason (a test checks it).

export const RULES = [
  "Ingen dricker med höger hand",
  "Alla tilltalas med Herr och efternamn",
  "Ingen nämner jobbet",
  'Varje klunk inleds med ett "Prosit"',
  "Svordomar endast från före 1900",
  "Glaset får aldrig stå tomt på bordet",
  'Ingen säger nej, endast "nein"',
  "Skål kräver ögonkontakt, utan undantag",
  "Ingen pekar med fingret, endast med armbågen",
  "Moderniteter får inte nämnas vid namn",
  "Telefoner ligger med skärmen nedåt, utom i tjänsten",
  "Den som skrattar tar en klunk",
  'Ingen säger "jag", endast "undertecknad"',
  'Ingen säger "okej", endast "så sker"',
  "Glaset lyfts endast med lillfingret utsträckt",
  "Ingen nämner klockan eller hur sent det är",
  "Den som lämnar bordet begär permission",
  "Ingen dricker ensam: höj glaset mot någon först",
  "Glaset lyfts med båda händerna",
  'Ingen säger "tack", endast "danke"',
  "Varje skål avslutas med en bugning",
  'Ordet "öl" är förbjudet, det heter "Bier"',
  'Alla tilltalar varandra med "Ni"',
  // Member themes, from the running jokes in Rally75 (natcasino kuskar.ts). Simon may veto.
  "Ingen hotar med förtal eller advokat",
  "Ingen recenserar sitt öl: det är gott, punkt",
  "Allt som uppfunnits efter 1918 ska ursäktas när det nämns",
  "Den som luktar pappersbruk sitter närmast fönstret",
  "Ingen nämner Magic-kort",
  "Den som fastnar i en hiss anmäler det till protokollet",
  "Den som nämner pengar hänvisas till Palms advokat",
] as const;

/** The reason on a Strafe for breaking the rule that is in force. */
export const ruleBreach = (rule: string) => `Regelbrott: ${rule}`;
