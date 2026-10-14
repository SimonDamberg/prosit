// Copy for the shared design-system components (src/ui) and the app shells. Swedish, with German
// only for the well-known Oktoberfest words. Screen copy for each app goes in this folder too, so components never carry
// inline strings.

export const BRAND = {
  name: 'Prosit!',
  club: 'Svarta Västarna',
  motto: 'Natura Statera',
  tagline: 'Officiellt Oktoberfestprotokoll',
} as const

/** Keys match ConnectionStatus in src/lib/connection.ts. */
export const CONNECTION_LABELS = {
  connecting: 'Ansluter, var god dröj',
  online: 'Live',
  offline: 'Ingen anslutning',
} as const

export const OFFLINE_BANNER = 'Ingen anslutning. Försöker igen...'

/**
 * Shown while the TV bundle downloads. It lives here rather than in a TV copy module so the router
 * does not pull the whole TV copy into the chunk every phone downloads.
 */
export const TV_LOADING = 'TV:n värms upp. Allt gott tar tid.'

export const UI_LABELS = {
  close: 'Stäng',
  loading: 'Laddar, med grundlighet',
} as const
