import { createClient } from '@supabase/supabase-js'

export function createServiceClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceRoleKey || serviceRoleKey === 'your_service_role_key_here') {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not configured. Using anon key (RLS policies will be enforced).');
    // Fall back to anon key - this will respect RLS policies
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  
  // Use service role key - this bypasses RLS policies
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
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
