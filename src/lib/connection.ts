// Global connection state: browser online/offline, Realtime channel status and the outcome of
// the latest fetch. Read it with useConnection().

export type ConnectionStatus = 'connecting' | 'online' | 'offline'

const channels = new Map<string, string>()
let browserOnline = typeof navigator === 'undefined' ? true : navigator.onLine
let fetchFailing = false
let anyFetchOk = false
let snapshot: ConnectionStatus = 'connecting'
const listeners = new Set<() => void>()

function compute(): ConnectionStatus {
  if (!browserOnline || fetchFailing) return 'offline'
  const statuses = [...channels.values()]
  if (statuses.some((s) => s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED')) return 'offline'
  if (statuses.length > 0 && statuses.every((s) => s === 'SUBSCRIBED')) return 'online'
  if (statuses.length === 0 && anyFetchOk) return 'online'
  return 'connecting'
}

function update() {
  const next = compute()
  if (next === snapshot) return
  snapshot = next
  listeners.forEach((l) => l())
}

function onOnline() {
  browserOnline = true
  update()
}

function onOffline() {
  browserOnline = false
  update()
}

export const connectionStore = {
  getSnapshot: (): ConnectionStatus => snapshot,
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    if (listeners.size === 1 && typeof window !== 'undefined') {
      window.addEventListener('online', onOnline)
      window.addEventListener('offline', onOffline)
    }
    return () => {
      listeners.delete(listener)
      if (listeners.size === 0 && typeof window !== 'undefined') {
        window.removeEventListener('online', onOnline)
        window.removeEventListener('offline', onOffline)
      }
    }
  },
  reportChannel(id: string, status: string | null): void {
    if (status === null) channels.delete(id)
    else channels.set(id, status)
    update()
  },
  reportFetch(ok: boolean): void {
    fetchFailing = !ok
    if (ok) anyFetchOk = true
    update()
  },
}
