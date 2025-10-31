# Supabase Integration Context

## Supabase Configuration
- **Project URL**: https://ipdbzqiypnvkgpgnsyva.supabase.co
- **Anon Key**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwZGJ6cWl5cG52a2dwZ25zeXZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMDcyMzYsImV4cCI6MjA3NjU4MzIzNn0.DnoH8NEp1CWGj4qQ4ow8x_HiFp7XC_PglS8pQb3ICVU
- **Service Role Key**: Available in environment variables

## Database Schema
### Tables
- **users**: User accounts, email verification, subscription tiers
  - `email_confirmed`: Boolean for email verification status
  - `password_set`: Boolean for password setup status
  - `password_set_at`: Timestamp when password was set
  - `subscription_tier`: 'free' or 'pro' enum
  - `max_zones`: Integer limit (1 for free, unlimited for pro)
- **dns_zones**: Monitored DNS zones with soft delete support
  - `is_active`: Boolean for soft delete functionality
  - `activated_at`: Timestamp when zone was activated
  - `deactivated_at`: Timestamp when zone was soft deleted
- **zone_checks**: Historical SOA record checks with change tracking
  - `previous_soa_data`: Text field for previous SOA record
  - `change_details`: JSONB field for detailed change information
- **notifications**: Sent notification logs
  - `sent_at`: Timestamp when notification was sent

### Supabase Auth Integration
- **User Management**: Users created in both `auth.users` and `public.users`
- **Password Authentication**: Uses Supabase Auth for password-based login
- **Email Verification**: Supabase Auth handles email verification tokens
- **Password Reset**: Uses Supabase Auth's built-in password reset functionality
- **Session Management**: Supabase Auth manages user sessions

## Edge Functions
### send-email
- **Purpose**: Send email notifications for DNS changes
- **Triggered by**: DNS monitoring cron job when changes detected
- **Email Service**: Resend API integration
- **Sender**: noreply@dnswatcher.axonshield.com
- **Functionality**:
  - Send emails via Resend API
  - Fallback to console logging if Resend not configured
  - Handle HTML and text email formats
  - Return delivery status and email ID

## Edge Functions
### send-email
- **Purpose**: Send email notifications for DNS changes
- **Triggered by**: DNS monitoring cron job when changes detected
- **Email Service**: Resend API integration
- **Sender**: noreply@dnswatcher.axonshield.com (hardcoded)
- **Status**: ✅ **FULLY OPERATIONAL** - Successfully sending emails
- **Functionality**:
  - Send emails via Resend API
  - Fallback to console logging if Resend not configured
  - Handle HTML and text email formats
  - Return delivery status and email ID
  - Verified email delivery with ID: 85742c62-110c-4743-8b2c-689978e05d1e

### dns-monitor
- **Purpose**: Smart high-frequency DNS monitoring with per-zone cadence synchronization
- **Status**: ✅ **FULLY OPERATIONAL** - Per-zone cadence support with 1-second cron tick
- **Functionality**:
  - Query Google DNS over HTTPS for SOA records
  - Handle both `Answer` and `Authority` sections (subdomain support)
  - If `Answer` is empty, fall back to `Authority` to read the governing SOA (typical for subdomains inheriting apex SOA)
  - Tracking a subdomain does not create/track the apex as a separate zone; the apex SOA is only read when it governs the subdomain
  - Per-zone cadence: Uses `next_check_at` to honor user-selected cadence (1s/15s/30s/60s)
  - Only processes zones where `next_check_at <= now()` or `next_check_at IS NULL`
  - Updates `last_checked` and recalculates `next_check_at` after each check
  - Smart change detection with filtering to prevent spam
  - Serial stability checks and trend analysis
  - Record zone checks in database
  - Send email notifications only for genuine changes
  - Verified change detection: Serial 2386530407 → 2386530404
  - Intelligent filtering prevents notification spam

## Cron Jobs
- **dns-monitor-job**: Runs every 1 second (`* * * * *`) - **PER-ZONE CADENCE SYNCHRONIZATION**
- **Function**: Calls Supabase Edge Function `dns-monitor` via HTTP POST
- **Authentication**: Uses service role key for Edge Function access
- **Cadence Support**: Edge function honors per-zone `check_cadence_seconds` via `next_check_at`
- **Status**: ✅ **FULLY OPERATIONAL** - Per-zone cadence synchronization with 1-second cron tick
- **Configuration**: 
  ```sql
  SELECT cron.schedule(
    'dns-monitor-job',
    '* * * * *',  -- Every 1 second (5-field cron syntax)
    $$
    SELECT net.http_post(
      url := 'https://ipdbzqiypnvkgpgnsyva.supabase.co/functions/v1/dns-monitor',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer [service_role_key]"}'::jsonb,
      body := '{}'::jsonb
    );
    $$
  );
  ```

## Client Configuration
### Browser Client (`supabase-client.ts`)
- Uses `createBrowserClient` from `@supabase/ssr`
- For client-side operations
- Uses anon key for public access

### Server Client (`supabase-server.ts`)
- Uses `createServerClient` from `@supabase/ssr`
- For server-side operations
- Handles cookies for authentication
- Async due to Next.js 15 changes

## API Integration
### Registration Endpoint (`/api/register`)
- Creates users and DNS zones
- Validates input with Zod
- Fetches initial SOA records
- Handles errors gracefully

### Cron Proxy (`/api/cron/dns-monitor`)
- Proxies requests to Edge Functions
- Handles authentication
- Supports both POST and GET for testing

## Environment Variables
### Local Development (`.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=https://ipdbzqiypnvkgpgnsyva.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Supabase Edge Function Secrets
```env
RESEND_API_KEY=your_resend_api_key
```

## Development Patterns
- Always use Supabase MCP tools for database operations
- Deploy Edge Functions immediately when created
- Use proper error handling and logging
- Implement RLS policies for all new tables
- Test with real DNS queries
- Monitor Edge Function logs for debugging

## Security Considerations
- Never expose service role key to client
- Always validate inputs
- Use RLS for data protection
- Implement proper error handling
- Monitor for abuse and rate limiting

## Troubleshooting
- Check Edge Function logs in Supabase dashboard
- Verify RLS policies are working
- Test cron job execution
- Monitor database performance
- Check DNS query responses