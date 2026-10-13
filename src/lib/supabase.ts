// Browser singletons. The only place the app reads the Supabase env vars.
import type { SupabaseClient } from '@supabase/supabase-js'
import { createApi, type Api } from './api'
import { createSupabase } from './client'
import { PrositError } from './errors'

let client: SupabaseClient | null = null
let api: Api | null = null

/** Throws PrositError('config') if the VITE_ env vars are missing. */
export function getSupabase(): SupabaseClient {
  if (!client) {
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
    if (!url || !key) throw new PrositError('config')
    client = createSupabase(url, key)
  }
  return client
}

export function getApi(): Api {
  api ??= createApi(getSupabase())
  return api
}
