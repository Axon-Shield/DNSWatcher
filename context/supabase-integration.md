# Supabase Integration Context

## Supabase Configuration
- **Project URL**: https://ipdbzqiypnvkgpgnsyva.supabase.co
- **Anon Key**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwZGJ6cWl5cG52a2dwZ25zeXZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMDcyMzYsImV4cCI6MjA3NjU4MzIzNn0.DnoH8NEp1CWGj4qQ4ow8x_HiFp7XC_PglS8pQb3ICVU
- **Service Role Key**: Available in environment variables

## Database Schema
### Tables
- **users**: User accounts and notification preferences
- **dns_zones**: Monitored DNS zones with status
- **zone_checks**: Historical SOA record checks
- **notifications**: Sent notification logs

### Row Level Security (RLS)
- All tables have RLS enabled
- Users can only access their own data
- Proper policies implemented for data isolation

## Edge Functions
### dns-monitor
- **Purpose**: Check all active DNS zones for SOA changes
- **Schedule**: Every 5 minutes via pg_cron
- **Functionality**:
  - Query Google DNS API for SOA records
  - Compare with previous checks
  - Record changes in database
  - Trigger email notifications

### send-email
- **Purpose**: Send email notifications for DNS changes
- **Triggered by**: dns-monitor function when changes detected
- **Functionality**:
  - Get user notification preferences
  - Create notification records
  - Send emails via SMTP
  - Update delivery status

## Cron Jobs
- **dns-monitor-job**: Runs every 5 minutes
- **Function**: Calls dns-monitor Edge Function
- **Configuration**: Set up in Supabase SQL Editor

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
```env
NEXT_PUBLIC_SUPABASE_URL=https://ipdbzqiypnvkgpgnsyva.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
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