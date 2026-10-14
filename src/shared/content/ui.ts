// Copy for the shared design-system components (src/ui) and the app shells. Swedish with fake
// German on top. Screen copy for each app goes in this folder too, so components never carry
// inline strings.

export const BRAND = {
  name: 'Prosit!',
  club: 'Svarta Västarna',
  motto: 'Natura Statera',
  tagline: 'Officiellt Oktoberfestprotokoll',
} as const

/** Keys match ConnectionStatus in src/lib/connection.ts. */
export const CONNECTION_LABELS = {
  connecting: 'Ansluter, bitte warten',
  online: 'Live',
  offline: 'Keine Verbindung',
} as const

export const OFFLINE_BANNER = 'Keine Verbindung. Försöker igen...'

/**
 * Shown while the TV bundle downloads. It lives here rather than in a TV copy module so the router
 * does not pull the whole TV copy into the chunk every phone downloads.
 */
export const TV_LOADING = 'Der Fernseher värms upp. Allt gott tar tid.'

export const UI_LABELS = {
  close: 'Stäng',
  loading: 'Laddar, mit Gründlichkeit',
} as const
