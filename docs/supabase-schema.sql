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

-- Schedule DNS monitoring every 1 second
-- The edge function uses next_check_at to honor per-zone cadences (1s/15s/30s/60s)
-- Free tier zones default to 60 seconds, Pro tier zones default to 30 seconds
SELECT cron.schedule(
  'dns-monitor-job',
  '1 seconds',
  'SELECT net.http_post(
    url:=''https://<your-project-ref>.supabase.co/functions/v1/dns-monitor'',
    headers:=''{"Authorization": "Bearer '' || current_setting(''app.settings.service_role_key'') || ''", "Content-Type": "application/json"}''::jsonb,
    body:=''{}''::jsonb
  );'
);

-- Aggregated health metrics for the DNS monitor job
CREATE TABLE IF NOT EXISTS dns_monitor_stats (
  job_id BIGINT NOT NULL,
  bucket_start TIMESTAMP WITH TIME ZONE NOT NULL,
  total_runs INTEGER NOT NULL,
  success_runs INTEGER NOT NULL,
  failure_runs INTEGER NOT NULL,
  avg_duration_ms NUMERIC,
  last_status TEXT,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (job_id, bucket_start)
);

ALTER TABLE dns_monitor_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manage dns monitor stats" ON dns_monitor_stats
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Function to roll up per-minute health stats and trim pg_cron history
CREATE OR REPLACE FUNCTION rollup_dns_monitor_runs(target_job_id BIGINT DEFAULT 7)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  bucket_floor timestamptz := date_trunc('minute', now() - interval '1 minute');
  bucket_ceiling timestamptz := bucket_floor + interval '1 minute';
BEGIN
  WITH runs AS (
    SELECT jobid, start_time, end_time, status, return_message
    FROM cron.job_run_details
    WHERE jobid = target_job_id
      AND start_time >= bucket_floor
      AND start_time < bucket_ceiling
  ),
  stats AS (
    SELECT
      target_job_id AS job_id,
      bucket_floor AS bucket_start,
      COUNT(*) AS total_runs,
      COUNT(*) FILTER (WHERE lower(coalesce(status, '')) = 'succeeded') AS success_runs,
      COUNT(*) FILTER (WHERE lower(coalesce(status, '')) <> 'succeeded') AS failure_runs,
      AVG(EXTRACT(EPOCH FROM (COALESCE(end_time, start_time) - start_time)) * 1000.0) AS avg_duration_ms
    FROM runs
  ),
  last_run AS (
    SELECT status, return_message
    FROM runs
    ORDER BY start_time DESC
    LIMIT 1
  )
  INSERT INTO dns_monitor_stats (
    job_id,
    bucket_start,
    total_runs,
    success_runs,
    failure_runs,
    avg_duration_ms,
    last_status,
    last_error
  )
  SELECT
    stats.job_id,
    stats.bucket_start,
    COALESCE(stats.total_runs, 0),
    COALESCE(stats.success_runs, 0),
    COALESCE(stats.failure_runs, 0),
    stats.avg_duration_ms,
    last_run.status,
    CASE WHEN last_run.status IS NULL OR lower(last_run.status) = 'succeeded'
         THEN NULL
         ELSE last_run.return_message
    END
  FROM stats
  LEFT JOIN last_run ON true
  WHERE stats.total_runs > 0
  ON CONFLICT (job_id, bucket_start) DO UPDATE
  SET total_runs = EXCLUDED.total_runs,
      success_runs = EXCLUDED.success_runs,
      failure_runs = EXCLUDED.failure_runs,
      avg_duration_ms = EXCLUDED.avg_duration_ms,
      last_status = EXCLUDED.last_status,
      last_error = EXCLUDED.last_error,
      created_at = NOW();

  DELETE FROM cron.job_run_details
  WHERE jobid = target_job_id
    AND start_time < bucket_floor - interval '5 minutes';
END;
$$;

-- Cron job that records rollups every minute
SELECT cron.schedule(
  'dns-monitor-rollup',
  '*/1 * * * *',
  $$
    SELECT rollup_dns_monitor_runs();
  $$
);

-- Cron job that drops pg_net responses so we do not retain payloads
SELECT cron.schedule(
  'purge-net-responses',
  '*/1 * * * *',
  $$
    TRUNCATE net._http_response;
  $$
);