import { createClient, SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

const isPlaceholder = (v: string) =>
  !v ||
  v.includes('your-project-ref') ||
  v === 'your_anon_key_here'

if (isPlaceholder(url) || isPlaceholder(anonKey)) {
  throw new Error(
    'Supabase is not configured. In apps/frontend/.env set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from your Supabase project (Settings → API). Restart the dev server after changing .env.'
  )
}

export const supabase: SupabaseClient = createClient(url, anonKey)
