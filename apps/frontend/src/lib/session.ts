import { supabase } from './supabase'

/**
 * Returns a valid Supabase access token for API calls. Refreshes the session
 * first so an expired access_token is replaced with a new one (backend JWT
 * validation will otherwise return 401).
 */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.refreshSession()
  return data.session?.access_token ?? null
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}
