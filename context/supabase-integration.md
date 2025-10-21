# Supabase Integration Context

## Supabase Configuration
- **Project URL**: https://ipdbzqiypnvkgpgnsyva.supabase.co
- **Anon Key**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwZGJ6cWl5cG52a2dwZ25zeXZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMDcyMzYsImV4cCI6MjA3NjU4MzIzNn0.DnoH8NEp1CWGj4qQ4ow8x_HiFp7XC_PglS8pQb3ICVU
- **Service Role Key**: Available in environment variables

## Database Schema
### Tables
- **users**: User accounts, email verification, subscription tiers
  - `email_confirmed`: Boolean for email verification status
  - `confirmation_token`: UUID for email verification
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

### Row Level Security (RLS)
- All tables have RLS enabled
- Users can only access their own data
- Proper policies implemented for data isolation

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

### dns-monitor (Legacy)
- **Status**: Replaced by Next.js API route for better cron integration
- **Purpose**: Was used for DNS monitoring but now handled by `/api/cron/dns-monitor`

## Cron Jobs
- **dns-monitor-job**: Runs every 1 minute
- **Function**: Calls Next.js API route `/api/cron/dns-monitor`
- **Configuration**: Set up in Supabase SQL Editor
- **Implementation**: Uses `call_dns_monitor()` SQL function

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