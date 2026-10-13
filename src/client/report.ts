import { toPrositError } from '../lib/errors'
import { identityStore } from '../lib/identity'
import { toast } from '../ui'

/** Shows a failed RPC as a toast. A rejected membership sends the phone back to joining. */
export function reportError(err: unknown): void {
  const error = toPrositError(err)
  if (error.code === 'member_not_found' || error.code === 'invalid_token') identityStore.clear()
  toast({ text: error.message, tone: 'error' })
}
