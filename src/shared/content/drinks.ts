// Names for the four drinks in the log. Keys match DrinkKind in src/shared/game/types.ts.
import type { DrinkKind } from '../game/types'

export const DRINK_LABELS: Record<DrinkKind, string> = {
  ol: 'Öl',
  mass: 'Maß',
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

/** Toast after a "+1", one line per kind. */
export const DRINK_LOGGED: Record<DrinkKind, string> = {
  ol: 'Ein Bier fört till protokollet. Prosit!',
  mass: 'Eine Maß fört till protokollet. Jawohl!',
  schnaps: 'Ein Schnaps fört till protokollet. Zack!',
  wasser: 'Ein Wasser antecknat. Styrelsen ser allvarligt på saken.',
}
