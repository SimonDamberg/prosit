// Supabase client factory, shared by the browser singleton (supabase.ts) and Node scripts.
import { createClient, type SupabaseClient, type SupabaseClientOptions } from '@supabase/supabase-js'

export function createSupabase(
  url: string,
  key: string,
  options: SupabaseClientOptions<'public'> = {},
): SupabaseClient {
  return createClient(url, key, {
    ...options,
    // Default is 25 s. A socket that died quietly is only noticed a heartbeat or two later, and
    // every reconnect refetches everything, so find out sooner. A PROSIT! is only 60 s long.
    realtime: { heartbeatIntervalMs: 10_000, ...options.realtime },
    // Members are identified by {memberId, token}, not Supabase Auth.
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}
