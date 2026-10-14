// Copy for the night controls and the events, on both the phone and the TV. Kept out of tv.ts so
// the phone bundle does not carry the dashboard copy.

/** Reasons written onto the points and Strafen that resolve() hands out. */
export const AWARD_REASONS = {
  prositFirst: 'Snabbast i skålen',
  prositLast: 'Sist i skålen',
  prositMissed: 'Missade skålen',
  duellWon: 'Vann duellen',
  duellLost: 'Förlorade duellen',
  duellFalseStart: 'Tjuvstart i duellen',
  duellNoShow: 'Uteblev från duellen',
  duellPick: 'Tippade rätt duellant',
  schatzClosest: 'Närmast i Schätzfrage',
  schatzFurthest: 'Längst ifrån i Schätzfrage',
  trinkspruch: 'Betyg för Trinkspruch',
  trinkspruchBad: 'Undermålig Trinkspruch',
} as const

export const NIGHT = {
  idleTitle: 'Kvällen inväntar start',
  idleText: 'När alla är inskrivna i matrikeln öppnas kvällen. Därefter slår protokollet till när det behagar, utan förvarning och utan nåd.',
  start: 'Starta kvällen',
  started: 'Kvällen är öppnad. Ordnung muss sein.',
  liveTitle: 'Kvällens ordning',
  interval: (minutes: string) => `Händelse ungefär var ${minutes} minut`,
  slower: 'Glesare',
  faster: 'Tätare',
  end: 'Avsluta kvällen',
  endTitle: 'Avsluta kvällen?',
  endText: 'Protokollet stängs, inga fler drycker eller Strafen förs in, och der Fernseher håller prisutdelningen. Det går inte att ångra.',
  endConfirm: 'Ja, avsluta',
  endCancel: 'Nein, vi fortsätter',
  devTrigger: 'Nästa händelse nu (dev)',
  devKinds: {
    prosit: 'Prosit',
    duell: 'Duell',
    regel: 'Regel',
    abstimmung: 'Abstimmung',
    schatzfrage: 'Schätzfrage',
    trinkspruch: 'Trinkspruch',
  },
} as const

export const PROSIT = {
  title: 'Prosit!',
  call: 'Höj glaset, skåla och tryck',
  button: 'Prost!',
  tapped: 'Skålen är protokollförd. Vänta på de långsamma, och döm dem i tysthet.',
  tappedCount: (done: number, of: number) => `${done} av ${of} har skålat`,
  resultTitle: 'Skålen är avgjord',
  first: (name: string) => `Snabbast: ${name}`,
  strafe: (name: string) => `Strafe: ${name}`,
  noStrafe: 'Ingen Strafe. Misstänkt samstämmigt.',
  youFirst: 'Du var snabbast. Herr Präsident nickar gillande.',
  youStrafe: 'Zu langsam! Du får en Strafe.',
  youFine: 'Godkänd skål. Inga anmärkningar, inga lovord.',
} as const

/** The button that puts a verdict away. */
export const VERDICT_CLOSE = 'Weiter'

export const REGEL = {
  kicker: 'Neue Regel',
  title: 'Ny regel',
  holds: (clock: string) => `Gäller i ${clock}`,
  hint: 'Brott mot regeln bestraffas med Strafe. Okunskap är ingen ursäkt.',
  report: 'Anmäl regelbrott',
  banner: 'Regel',
} as const

export const DUELL = {
  title: 'Duell!',
  versus: 'mot',
  ready: 'Vänta på signalen. Tjuvstart bestraffas.',
  wait: 'Warte ...',
  draw: 'Zieh!',
  tapped: 'Skottet är avlossat. Invänta domen.',
  falseStart: 'Tjuvstart! Schande.',
  pickTitle: 'Vem drar först?',
  picked: (name: string) => `Du håller på ${name}. Nu tiger du.`,
  pickClosed: 'Vadslagningen är stängd. Tystnad i salongen.',
  tvReady: 'Duellanterna fattar sina telefoner. Övriga tippar segraren.',
  resultTitle: 'Duellen är avgjord',
  winner: (name: string, ms: number) => `${name} drog först: ${ms} ms`,
  strafe: (names: string) => `Strafe: ${names}`,
  nobody: 'Ingen segrare. Två Strafen, ohne Gnade.',
  youWon: 'Du vann. Hedern är räddad.',
  youLost: 'Du förlorade. Strafe, och skammen därtill.',
  youBoth: 'Ingen av er förtjänade att vinna. Strafe.',
  youPickedRight: 'Rätt tippat. En poäng till protokollet.',
  youPickedWrong: 'Fel häst. Inga poäng, och ingen sympati.',
  youWatched: 'Du såg på. Det är också en insats.',
  youShrugged: 'Ingen vann, alltså vann ingen på dig heller.',
} as const

