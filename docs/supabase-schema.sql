-- Supabase Database Schema for DNSWatcher
-- Run this in the Supabase SQL Editor

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

-- Enable Row Level Security (RLS)
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

-- Schedule DNS monitoring every 5 minutes
SELECT cron.schedule(
  'dns-monitor-job',
  '*/5 * * * *',
  'SELECT net.http_post(
    url:='https://ipdbzqiypnvkgpgnsyva.supabase.co/functions/v1/dns-monitor',
    headers:='{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '", "Content-Type": "application/json"}'::jsonb,
    body:='{}'::jsonb
  );'
);