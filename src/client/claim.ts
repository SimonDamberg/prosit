import { identityStore } from '../lib/identity'
import { getApi } from '../lib/supabase'
import { HANDOVER } from '../shared/content/phone'
import { toast } from '../ui'
import { reportError } from './report'

/** The query parameter a handover QR carries: `/?claim=CODE`. */
export const CLAIM_PARAM = 'claim'

/** Trades a claim code for its member and makes this phone that member. True on success. */
export async function claimMember(code: string): Promise<boolean> {
  try {
    const member = await getApi().claim(code)
    identityStore.set({ memberId: member.id, token: member.token })
    toast({ text: HANDOVER.claimed, tone: 'win' })
    return true
  } catch (err) {
    reportError(err)
    return false
  }
}

/** The handover link for a code, on this site. */
export function claimUrl(code: string): string {
  return `${window.location.origin}/?${CLAIM_PARAM}=${encodeURIComponent(code)}`
}
