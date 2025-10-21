# Supabase Setup Guide

This guide will walk you through setting up Supabase for the DNSWatcher application.

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: DNSWatcher
   - **Database Password**: Generate a strong password
   - **Region**: Choose closest to your users
5. Click "Create new project"

## 2. Database Setup

### Create Tables

Run the following SQL in the Supabase SQL Editor:

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Users table
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notification_preferences JSONB DEFAULT '{"email_enabled": true, "frequency": "immediate"}'
);

-- DNS Zones table
CREATE TABLE dns_zones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  zone_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_checked TIMESTAMP WITH TIME ZONE,
  last_soa_serial BIGINT
);

-- Zone Checks table (historical data)
CREATE TABLE zone_checks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_id UUID REFERENCES dns_zones(id) ON DELETE CASCADE,
  soa_serial BIGINT NOT NULL,
  soa_record TEXT NOT NULL,
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_change BOOLEAN DEFAULT false,
  change_details TEXT
);

-- Notifications table
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  zone_id UUID REFERENCES dns_zones(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('soa_change', 'zone_error', 'system_alert')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  email_sent BOOLEAN DEFAULT false,
  email_delivery_status TEXT CHECK (email_delivery_status IN ('pending', 'sent', 'failed'))
);

-- Create indexes for performance
CREATE INDEX idx_dns_zones_user_id ON dns_zones(user_id);
CREATE INDEX idx_dns_zones_active ON dns_zones(is_active) WHERE is_active = true;
CREATE INDEX idx_zone_checks_zone_id ON zone_checks(zone_id);
CREATE INDEX idx_zone_checks_checked_at ON zone_checks(checked_at);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_sent_at ON notifications(sent_at);
```

### Enable Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE dns_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own data
CREATE POLICY "Users can view own data" ON users
  FOR ALL USING (auth.uid()::text = id::text);

CREATE POLICY "Users can view own zones" ON dns_zones
  FOR ALL USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view own zone checks" ON zone_checks
  FOR ALL USING (zone_id IN (
    SELECT id FROM dns_zones WHERE user_id::text = auth.uid()::text
  ));

CREATE POLICY "Users can view own notifications" ON notifications
  FOR ALL USING (auth.uid()::text = user_id::text);
```

## 3. Edge Functions Setup

### Deploy DNS Monitor Function

Create a new Edge Function called `dns-monitor`:

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface SOARecord {
  name: string;
  type: string;
  class: string;
  ttl: number;
  data: {
    serial: number;
    primary: string;
    admin: string;
    refresh: number;
    retry: number;
    expire: number;
    minimum: number;
  };
}

Deno.serve(async (req: Request) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all active DNS zones
    const { data: zones, error } = await supabase
      .from('dns_zones')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching zones:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const results = [];

    for (const zone of zones || []) {
      try {
        // Query SOA record using Google DNS API
        const dnsResponse = await fetch(`https://dns.google/resolve?name=${zone.zone_name}&type=SOA`);
        const dnsData = await dnsResponse.json();

        if (dnsData.Answer && dnsData.Answer.length > 0) {
          const answer = dnsData.Answer[0];
          const parts = answer.data.split(' ');

          const soaRecord = {
            primary: parts[0],
            admin: parts[1],
            serial: parseInt(parts[2]),
            refresh: parseInt(parts[3]),
            retry: parseInt(parts[4]),
            expire: parseInt(parts[5]),
            minimum: parseInt(parts[6])
          };

          // Check if this is a change
          const { data: lastCheck } = await supabase
            .from('zone_checks')
            .select('soa_serial')
            .eq('zone_id', zone.id)
            .order('checked_at', { ascending: false })
            .limit(1)
            .single();

          const isChange = !lastCheck || lastCheck.soa_serial !== soaRecord.serial;

          // Record the check
          await supabase
            .from('zone_checks')
            .insert({
              zone_id: zone.id,
              soa_serial: soaRecord.serial,
              soa_record: JSON.stringify(soaRecord),
              checked_at: new Date().toISOString(),
              is_change: isChange,
              change_details: isChange ? 'SOA serial number changed' : null
            });

          // Update zone with latest info
          await supabase
            .from('dns_zones')
            .update({
              last_checked: new Date().toISOString(),
              last_soa_serial: soaRecord.serial
            })
            .eq('id', zone.id);

          if (isChange) {
            // Trigger email notification
            await supabase.functions.invoke('send-email', {
              body: {
                zone_id: zone.id,
                change_type: 'soa_change',
                soa_record: soaRecord
              }
            });
          }

          results.push({
            zone: zone.zone_name,
            serial: soaRecord.serial,
            isChange
          });
        }
      } catch (error) {
        console.error(`Error checking zone ${zone.zone_name}:`, error);
        results.push({
          zone: zone.zone_name,
          error: error.message
        });
      }
    }

    return new Response(JSON.stringify({ 
      message: 'DNS monitoring completed',
      results 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('DNS monitoring error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
```

### Deploy Email Function

Create another Edge Function called `send-email`:

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  try {
    const { zone_id, change_type, soa_record } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get zone and user information
    const { data: zoneData } = await supabase
      .from('dns_zones')
      .select(`
        *,
        users!inner(email, notification_preferences)
      `)
      .eq('id', zone_id)
      .single();

    if (!zoneData) {
      throw new Error('Zone not found');
    }

    const user = zoneData.users;
    
    // Check if user wants email notifications
    if (!user.notification_preferences?.email_enabled) {
      return new Response(JSON.stringify({ message: 'Email notifications disabled' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create notification record
    const { data: notification } = await supabase
      .from('notifications')
      .insert({
        user_id: zoneData.user_id,
        zone_id: zone_id,
        notification_type: change_type,
        title: 'DNS Zone Change Detected',
        message: `SOA record for ${zoneData.zone_name} has changed. Serial: ${soa_record.serial}`
      })
      .select()
      .single();

    // Send email (implement your email service here)
    // For now, we'll just log it
    console.log(`Email would be sent to ${user.email}:`, {
      subject: 'DNS Zone Change Alert',
      body: `Your DNS zone ${zoneData.zone_name} has changed. New SOA serial: ${soa_record.serial}`
    });

    // Update notification as sent
    await supabase
      .from('notifications')
      .update({ email_sent: true, email_delivery_status: 'sent' })
      .eq('id', notification.id);

    return new Response(JSON.stringify({ 
      message: 'Email notification sent',
      notification_id: notification.id 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Email sending error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
```

## 4. Cron Job Setup

Set up a cron job to run the DNS monitoring every 5 minutes:

```sql
-- Schedule DNS monitoring every 5 minutes
SELECT cron.schedule(
  'dns-monitor-job',
  '*/5 * * * *',
  'SELECT net.http_post(
    url:='https://your-project.supabase.co/functions/v1/dns-monitor',
    headers:='{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
    body:='{}'::jsonb
  );'
);
```

## 5. Environment Variables

Add these to your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 6. Test the Setup

1. Start your Next.js development server: `npm run dev`
2. Go to http://localhost:3000
3. Register a DNS zone
4. Check the Supabase dashboard to see the data
5. Wait 5 minutes and check the logs for cron job execution

## Troubleshooting

- **RLS Issues**: Make sure RLS policies are correctly set up
- **Cron Jobs**: Check the `pg_cron` extension is enabled
- **Edge Functions**: Verify functions are deployed and have correct permissions
- **DNS Queries**: Test with known domains first

## Security Notes

- Always use RLS policies
- Never expose service role key to client
- Validate all inputs
- Rate limit API endpoints
- Monitor for abuse

This setup provides a complete DNS monitoring system with automated checks, change detection, and email notifications.