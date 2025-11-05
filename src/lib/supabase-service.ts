import { createClient } from '@supabase/supabase-js'

export function createServiceClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceRoleKey || serviceRoleKey === 'your_service_role_key_here') {
    console.warn('[supabase-service] SUPABASE_SERVICE_ROLE_KEY not configured. Using anon key (RLS enforced).');
    // Fall back to anon key - this will respect RLS policies
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!
    );
  }
  
  // Use service role key - this bypasses RLS policies
  console.info('[supabase-service] Using service role key for server-side operations');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`
        }
      }
    }
  );
}