export const ABSTIMMUNG = {
  kicker: 'Abstimmung',
  call: 'Rösta på en medlem. Röst på sig själv godtas, men antecknas.',
  voted: (name: string) => `Din röst gick till ${name}. Valhemlighet tillämpas inte.`,
  count: (done: number, of: number) => `${done} av ${of} har röstat`,
  resultTitle: 'Rösterna är räknade',
  votes: (n: number) => (n === 1 ? '1 röst' : `${n} röster`),
  noVotes: 'Ingen röstade. Demokrati var ändå en modernitet.',
  youWon: (title: string) => `Du är nu ${title}. Bär titeln med värdighet.`,
  youSpared: 'Du slapp undan. Den här gången.',
  banner: 'Titel',
  holder: (title: string, names: string) => `${title}: ${names}`,
} as const

export const SCHATZFRAGE = {
  kicker: 'Schätzfrage',
  call: 'Uppskatta. Protokollet godtar endast siffror.',
  placeholder: 'Din uppskattning',
  submit: 'Lämna in under ed',
  sent: 'Svaret är inlämnat. Ångerrätt saknas.',
  count: (done: number, of: number) => `${done} av ${of} har svarat`,
  resultTitle: 'Facit',
  answerLabel: 'Rätt svar',
  /** A number with its unit, if it has one. */
  value: (answer: string, unit: string) => (unit ? `${answer} ${unit}` : answer),
  closest: (name: string) => `Närmast: ${name}`,
  strafe: (name: string) => `Strafe: ${name}`,
  noStrafe: 'Ingen Strafe. Klubben är ovanligt bildad.',
  nobody: 'Ingen vågade svara. Feigheit.',
  youClosest: 'Du kom närmast. Bildung lönar sig.',
  youFurthest: 'Du var längst ifrån. Strafe för okunnighet.',
  youFine: 'Varken bäst eller sämst. Medelmåttan består.',
  youSilent: 'Du svarade inte. Protokollet noterar tystnaden.',
  yourGuess: (guess: string) => `Du svarade ${guess}.`,
  guess: (name: string, guess: string) => `${name}: ${guess}`,
} as const

export const TRINKSPRUCH = {
  kicker: 'Trinkspruch',
  speaker: (name: string) => `${name} håller tal`,
  youSpeak: 'Du håller tal',
  prep: 'Res dig, harkla dig och höj glaset',
  speaking: 'Tala!',
  rating: 'Klubben överlägger',
  listen: 'Lyssna andäktigt. Betygsättningen öppnar efter talet.',
  sitDown: 'Sätt dig. Klubben överlägger om ditt öde.',
  rateTitle: 'Betygsätt talet',
  rate: (n: number) => `${n} Maß`,
  topic: (topic: string) => `Ämne: ${topic}`,
  rated: (n: number) => `Du gav ${n} Maß. Domen står fast.`,
  count: (done: number, of: number) => `${done} av ${of} har satt betyg`,
  resultTitle: 'Domen över talet',
  average: (average: string) => `${average} Maß av 5`,
  averageLabel: 'Klubbens betyg',
  none: 'Ingen satte betyg. Talet stryks ur protokollet.',
  points: (name: string, n: number) => `${n} poäng till ${name}`,
  strafe: (name: string) => `Strafe: ${name}`,
  youGood: 'Klubben är rörd. Poängen är dina.',
  youBad: 'Undermåligt. Strafe, och tystnad framöver.',
  youJudged: 'Ditt betyg är protokollfört. Talaren får aldrig veta. Alla får veta.',
} as const

/** TV only. */
export const TV_STAGE = {
  unlockTitle: 'Der Fernseher är redo',
  unlockText: 'Ett tryck slår på ljudet. Därefter sköter protokollet resten, och ingen rör der Fernseher igen.',
  unlockButton: 'Starta kvällen',
  idle: 'Kvällen inväntar start. Tryck på "Starta kvällen" i telefonen.',
} as const
