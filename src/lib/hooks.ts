// React hooks over the stores in this folder. Stage 2 adds the Realtime-backed data hooks here.
import { useSyncExternalStore } from 'react'
import { connectionStore, type ConnectionStatus } from './connection'
import { identityStore, type Identity } from './identity'

export function useConnection(): ConnectionStatus {
  return useSyncExternalStore(connectionStore.subscribe, connectionStore.getSnapshot, () => 'connecting')
}

/** This device's member identity, or null before joining. */
export function useIdentity(): Identity | null {
  return useSyncExternalStore(identityStore.subscribe, identityStore.get, () => null)
}
