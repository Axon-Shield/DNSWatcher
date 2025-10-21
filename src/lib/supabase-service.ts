import { createClient } from '@supabase/supabase-js'

export function createServiceClient() {
  // Temporarily use anon key until service role key is configured
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
