// Names for the four drinks in the log. Keys match DrinkKind in src/shared/game/types.ts.
import type { DrinkKind } from '../game/types'

export const DRINK_LABELS: Record<DrinkKind, string> = {
  ol: 'Öl',
  mass: 'Sejdel',
  schnaps: 'Schnaps',
  wasser: 'Wasser',
}

/** Shown under the label on the "+1" buttons. */
export const DRINK_HINTS: Record<DrinkKind, string> = {
  ol: '50 cl',
  mass: 'En hel liter',
  schnaps: '4 cl',
  wasser: 'Mot bättre vetande',
}

export const DRINK_ICONS: Record<DrinkKind, string> = {
  ol: '🍺',
  mass: '🍻',
  schnaps: '🥃',
  wasser: '💧',
}

/** Toast after the Maß that makes a Wasser due (wasserDue). Cycled like DRINK_LOGGED. */
export const WASSER_NUDGE = [
  'Tre Maß utan Wasser. Styrelsen protesterar, men läkaren insisterar. Ett Wasser, tack.',
  'Klubbens läkare har yttrat sig: ett glas Wasser. Protokollet suckar men lyder.',
  'Tre Maß i rad. Ett Wasser nu är ingen modernitet, det är underhåll.',
] as const

/** Toast after a "+1". The phone cycles through each kind's lines, so the joke does not wear out. */
export const DRINK_LOGGED: Record<DrinkKind, readonly string[]> = {
  ol: [
    'Ett Bier fört till protokollet. Prosit!',
    'Ett Bier till. Bryggaren tackar för förtroendet.',
    'Bier antecknat. Så har vi alltid gjort.',
    'Protokollfört. Renhetslagen är nöjd.',
  ],
  mass: [
    'En Maß fört till protokollet. Jawohl!',
    'En hel liter. Herr Präsident lyfter på hatten.',
    'Maß antecknad. Armen tränas, själen likaså.',
    'En Maß! Stolarna i salongen darrar av respekt.',
  ],
  schnaps: [
    'En Schnaps fört till protokollet. Pang!',
    'Schnaps antecknad. Rakt ner, utan att blinka.',
    'Ett litet glas, en stor insats för klubben.',
  ],
  wasser: [
    'Ett Wasser antecknat. Styrelsen ser allvarligt på saken.',
    'Wasser? Protokollet noterar detta med bestörtning.',
    'Vatten antecknat. Havremjölken är nästa steg, varnar styrelsen.',
    'Wasser antecknat. Brottet preskriberas vid nästa Maß.',
  ],
}
