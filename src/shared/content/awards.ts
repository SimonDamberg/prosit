// Copy for the finale (src/tv/Finale.tsx) and the awards list on the phone. Keys match AwardKey
// in src/shared/game/awards.ts. `value` arrives already formatted ("2,5", "287").
import type { AwardKey } from '../game/awards'

interface AwardCopy {
  /** The honour itself, in blackletter on the TV. */
  title: string
  /** What it was won with. */
  value: (value: string) => string
  /** One line from Herr Präsident. */
  citation: string
}

export const AWARDS: Record<AwardKey, AwardCopy> = {
  wasser: {
    title: 'Vattenbäraren',
    value: (n) => `${n} glas Wasser`,
    citation: 'För modernitet i vätskeform. Styrelsen tar del av beslutet med djup oro.',
  },
  schnaps: {
    title: 'Schnapskungen',
    value: (n) => `${n} Schnaps`,
    citation: 'För tjänster åt den kontinentala brännvinskulturen. Levern har underrättats.',
  },
  massvoll: {
    title: 'Måttlighetens riddare',
    value: (l) => `endast ${l} liter`,
    citation: 'För en återhållsamhet som klubben varken förstår eller förlåter.',
  },
  ordnung: {
    title: 'Ordningsmannen',
    value: (n) => `${n} utdelade Strafen`,
    citation: 'För nit, noggrannhet och ett aldrig sinande behov av att anmäla sina bröder.',
  },
  strafe: {
    title: 'Strafkungen',
    value: (n) => `${n} Strafen`,
    citation: 'För ett strafregister som hedrar ingen, allra minst innehavaren.',
  },
  hand: {
    title: 'Salongens snabbaste hand',
    value: (ms) => `${ms} ms`,
    citation: 'För en reflex som får kavaljererna i Wien att blekna.',
  },
  prosit: {
    title: 'Prosit-världsmästaren',
    value: (n) => `först ${n} gånger`,
    citation: 'För att alltid ha glaset närmare munnen än samvetet.',
  },
  orakel: {
    title: 'Oktoberfestens orakel',
    value: (n) => `närmast ${n} gånger`,
    citation: 'För bildning, eller för gissningar som på håll liknar bildning.',
  },
  orator: {
    title: 'Kvällens talare',
    value: (avg) => `${avg} Maß av 5`,
    citation: 'För vältalighet som rörde klubben till tårar, eller åtminstone till nästa glas.',
  },
  bier: {
    title: 'Bierkungen',
    value: (l) => `${l} liter`,
    citation: 'För kvällens största insats för den bayerska ekonomin. Så har vi alltid gjort.',
  },
  praesident: {
    title: 'Herr Präsident för en natt',
    value: (n) => `${n} poäng`,
    citation: 'Kvällens högsta utmärkelse. Bär kedjan med värdighet till nästa sammanträde.',
  },
}

export const FINALE = {
  kicker: 'Avslutningsceremoni',
  title: 'Prisutdelning',
  intro: 'Herr Präsident ber de närvarande att resa sig. Eller åtminstone att sitta rakt.',
  none: 'Kvällen gav inga meriter. Protokollet är tomt, och skammen är total.',
  count: (index: number, of: number) => `Utmärkelse ${index} av ${of}`,
  drumroll: 'Och priset går till ...',
  grand: 'Kvällens högsta utmärkelse',
  standingsTitle: 'Slutprotokoll',
  litres: 'Liter',
  strafen: 'Strafen',
  points: 'Poäng',
  awards: 'Utmärkelser',
  goodnight: 'God natt. Mötet är avslutat. Nästa sammanträde: när törsten kallar.',
} as const

/** The phone's ended screen. */
export const MY_AWARDS = {
  title: 'Dina utmärkelser',
  none: 'Inga utmärkelser i år. Deltagandet är också en merit, enligt moderna pedagoger.',
  shared: (names: string) => `Delas med ${names}`,
} as const
