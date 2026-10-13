// This device's member identity ({memberId, token}) in localStorage.
// Exposed as an external store so hooks re-render when it changes (also across tabs).

export interface Identity {
  memberId: string
  token: string
}

const IDENTITY_KEY = 'prosit.identity'

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // Storage blocked (private mode): the identity lives only for this page load.
  }
}

function parseIdentity(raw: string | null): Identity | null {
  if (!raw) return null
  try {
    const v = JSON.parse(raw) as Partial<Identity>
    return typeof v.memberId === 'string' && typeof v.token === 'string'
      ? { memberId: v.memberId, token: v.token }
      : null
  } catch {
    return null
  }
}

let current: Identity | null | undefined
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export const identityStore = {
  get(): Identity | null {
    if (current === undefined) current = parseIdentity(readStorage(IDENTITY_KEY))
    return current
  },
  set(identity: Identity): void {
    current = identity
    writeStorage(IDENTITY_KEY, JSON.stringify(identity))
    emit()
  },
  clear(): void {
    if (current === null) return
    current = null
    writeStorage(IDENTITY_KEY, null)
    emit()
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    if (listeners.size === 1) window.addEventListener('storage', onStorage)
    return () => {
      listeners.delete(listener)
      if (listeners.size === 0) window.removeEventListener('storage', onStorage)
    }
  },
}

function onStorage(e: StorageEvent) {
  if (e.key !== IDENTITY_KEY) return
  current = parseIdentity(e.newValue)
  emit()
}
