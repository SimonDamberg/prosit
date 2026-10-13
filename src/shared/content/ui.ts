// Copy for the shared design-system components (src/ui) and the app shells. Swedish with fake
// German on top. Screen copy for each app goes in this folder too, so components never carry
// inline strings.

export const BRAND = {
  name: 'Prosit!',
  club: 'Herrenklubben',
  tagline: 'Officiellt Oktoberfestprotokoll',
} as const

/** Keys match ConnectionStatus in src/lib/connection.ts. */
export const CONNECTION_LABELS = {
  connecting: 'Ansluter',
  online: 'Live',
  offline: 'Keine Verbindung',
} as const

export const OFFLINE_BANNER = 'Keine Verbindung. Försöker igen...'

/**
 * Shown while the TV bundle downloads. It lives here rather than in a TV copy module so the router
 * does not pull the whole TV copy into the chunk every phone downloads.
 */
export const TV_LOADING = 'Der Fernseher laddar'

export const UI_LABELS = {
  close: 'Stäng',
  loading: 'Laddar',
} as const

/** Stage 1 placeholders. Stage 2 replaces both screens. */
export const PLACEHOLDER = {
  phone: 'Herr Präsident hälsar välkommen. Protokollet öppnar inom kort.',
  tv: 'Der Fernseher ist bereit. Skanna koden för att ansluta.',
  joinQr: 'QR-kod till telefonappen',
} as const
